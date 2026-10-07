const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type ApiScheduleBlock = {
  id: number;
  task_id: number | null;
  title: string;
  start_at: string;
  end_at: string;
  category: string;
  status: string;
  reason: string | null;
  is_recurring: boolean;
};

export type ApiTask = {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  estimated_minutes: number;
  remaining_minutes: number;
  importance: number;
  status: string;
};

export type TaskCreate = {
  title: string;
  description?: string | null;
  estimated_minutes: number;
  deadline?: string | null;
  importance?: number;
};

export type ScheduleBlockChanges = Partial<Omit<ApiScheduleBlock, "id">>;

export type ScheduleBlockCreate = Omit<ApiScheduleBlock, "id">;

async function throwIfFailed(response: Response) {
  if (response.ok) {
    return;
  }

  let message = response.status >= 500
    ? "Bibi could not save or load your data. Please try again."
    : "The request could not be completed. Please check your input and try again.";

  try {
    const body = await response.json();
    if (response.status < 500 && typeof body.detail === "string") {
      message = body.detail;
    } else if (response.status === 422 && Array.isArray(body.detail)) {
      const labels: Record<string, string> = {
        title: "Task name",
        estimated_minutes: "Estimated duration",
        deadline: "Deadline",
        description: "Context",
      };
      message = body.detail.map((issue: { loc?: string[]; msg?: string }) => {
        const field = issue.loc?.at(-1) ?? "Input";
        return `${labels[field] ?? field}: ${issue.msg ?? "Invalid value"}`;
      }).join(". ");
    }
  } catch {
    // A non-JSON error response still gets an understandable fallback.
  }

  throw new Error(message);
}

export async function getScheduleBlocks() {
  const response = await fetch(`${API_BASE_URL}/schedule-blocks`);
  await throwIfFailed(response);
  return response.json() as Promise<ApiScheduleBlock[]>;
}

export async function getTasks() {
  const response = await fetch(`${API_BASE_URL}/tasks`);
  await throwIfFailed(response);
  return response.json() as Promise<ApiTask[]>;
}

export async function createTask(task: TaskCreate) {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  }).catch(() => {
    throw new Error("Could not reach Bibi. Check that the backend is running, then try again. Your entries are still here.");
  });

  await throwIfFailed(response);
  return response.json() as Promise<ApiTask>;
}

export async function createScheduleBlock(block: ScheduleBlockCreate) {
  const response = await fetch(`${API_BASE_URL}/schedule-blocks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(block),
  });

  await throwIfFailed(response);
  return response.json() as Promise<ApiScheduleBlock>;
}

export async function updateScheduleBlock(
  blockId: number,
  changes: ScheduleBlockChanges,
) {
  const response = await fetch(`${API_BASE_URL}/schedule-blocks/${blockId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(changes),
  });

  await throwIfFailed(response);
  return response.json() as Promise<ApiScheduleBlock>;
}
