import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readContext } from "../client/context.js";
import { authLogin } from "../commands/auth-login.js";

const ORIGINAL_ENV = { ...process.env };

function createTempPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-cli-auth-login-"));
  return path.join(dir, name);
}

describe("auth login", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PAPERCLIP_OPERATOR_TOKEN;
    delete process.env.PAPERCLIP_API_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("stores token in selected context profile", () => {
    const contextPath = createTempPath("context.json");
    authLogin({
      context: contextPath,
      profile: "ssh",
      token: "operator-token-123",
      apiBase: "http://127.0.0.1:3100",
      use: true,
    });

    const context = readContext(contextPath);
    expect(context.currentProfile).toBe("ssh");
    expect(context.profiles.ssh?.apiBase).toBe("http://127.0.0.1:3100");
    expect(context.profiles.ssh?.apiKey).toBe("operator-token-123");
  });

  it("falls back to PAPERCLIP_OPERATOR_TOKEN", () => {
    const contextPath = createTempPath("context.json");
    process.env.PAPERCLIP_OPERATOR_TOKEN = "from-env-token";
    authLogin({ context: contextPath, profile: "default" });

    const context = readContext(contextPath);
    expect(context.profiles.default?.apiKey).toBe("from-env-token");
  });
});
