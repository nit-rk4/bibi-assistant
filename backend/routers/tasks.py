from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from database import get_session
from models import ScheduleBlock, Task, TaskCreate, TaskUpdate


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


@router.get("", response_model=list[Task])
def get_tasks(
    session: Session = Depends(get_session),
):
    return session.exec(select(Task)).all()


@router.post(
    "",
    response_model=Task,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    task_data: TaskCreate,
    session: Session = Depends(get_session),
):
    task = Task(
        **task_data.model_dump(),
        remaining_minutes=task_data.estimated_minutes,
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


@router.patch("/{task_id}", response_model=Task)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    changes = task_data.model_dump(exclude_unset=True)

    new_minimum = changes.get(
        "minimum_session_minutes",
        task.minimum_session_minutes,
    )
    new_maximum = changes.get(
        "maximum_session_minutes",
        task.maximum_session_minutes,
    )

    if new_minimum > new_maximum:
        raise HTTPException(
            status_code=400,
            detail=(
                "Minimum session length cannot be greater "
                "than maximum session length."
            ),
        )

    task.sqlmodel_update(changes)

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task(
    task_id: int,
    session: Session = Depends(get_session),
):
    task = session.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    linked_block = session.exec(
        select(ScheduleBlock).where(
            ScheduleBlock.task_id == task_id
        )
    ).first()

    if linked_block is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "This task still has schedule blocks. "
                "Delete those blocks first."
            ),
        )

    session.delete(task)
    session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)