import { Command } from "commander";
import {
  createCompanyInviteSchema,
  listJoinRequestsQuerySchema,
  type Invite,
  type JoinRequest,
} from "@paperclipai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface InviteCreateOptions extends BaseClientOptions {
  companyId?: string;
  allowedJoinTypes?: "human" | "agent" | "both";
  agentMessage?: string;
  defaultsPayload?: string;
}

interface JoinRequestListOptions extends BaseClientOptions {
  companyId?: string;
  status?: string;
  requestType?: string;
}

interface JoinDecisionOptions extends BaseClientOptions {
  companyId?: string;
}

export function registerAccessCommands(program: Command): void {
  const access = program.command("access").description("Invite and join-request operations");

  addCommonClientOptions(
    access
      .command("invite")
      .description("Create a company invite")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .option("--allowed-join-types <kind>", "human | agent | both", "both")
      .option("--agent-message <text>", "Optional agent onboarding message")
      .option("--defaults-payload <json>", "Invite defaults payload as JSON object")
      .action(async (opts: InviteCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = createCompanyInviteSchema.parse({
            allowedJoinTypes: opts.allowedJoinTypes,
            agentMessage: opts.agentMessage,
            defaultsPayload: opts.defaultsPayload ? parseJsonObject(opts.defaultsPayload, "defaultsPayload") : null,
          });
          const created = await ctx.api.post<Invite>(`/api/companies/${ctx.companyId}/invites`, payload);
          printOutput(created, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    access
      .command("revoke-invite")
      .description("Revoke a company invite by invite ID")
      .argument("<inviteId>", "Invite ID")
      .action(async (inviteId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const revoked = await ctx.api.post(`/api/invites/${inviteId}/revoke`, {});
          printOutput(revoked, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    access
      .command("join-requests")
      .description("List company join requests")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .option("--status <status>", "pending_approval | approved | rejected")
      .option("--request-type <kind>", "human | agent")
      .action(async (opts: JoinRequestListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const query = listJoinRequestsQuerySchema.parse({
            status: opts.status,
            requestType: opts.requestType,
          });
          const params = new URLSearchParams();
          if (query.status) params.set("status", query.status);
          if (query.requestType) params.set("requestType", query.requestType);
          const rows =
            (await ctx.api.get<JoinRequest[]>(
              `/api/companies/${ctx.companyId}/join-requests${params.size ? `?${params.toString()}` : ""}`,
            )) ?? [];

          if (ctx.json) {
            printOutput(rows, { json: true });
            return;
          }

          if (rows.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const row of rows) {
            console.log(
              formatInlineRecord({
                id: row.id,
                status: row.status,
                requestType: row.requestType,
                inviteId: row.inviteId,
                createdAgentId: row.createdAgentId,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    access
      .command("approve-join")
      .description("Approve a join request")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .argument("<requestId>", "Join request ID")
      .action(async (requestId: string, opts: JoinDecisionOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const approved = await ctx.api.post<JoinRequest>(
            `/api/companies/${ctx.companyId}/join-requests/${requestId}/approve`,
            {},
          );
          printOutput(approved, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    access
      .command("reject-join")
      .description("Reject a join request")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .argument("<requestId>", "Join request ID")
      .action(async (requestId: string, opts: JoinDecisionOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rejected = await ctx.api.post<JoinRequest>(
            `/api/companies/${ctx.companyId}/join-requests/${requestId}/reject`,
            {},
          );
          printOutput(rejected, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );
}

function parseJsonObject(value: string, name: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${name} must be a JSON object`);
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Invalid ${name} JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}
