import { Command } from "commander";
import { updateBudgetSchema } from "@paperclipai/shared";
import {
  addCommonClientOptions,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface CompanyScopedOptions extends BaseClientOptions {
  companyId?: string;
}

interface BudgetUpdateOptions extends BaseClientOptions {
  companyId?: string;
  budgetMonthlyCents?: string;
}

interface AgentBudgetUpdateOptions extends BaseClientOptions {
  budgetMonthlyCents?: string;
}

export function registerCostCommands(program: Command): void {
  const cost = program.command("cost").description("Cost and budget operations");

  addCommonClientOptions(
    cost
      .command("summary")
      .description("Get company cost summary")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: CompanyScopedOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const summary = await ctx.api.get(`/api/companies/${ctx.companyId}/costs/summary`);
          printOutput(summary, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    cost
      .command("by-agent")
      .description("Get company costs grouped by agent")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: CompanyScopedOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows = await ctx.api.get(`/api/companies/${ctx.companyId}/costs/by-agent`);
          printOutput(rows, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    cost
      .command("by-project")
      .description("Get company costs grouped by project")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: CompanyScopedOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows = await ctx.api.get(`/api/companies/${ctx.companyId}/costs/by-project`);
          printOutput(rows, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    cost
      .command("budgets")
      .description("Get company budget overview")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: CompanyScopedOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const overview = await ctx.api.get(`/api/companies/${ctx.companyId}/budgets/overview`);
          printOutput(overview, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    cost
      .command("set-company-budget")
      .description("Set monthly company budget")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--budget-monthly-cents <cents>", "Budget in cents")
      .action(async (opts: BudgetUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = updateBudgetSchema.parse({
            budgetMonthlyCents: parseBudget(opts.budgetMonthlyCents),
          });
          const updated = await ctx.api.patch(`/api/companies/${ctx.companyId}/budgets`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    cost
      .command("set-agent-budget")
      .description("Set monthly agent budget")
      .argument("<agentId>", "Agent ID")
      .requiredOption("--budget-monthly-cents <cents>", "Budget in cents")
      .action(async (agentId: string, opts: AgentBudgetUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateBudgetSchema.parse({
            budgetMonthlyCents: parseBudget(opts.budgetMonthlyCents),
          });
          const updated = await ctx.api.patch(`/api/agents/${agentId}/budgets`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );
}

function parseBudget(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid --budget-monthly-cents value: ${value ?? ""}`);
  }
  return Math.trunc(parsed);
}
