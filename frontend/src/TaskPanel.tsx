import { useEffect, useState, type FormEvent } from "react";
import { createTask, getTasks, type ApiTask } from "./api";

export default function TaskPanel() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [deadline, setDeadline] = useState("");
  const [importance, setImportance] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTasks()
      .then(setTasks)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load tasks."),
      );
  }, []);

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Enter a task name.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = await createTask({
        title: title.trim(),
        estimated_minutes: Number(minutes),
        deadline: deadline || null,
        importance,
      });

      setTasks((current) => [...current, saved]);
      setTitle("");
      setDeadline("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="task-panel">
      <h2>My tasks</h2>

      <form onSubmit={addTask}>
        <label>
          Task
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          Estimated minutes
          <input
            required
            type="number"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>

        <label>
          Deadline (optional)
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </label>

        <label>
          Importance
          <select
            value={importance}
            onChange={(e) => setImportance(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add task"}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.title} · {task.estimated_minutes} min
          </li>
        ))}
      </ul>
    </section>
  );
}