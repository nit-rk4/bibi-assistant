from datetime import datetime
from sqlmodel import SQLModel, Field


class TaskBase(SQLModel):        
    title: str
    description: str | None = None
    deadline: datetime | None = None
    
    estimated_minutes: int = Field(gt=0)
    
    importance: int = Field(default=3, ge=1, le=5)
    difficulty: int = Field(default=3, ge=1, le=5)
    
    task_type: str = "general"
    can_be_split: bool = True
    minimum_session_minutes: int = Field(default=30, gt=0)
    maximum_session_minutes: int = Field(default=120, gt=0)
    
    recurrence: str | None = None


class Task(TaskBase, table=True):
    __tablename__ = "tasks"
    
    id: int | None = Field(default=None, primary_key=True)
    remaining_minutes: int = Field(ge=0)
    status: str = "active"
    
    
class TaskCreate(TaskBase):
    pass


class ScheduleBlockBase(SQLModel):
    title: str
    start_at: datetime
    end_at: datetime
    
    category: str = "task"
    status: str = "confirmed"
    reason: str | None = None
    is_recurring: bool = False


class ScheduleBlock(ScheduleBlockBase, table=True):
    __tablename__ = "schedule_blocks"
    
    id: int | None = Field(default=None, primary_key=True)
    
    task_id: int | None = Field(
        default=None,
        foreign_key="tasks.id",
    )


class ScheduleBlockCreate(ScheduleBlockBase):
    task_id: int | None = None
