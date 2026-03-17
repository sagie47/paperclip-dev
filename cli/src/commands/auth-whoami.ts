import pc from "picocolors";
import { resolveCommandContext } from "./client/common.js";

interface AuthWhoamiOptions {
  context?: string;
  profile?: string;
  apiBase?: string;
  apiKey?: string;
  json?: boolean;
}

interface SessionResponse {
  session: { id: string; userId: string };
  user: { id: string; email: string | null; name: string | null };
}

export async function authWhoami(options: AuthWhoamiOptions): Promise<void> {
  const ctx = resolveCommandContext(options);
  const response = await ctx.api.get<SessionResponse>("/api/auth/get-session");

  if (ctx.json) {
    console.log(
      JSON.stringify(
        {
          profile: ctx.profileName,
          apiBase: ctx.api.apiBase,
          actor: response,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!response?.user?.id) {
    throw new Error("Not authenticated. Run `paperclipai auth login --token <token>` first.");
  }

  console.log(pc.green("Authenticated board user"));
  console.log(`profile=${ctx.profileName}`);
  console.log(`apiBase=${ctx.api.apiBase}`);
  console.log(`userId=${response.user.id}`);
  console.log(`sessionId=${response.session.id}`);
  if (response.user.name) {
    console.log(`name=${response.user.name}`);
  }
  if (response.user.email) {
    console.log(`email=${response.user.email}`);
  }
}
