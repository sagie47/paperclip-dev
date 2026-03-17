import { Command } from "commander";
import {
  createSecretSchema,
  rotateSecretSchema,
  updateSecretSchema,
  type CompanySecret,
  type SecretProvider,
} from "@paperclipai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface SecretListOptions extends BaseClientOptions {
  companyId?: string;
}

interface SecretCreateOptions extends BaseClientOptions {
  companyId?: string;
  name: string;
  value: string;
  provider?: SecretProvider;
  description?: string;
  externalRef?: string;
}

interface SecretUpdateOptions extends BaseClientOptions {
  name?: string;
  description?: string;
  externalRef?: string;
}

interface SecretRotateOptions extends BaseClientOptions {
  value: string;
  externalRef?: string;
}

export function registerSecretCommands(program: Command): void {
  const secret = program.command("secret").description("Secret operations");

  addCommonClientOptions(
    secret
      .command("providers")
      .description("List supported secret providers for a company")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: SecretListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const providers = await ctx.api.get(`/api/companies/${ctx.companyId}/secret-providers`);
          printOutput(providers, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    secret
      .command("list")
      .description("List secrets for a company")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: SecretListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows = (await ctx.api.get<CompanySecret[]>(`/api/companies/${ctx.companyId}/secrets`)) ?? [];

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
                provider: row.provider,
                version: row.latestVersion,
                updatedAt: row.updatedAt,
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
    secret
      .command("create")
      .description("Create a secret")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--name <name>", "Secret name")
      .requiredOption("--value <value>", "Secret value")
      .option("--provider <provider>", "Secret provider")
      .option("--description <text>", "Secret description")
      .option("--external-ref <value>", "External provider reference")
      .action(async (opts: SecretCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = createSecretSchema.parse({
            name: opts.name,
            value: opts.value,
            provider: opts.provider,
            description: opts.description,
            externalRef: opts.externalRef,
          });
          const created = await ctx.api.post<CompanySecret>(`/api/companies/${ctx.companyId}/secrets`, payload);
          printOutput(created, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    secret
      .command("update")
      .description("Update secret metadata")
      .argument("<secretId>", "Secret ID")
      .option("--name <name>", "Secret name")
      .option("--description <text>", "Secret description")
      .option("--external-ref <value>", "External provider reference")
      .action(async (secretId: string, opts: SecretUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateSecretSchema.parse({
            name: opts.name,
            description: opts.description,
            externalRef: opts.externalRef,
          });
          const updated = await ctx.api.patch<CompanySecret>(`/api/secrets/${secretId}`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    secret
      .command("rotate")
      .description("Rotate a secret value")
      .argument("<secretId>", "Secret ID")
      .requiredOption("--value <value>", "New secret value")
      .option("--external-ref <value>", "External provider reference")
      .action(async (secretId: string, opts: SecretRotateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = rotateSecretSchema.parse({
            value: opts.value,
            externalRef: opts.externalRef,
          });
          const updated = await ctx.api.post<CompanySecret>(`/api/secrets/${secretId}/rotate`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    secret
      .command("delete")
      .description("Delete a secret")
      .argument("<secretId>", "Secret ID")
      .action(async (secretId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          await ctx.api.delete(`/api/secrets/${secretId}`);
          printOutput({ ok: true, id: secretId }, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );
}
