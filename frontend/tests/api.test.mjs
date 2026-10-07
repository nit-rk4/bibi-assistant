import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import { createServer } from "vite";

let server;
let api;

before(async () => {
  // Load the real TypeScript API module with Vite's import.meta.env support.
  server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  api = await server.ssrLoadModule("/src/api.ts");
});

after(async () => { await server?.close(); });

test("task creation sends context and deadline without scheduling work", async () => {
  const task = {
    title: "Prepare presentation",
    estimated_minutes: 75,
    deadline: "2026-10-12T14:30",
    description: "Explain the project clearly.",
  };
  const saved = { id: 7, ...task, importance: 3, remaining_minutes: 75, status: "active" };
  const fetchMock = mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/tasks"));
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), task);
    return Response.json(saved, { status: 201 });
  });
  try {
    assert.deepEqual(await api.createTask(task), saved);
    assert.equal(fetchMock.mock.callCount(), 1);
  } finally {
    fetchMock.mock.restore();
  }
});

test("validation errors identify the field without exposing raw JSON", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({
    detail: [{ loc: ["body", "estimated_minutes"], msg: "Input should be greater than 0" }],
  }, { status: 422 }));
  try {
    await assert.rejects(api.createTask({ title: "Task", estimated_minutes: 0 }), {
      message: "Estimated duration: Input should be greater than 0",
    });
  } finally {
    fetchMock.mock.restore();
  }
});

test("server failures use a readable retry message", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () =>
    new Response("Internal Server Error", { status: 500 }),
  );
  try {
    await assert.rejects(api.createTask({ title: "Task", estimated_minutes: 60 }), {
      message: "Bibi could not save or load your data. Please try again.",
    });
  } finally {
    fetchMock.mock.restore();
  }
});

test("connection failures explain how to retry", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  try {
    await assert.rejects(api.createTask({ title: "Task", estimated_minutes: 60 }), {
      message: "Could not reach Bibi. Check that the backend is running, then try again. Your entries are still here.",
    });
  } finally {
    fetchMock.mock.restore();
  }
});
