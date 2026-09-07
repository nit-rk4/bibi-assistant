from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from database import get_session
from models import (
    ScheduleBlock,
    ScheduleBlockCreate,
    ScheduleBlockUpdate,
    Task,
)


router = APIRouter(
    prefix="/schedule-blocks",
    tags=["Schedule Blocks"],
)


@router.get("", response_model=list[ScheduleBlock])
def get_schedule_blocks(
    session: Session = Depends(get_session),
):
    statement = select(ScheduleBlock).order_by(
        ScheduleBlock.start_at
    )

    return session.exec(statement).all()


@router.post(
    "",
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
                detail="The connected task does not exist.",
            )

    block = ScheduleBlock(**block_data.model_dump())

    session.add(block)
    session.commit()
    session.refresh(block)

    return block


@router.patch(
    "/{block_id}",
    response_model=ScheduleBlock,
)
def update_schedule_block(
    block_id: int,
    block_data: ScheduleBlockUpdate,
    session: Session = Depends(get_session),
):
    block = session.get(ScheduleBlock, block_id)

    if block is None:
        raise HTTPException(
            status_code=404,
            detail="Schedule block not found.",
        )

    changes = block_data.model_dump(exclude_unset=True)

    new_start = changes.get("start_at", block.start_at)
    new_end = changes.get("end_at", block.end_at)

    if new_end <= new_start:
        raise HTTPException(
            status_code=400,
            detail="The end time must be later than the start time.",
        )

    block.sqlmodel_update(changes)

    session.add(block)
    session.commit()
    session.refresh(block)

    return block


@router.delete(
    "/{block_id}",
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