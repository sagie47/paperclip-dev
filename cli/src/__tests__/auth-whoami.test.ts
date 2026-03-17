import { afterEach, describe, expect, it, vi } from "vitest";
import { authWhoami } from "../commands/auth-whoami.js";

describe("auth whoami", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("prints JSON response from /api/auth/get-session", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          session: { id: "paperclip:session:user-1", userId: "user-1" },
          user: { id: "user-1", email: "u@example.com", name: "User One" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((value?: unknown) => {
      lines.push(String(value ?? ""));
    });

    await authWhoami({
      apiBase: "http://127.0.0.1:3100",
      apiKey: "token-123",
      json: true,
    });

    expect(spy).toHaveBeenCalled();
    const payload = JSON.parse(lines.join("\n")) as { actor: { user: { id: string } } };
    expect(payload.actor.user.id).toBe("user-1");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3100/api/auth/get-session",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ authorization: "Bearer token-123" }),
      }),
    );
  });
});
