"""Run with: python -m unittest discover -s tests -v (from backend/)."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from database import get_session
from main import app


class TaskEntryTests(unittest.TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        database_file = Path(directory.name) / "test.db"
        self.engine = create_engine(
            f"sqlite:///{database_file.as_posix()}",
            connect_args={"check_same_thread": False},
        )
        self.addCleanup(self.engine.dispose)

        def test_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = test_session
        self.addCleanup(app.dependency_overrides.pop, get_session)
        # Replace startup database creation too, so tests never touch bibi.db.
        self.enterContext(patch(
            "main.create_db_and_tables",
            lambda: SQLModel.metadata.create_all(self.engine),
        ))
        self.client = self.enterContext(TestClient(app))

    def test_task_details_persist_without_creating_a_session(self):
        response = self.client.post("/tasks", json={
            "title": "  Prepare presentation  ",
            "estimated_minutes": 75,
            "deadline": "2026-10-12T14:30:00",
            "description": "Explain the project clearly.\nThis matters to my team.",
        })
        self.assertEqual(response.status_code, 201)
        saved = response.json()
        self.assertIs(saved["can_be_split"], True)
        self.assertEqual(saved["title"], "Prepare presentation")
        self.assertEqual(saved["estimated_minutes"], 75)
        self.assertEqual(saved["remaining_minutes"], 75)
        self.assertEqual(saved["deadline"], "2026-10-12T14:30:00")
        self.assertEqual(saved["description"], "Explain the project clearly.\nThis matters to my team.")
        self.assertEqual(saved["importance"], 3)
        self.assertEqual(saved["status"], "active")

        # Reopen SQLite connections and fetch again, as a refreshed UI would.
        self.engine.dispose()
        self.assertEqual(self.client.get("/tasks").json(), [saved])
        self.assertEqual(self.client.get("/schedule-blocks").json(), [])

    def test_optional_fields_can_be_omitted_or_null(self):
        for fields in ({}, {"deadline": None, "description": None}):
            with self.subTest(fields=fields):
                response = self.client.post("/tasks", json={
                    "title": "Read a chapter", "estimated_minutes": 20, **fields,
                })
                self.assertEqual(response.status_code, 201)
                self.assertIsNone(response.json()["deadline"])
                self.assertIsNone(response.json()["description"])

    def test_legacy_importance_remains_supported(self):
        response = self.client.post("/tasks", json={
            "title": "Legacy task", "estimated_minutes": 30, "importance": 5,
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["importance"], 5)

    def test_invalid_input_is_rejected_without_saving(self):
        invalid_fields = [
            {"title": ""}, {"title": " \n "}, {"title": None},
            {"estimated_minutes": 0}, {"estimated_minutes": -5},
            {"estimated_minutes": 1.5}, {"estimated_minutes": "abc"},
            {"deadline": "not a date"}, {"deadline": "2026-02-30T10:00"},
        ]
        for fields in invalid_fields:
            with self.subTest(fields=fields):
                response = self.client.post("/tasks", json={
                    "title": "Valid name", "estimated_minutes": 60, **fields,
                })
                self.assertEqual(response.status_code, 422)
                self.assertTrue(response.json()["detail"])
        self.assertEqual(self.client.get("/tasks").json(), [])
        self.assertEqual(self.client.get("/schedule-blocks").json(), [])

    def test_splitting_choices_persist_without_creating_sessions(self):
        saved_tasks = []

        for can_be_split in (True, False):
            with self.subTest(can_be_split=can_be_split):
                response = self.client.post("/tasks", json={
                    "title": f"Splitting choice {can_be_split}",
                    "estimated_minutes": 45,
                    "can_be_split": can_be_split,
                })
                self.assertEqual(response.status_code, 201)

                saved = response.json()
                self.assertIs(saved["can_be_split"], can_be_split)
                self.assertEqual(saved["remaining_minutes"], 45)
                saved_tasks.append(saved)

        self.engine.dispose()

        response = self.client.get("/tasks")
        self.assertEqual(response.status_code, 200)
        fetched_by_id = {
            task["id"]: task for task in response.json()
        }

        self.assertEqual(len(fetched_by_id), len(saved_tasks))

        for saved in saved_tasks:
            with self.subTest(task_id=saved["id"]):
                fetched = fetched_by_id[saved["id"]]
                self.assertEqual(fetched, saved)
                self.assertIs(
                    fetched["can_be_split"],
                    saved["can_be_split"],
                )

        self.assertEqual(
            self.client.get("/schedule-blocks").json(),
            [],
        )
if __name__ == "__main__":
    unittest.main()
