import pc from "picocolors";
import { readContext, resolveContextPath, resolveProfile, setCurrentProfile, upsertProfile } from "../client/context.js";

interface AuthLoginOptions {
  context?: string;
  profile?: string;
  token?: string;
  apiBase?: string;
  companyId?: string;
  use?: boolean;
  json?: boolean;
}

export function authLogin(options: AuthLoginOptions): void {
  const store = readContext(options.context);
  const targetProfile = options.profile?.trim() || store.currentProfile || "default";
  const token =
    options.token?.trim() ||
    process.env.PAPERCLIP_OPERATOR_TOKEN?.trim() ||
    process.env.PAPERCLIP_API_KEY?.trim();

  if (!token) {
    throw new Error("Operator token is required. Pass --token or set PAPERCLIP_OPERATOR_TOKEN.");
  }

  upsertProfile(
    targetProfile,
    {
      apiBase: options.apiBase,
      companyId: options.companyId,
      apiKey: token,
    },
    options.context,
  );

  if (options.use) {
    setCurrentProfile(targetProfile, options.context);
  }

  const updated = readContext(options.context);
  const resolved = resolveProfile(updated, targetProfile);
  const payload = {
    contextPath: resolveContextPath(options.context),
    currentProfile: updated.currentProfile,
    profileName: resolved.name,
    profile: {
      ...resolved.profile,
      apiKey: resolved.profile.apiKey ? `${resolved.profile.apiKey.slice(0, 4)}…` : undefined,
    },
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(pc.green(`Stored operator bearer token for profile '${targetProfile}'.`));
  if (options.use) {
    console.log(pc.green(`Set '${targetProfile}' as active profile.`));
  }
  console.log(pc.dim(`Context: ${payload.contextPath}`));
}
