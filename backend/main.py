from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, status, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import create_db_and_tables, get_session
from models import Task, TaskCreate, ScheduleBlock, ScheduleBlockCreate

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="Chip API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def check_health():
    return{"status": "online",}




@app.post(
    "/tasks",
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

@app.get("/tasks", response_model=list[Task])
def get_tasks(
    session: Session = Depends(get_session),
):
    tasks = session.exec(select(Task)).all()
    return tasks

@app.delete(
    "/tasks/{task_id}",
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



@app.post(
    "/schedule-blocks",
    response_model=ScheduleBlock,
    status_code=status.HTTP_201_CREATED,
)
def create_schedule_block(
    block_data: ScheduleBlockCreate,
    session: Session = Depends(get_session),
):
    if block_data.end_at <= block_data.start_at:
        raise HTTPException(
            status_code=400,
            detail="The end time must be later than the start time.",
        )
    if block_data.task_id is not None:
        task = session.get(Task, block_data.task_id)
        if task is None:
            raise HTTPException(
                status_code=404,
                detail=f"The connected task does not exist.",
            )
    
    block =ScheduleBlock(**block_data.model_dump())
    
    session.add(block)
    session.commit()
    session.refresh(block)
    
    return block

@app.get(
    "/schedule-blocks",
    response_model=list[ScheduleBlock],
)
def get_schedule_blocks(
    session: Session = Depends(get_session),
):
    statement = select(ScheduleBlock).order_by(
        ScheduleBlock.start_at
    )
    
    blocks = session.exec(statement).all()
    return blocks

@app.delete(
    "/schedule-blocks/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_schedule_block(
    block_id: int,
    session: Session = Depends(get_session),
):
    block = session.get(ScheduleBlock, block_id)

    if block is None:
        raise HTTPException(
            status_code=404,
            detail="Schedule block not found.",
        )

    session.delete(block)
    session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)