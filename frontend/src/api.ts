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

export type ScheduleBlockChanges = Partial<Omit<ApiScheduleBlock, "id">>;

export type ScheduleBlockCreate = Omit<ApiScheduleBlock, "id">;

async function throwIfFailed(response: Response) {
  if (response.ok) {
    return;
  }

  const message = await response.text();

  throw new Error(
    message || `Backend request failed with status ${response.status}`,
  );
}

export async function getScheduleBlocks() {
  const response = await fetch(`${API_BASE_URL}/schedule-blocks`);
  await throwIfFailed(response);
  return response.json() as Promise<ApiScheduleBlock[]>;
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
