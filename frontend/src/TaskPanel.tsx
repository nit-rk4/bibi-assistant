import { useEffect, useRef, useState, type FormEvent } from "react";
import { createTask, getScheduleBlocks, getTasks, type ApiTask } from "./api";

export default function TaskPanel() {
  const drawer = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const taskList = useRef<HTMLElement>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("60");
  const [canBeSplit, setCanBeSplit] = useState(true);
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let ignore = false;
    Promise.all([getTasks(), getScheduleBlocks()])
      .then(([savedTasks, blocks]) => {
        if (ignore) return;
        const scheduledIds = new Set(
          blocks
            .filter((block) => block.status === "confirmed" || block.status === "proposed")
            .map((block) => block.task_id),
        );
        setTasks(savedTasks.filter((task) =>
          task.status === "active" && !scheduledIds.has(task.id),
        ));
        setLoadError(null);
      })
      .catch(() => {
        if (!ignore) {
          setLoadError("Could not load unscheduled tasks. Check that the backend is running and try again.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  function refreshTasks() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  function openDrawer(showList: boolean) {
    refreshTasks();
    drawer.current?.showModal();
    if (showList) taskList.current?.focus();
    else nameInput.current?.focus();
  }

  function closeDrawer() {
    if (!saving) drawer.current?.close();
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading) return;
    setNotice("");
    if (!title.trim()) {
      setError("Enter a task name.");
      nameInput.current?.focus();
      return;
    }
    const duration = Number(minutes);
    if (!Number.isSafeInteger(duration) || duration <= 0) {
      setError("Enter an estimated duration in whole minutes greater than zero.");
      return;
    }
    const deadlineInput = event.currentTarget.querySelector<HTMLInputElement>(
      "#task-deadline",
    );
    if (
      deadlineInput?.validity.badInput ||
      (deadline && !Number.isFinite(new Date(deadline).getTime()))
    ) {
      setError("Enter a valid deadline, or leave it blank.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await createTask({
        title: title.trim(),
        estimated_minutes: duration,
        can_be_split: canBeSplit,
        deadline: deadline || null,
        description: description.trim() || null,
      });
      setTasks((current) => [saved, ...current]);
      setTitle("");
      setMinutes("60");
      setCanBeSplit(true);
      setDeadline("");
      setDescription("");
      setNotice(`“${saved.title}” saved as unscheduled work.`);
      taskList.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the task. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="task-panel">
      <button className="today-button" type="button" onClick={() => openDrawer(true)}>
        Unscheduled tasks{!loading && !loadError ? ` (${tasks.length})` : ""}
      </button>
      <button className="add-task-button" type="button" onClick={() => openDrawer(false)}>
        + Add Task
      </button>

      <dialog
        ref={drawer}
        className="task-drawer"
        aria-labelledby="task-drawer-title"
        onCancel={(event) => {
          if (saving) event.preventDefault();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDrawer();
        }}
      >
        <div className="task-drawer-content">
          <header className="task-drawer-header">
            <div>
              <span className="section-kicker">WORK TO PLAN</span>
              <h2 id="task-drawer-title">Your tasks</h2>
            </div>
            <button
              type="button"
              className="drawer-close"
              aria-label="Close task drawer"
              disabled={saving}
              onClick={closeDrawer}
            >
              ×
            </button>
          </header>

          <form className="task-form" onSubmit={addTask} noValidate>
            <h3>Add a task</h3>
            <p className="task-help">Save what needs doing. Bibi can plan a work session later.</p>
            <fieldset disabled={saving}>
              <label htmlFor="task-name">Task name</label>
              <input
                ref={nameInput}
                id="task-name"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />

              <label htmlFor="task-duration">Estimated duration (minutes)</label>
              <input
                id="task-duration"
                required
                type="number"
                min="1"
                step="1"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />

              <fieldset className = "task-splitting">
                <legend>Work sessions</legend>
                
                <label className="task-splitting-option">
                  <input
                    type="radio"
                    name="task-splitting"
                    value="one-session"
                    checked={!canBeSplit}
                    onChange={() => setCanBeSplit(false)}
                  />
                  One session only
                </label>

                <label className="task-splitting-option">
                  <input
                    type="radio"
                    name="task-splitting"
                    value="split-sessions"
                    checked={canBeSplit}
                    onChange={() => setCanBeSplit(true)}
                  />
                  Can be spread across sessions
                </label>
              </fieldset>

              <label htmlFor="task-deadline">Deadline <span>(optional)</span></label>
              <input
                id="task-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />

              <label htmlFor="task-context">Why does this matter? <span>(optional)</span></label>
              <textarea
                id="task-context"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add any context you want to keep with this task."
              />
            </fieldset>
            {error && <p className="task-error" role="alert">{error}</p>}
            <div className="task-form-actions">
              <button className="today-button" type="button" disabled={saving} onClick={closeDrawer}>Close</button>
              <button className="add-task-button" type="submit" disabled={saving || loading}>
                {saving ? "Saving..." : "Save task"}
              </button>
            </div>
            <p className="task-notice" role="status">{notice}</p>
          </form>

          <section
            ref={taskList}
            tabIndex={-1}
            className="unscheduled-tasks"
            aria-labelledby="unscheduled-title"
            aria-busy={loading}
          >
            <h3 id="unscheduled-title">Unscheduled tasks</h3>
            <p className="task-help">Work saved for later, across all weeks.</p>
            {loading ? <p>Loading tasks...</p> : loadError ? (
              <div>
                <p className="task-error" role="alert">{loadError}</p>
                <button className="today-button" type="button" disabled={saving} onClick={refreshTasks}>Try again</button>
              </div>
            ) : tasks.length === 0 ? <p className="task-help">No unscheduled tasks yet.</p> : null}
            {!loading && (
              <ul className="task-list">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <h4>{task.title}</h4>
                    <span className="task-duration">{task.estimated_minutes} min</span>
                    <p>
                      {task.deadline ? (
                        <>
                          Deadline: {" "}
                          <time dateTime={task.deadline}>
                            {new Date(task.deadline).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </time>
                        </>
                      ) : "No deadline"}
                    </p>
                    {task.description && <p className="task-context">{task.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </dialog>
    </div>
  );
}
