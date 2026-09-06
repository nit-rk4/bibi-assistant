from pathlib import Path
from sqlmodel import Session, SQLModel, create_engine
import models

DATABASE_FILE = Path(__file__).resolve().parent / "chip.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE.as_posix()}"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session