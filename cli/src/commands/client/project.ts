import { Command } from "commander";
import { createProjectSchema, updateProjectSchema, type Project } from "@paperclipai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface ProjectListOptions extends BaseClientOptions {
  companyId?: string;
}

interface ProjectCreateOptions extends BaseClientOptions {
  companyId?: string;
  name: string;
  description?: string;
  goalId?: string;
  goalIds?: string;
  status?: string;
  leadAgentId?: string;
}

interface ProjectUpdateOptions extends BaseClientOptions {
  name?: string;
  description?: string;
  goalId?: string;
  goalIds?: string;
  status?: string;
  leadAgentId?: string;
}

export function registerProjectCommands(program: Command): void {
  const project = program.command("project").description("Project operations");

  addCommonClientOptions(
    project
      .command("list")
      .description("List projects for a company")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: ProjectListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows = (await ctx.api.get<Project[]>(`/api/companies/${ctx.companyId}/projects`)) ?? [];

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
                name: row.name,
                status: row.status,
                leadAgentId: row.leadAgentId,
                goalIds: row.goalIds?.join(",") ?? row.goalId,
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
    project
      .command("get")
      .description("Get one project")
      .argument("<projectId>", "Project ID")
      .action(async (projectId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Project>(`/api/projects/${projectId}`);
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    project
      .command("create")
      .description("Create a project")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--name <name>", "Project name")
      .option("--description <text>", "Project description")
      .option("--status <status>", "Project status")
      .option("--goal-id <id>", "Legacy single goal ID")
      .option("--goal-ids <csv>", "Comma-separated goal IDs")
      .option("--lead-agent-id <id>", "Lead agent ID")
      .action(async (opts: ProjectCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = createProjectSchema.parse({
            name: opts.name,
            description: opts.description,
            status: opts.status,
            goalId: opts.goalId,
            goalIds: parseCsv(opts.goalIds),
            leadAgentId: opts.leadAgentId,
          });
          const created = await ctx.api.post<Project>(`/api/companies/${ctx.companyId}/projects`, payload);
          printOutput(created, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    project
      .command("update")
      .description("Update a project")
      .argument("<projectId>", "Project ID")
      .option("--name <name>", "Project name")
      .option("--description <text>", "Project description")
      .option("--status <status>", "Project status")
      .option("--goal-id <id>", "Legacy single goal ID")
      .option("--goal-ids <csv>", "Comma-separated goal IDs")
      .option("--lead-agent-id <id>", "Lead agent ID")
      .action(async (projectId: string, opts: ProjectUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateProjectSchema.parse({
            name: opts.name,
            description: opts.description,
            status: opts.status,
            goalId: opts.goalId,
            goalIds: parseCsv(opts.goalIds),
            leadAgentId: opts.leadAgentId,
          });
          const updated = await ctx.api.patch<Project>(`/api/projects/${projectId}`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    project
      .command("delete")
      .description("Delete a project")
      .argument("<projectId>", "Project ID")
      .action(async (projectId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          await ctx.api.delete(`/api/projects/${projectId}`);
          printOutput({ ok: true, id: projectId }, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );
}

function parseCsv(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const rows = value.split(",").map((v) => v.trim()).filter(Boolean);
  return rows.length > 0 ? rows : undefined;
}
