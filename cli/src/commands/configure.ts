import * as p from "@clack/prompts";
import pc from "picocolors";
import { readConfig, writeConfig, configExists, resolveConfigPath } from "../config/store.js";
import type { PaperclipConfig } from "../config/schema.js";
import { ensureLocalSecretsKeyFile } from "../config/secrets-key.js";
import { promptDatabase } from "../prompts/database.js";
import { promptLlm } from "../prompts/llm.js";
import { promptLogging } from "../prompts/logging.js";
import { defaultSecretsConfig, promptSecrets } from "../prompts/secrets.js";
import { defaultStorageConfig, promptStorage } from "../prompts/storage.js";
import { promptServer } from "../prompts/server.js";
import {
  resolveDefaultBackupDir,
  resolveDefaultEmbeddedPostgresDir,
  resolveDefaultLogsDir,
  resolvePaperclipInstanceId,
} from "../config/home.js";
import { AUTH_BASE_URL_MODES, DEPLOYMENT_EXPOSURES, DEPLOYMENT_MODES } from "@paperclipai/shared";
import { printPaperclipCliBanner } from "../utils/banner.js";

type Section = "llm" | "database" | "logging" | "server" | "storage" | "secrets";


function parseBool(raw: string | undefined): boolean | null {
  if (raw === undefined) return null;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes"].includes(v)) return true;
  if (["0", "false", "no"].includes(v)) return false;
  return null;
}

function parseNum(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function applyFromEnv(config: PaperclipConfig, section?: Section) {
  const sections: Section[] = section ? [section] : ["database", "logging", "server", "storage", "secrets"];
  for (const s of sections) {
    if (s === "database") {
      if (process.env.DATABASE_URL?.trim()) {
        config.database.mode = "postgres";
        config.database.connectionString = process.env.DATABASE_URL.trim();
      }
      const enabled = parseBool(process.env.PAPERCLIP_DB_BACKUP_ENABLED);
      if (enabled !== null) config.database.backup.enabled = enabled;
      const interval = parseNum(process.env.PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES);
      if (interval !== null) config.database.backup.intervalMinutes = Math.max(1, Math.floor(interval));
      const retention = parseNum(process.env.PAPERCLIP_DB_BACKUP_RETENTION_DAYS);
      if (retention !== null) config.database.backup.retentionDays = Math.max(1, Math.floor(retention));
      if (process.env.PAPERCLIP_DB_BACKUP_DIR?.trim()) config.database.backup.dir = process.env.PAPERCLIP_DB_BACKUP_DIR.trim();
    }
    if (s === "logging" && process.env.PAPERCLIP_LOG_DIR?.trim()) {
      config.logging.logDir = process.env.PAPERCLIP_LOG_DIR.trim();
    }
    if (s === "server") {
      const dm = process.env.PAPERCLIP_DEPLOYMENT_MODE?.trim();
      if (dm && DEPLOYMENT_MODES.includes(dm as (typeof DEPLOYMENT_MODES)[number])) config.server.deploymentMode = dm as any;
      const ex = process.env.PAPERCLIP_DEPLOYMENT_EXPOSURE?.trim();
      if (ex && DEPLOYMENT_EXPOSURES.includes(ex as (typeof DEPLOYMENT_EXPOSURES)[number])) config.server.exposure = ex as any;
      if (process.env.HOST?.trim()) config.server.host = process.env.HOST.trim();
      const port = parseNum(process.env.PORT);
      if (port !== null) config.server.port = Math.max(1, Math.floor(port));
      const serveUi = parseBool(process.env.SERVE_UI);
      if (serveUi !== null) config.server.serveUi = serveUi;
      if (process.env.PAPERCLIP_ALLOWED_HOSTNAMES?.trim()) {
        config.server.allowedHostnames = process.env.PAPERCLIP_ALLOWED_HOSTNAMES.split(',').map((v)=>v.trim().toLowerCase()).filter(Boolean);
      }
      const bum = process.env.PAPERCLIP_AUTH_BASE_URL_MODE?.trim();
      if (bum && AUTH_BASE_URL_MODES.includes(bum as (typeof AUTH_BASE_URL_MODES)[number])) config.auth.baseUrlMode = bum as any;
      const purl = process.env.PAPERCLIP_AUTH_PUBLIC_BASE_URL?.trim() || process.env.BETTER_AUTH_URL?.trim() || process.env.BETTER_AUTH_BASE_URL?.trim() || process.env.PAPERCLIP_PUBLIC_URL?.trim();
      if (purl) config.auth.publicBaseUrl = purl;
      const disable = parseBool(process.env.PAPERCLIP_AUTH_DISABLE_SIGN_UP);
      if (disable !== null) config.auth.disableSignUp = disable;
    }
    if (s === "storage") {
      const provider = process.env.PAPERCLIP_STORAGE_PROVIDER?.trim();
      if (provider === "local_disk" || provider === "s3") config.storage.provider = provider;
      if (process.env.PAPERCLIP_STORAGE_LOCAL_DIR?.trim()) config.storage.localDisk.baseDir = process.env.PAPERCLIP_STORAGE_LOCAL_DIR.trim();
      if (process.env.PAPERCLIP_STORAGE_S3_BUCKET?.trim()) config.storage.s3.bucket = process.env.PAPERCLIP_STORAGE_S3_BUCKET.trim();
      if (process.env.PAPERCLIP_STORAGE_S3_REGION?.trim()) config.storage.s3.region = process.env.PAPERCLIP_STORAGE_S3_REGION.trim();
    }
    if (s === "secrets") {
      const provider = process.env.PAPERCLIP_SECRETS_PROVIDER?.trim();
      if (provider === "local_encrypted") config.secrets.provider = provider;
      const strict = parseBool(process.env.PAPERCLIP_SECRETS_STRICT_MODE);
      if (strict !== null) config.secrets.strictMode = strict;
      if (process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE?.trim()) {
        config.secrets.localEncrypted.keyFilePath = process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE.trim();
      }
    }
  }
}

const SECTION_LABELS: Record<Section, string> = {
  llm: "LLM Provider",
  database: "Database",
  logging: "Logging",
  server: "Server",
  storage: "Storage",
  secrets: "Secrets",
};

function defaultConfig(): PaperclipConfig {
  const instanceId = resolvePaperclipInstanceId();
  return {
    $meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
      source: "configure",
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: resolveDefaultEmbeddedPostgresDir(instanceId),
      embeddedPostgresPort: 54329,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: resolveDefaultBackupDir(instanceId),
      },
    },
    logging: {
      mode: "file",
      logDir: resolveDefaultLogsDir(instanceId),
    },
    server: {
      deploymentMode: "local_trusted",
      exposure: "private",
      host: "127.0.0.1",
      port: 3100,
      allowedHostnames: [],
      serveUi: true,
    },
    auth: {
      baseUrlMode: "auto",
      disableSignUp: false,
    },
    storage: defaultStorageConfig(),
    secrets: defaultSecretsConfig(),
  };
}

export async function configure(opts: {
  config?: string;
  section?: string;
  fromEnv?: boolean;
}): Promise<void> {
  printPaperclipCliBanner();
  p.intro(pc.bgCyan(pc.black(" paperclip configure ")));
  const configPath = resolveConfigPath(opts.config);

  if (!configExists(opts.config)) {
    p.log.error("No config file found. Run `paperclipai onboard` first.");
    p.outro("");
    return;
  }

  let config: PaperclipConfig;
  try {
    config = readConfig(opts.config) ?? defaultConfig();
  } catch (err) {
    p.log.message(
      pc.yellow(
        `Existing config is invalid. Loading defaults so you can repair it now.\n${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    config = defaultConfig();
  }

  let section: Section | undefined = opts.section as Section | undefined;

  if (section && !SECTION_LABELS[section]) {
    p.log.error(`Unknown section: ${section}. Choose from: ${Object.keys(SECTION_LABELS).join(", ")}`);
    p.outro("");
    return;
  }

  if (opts.fromEnv) {
    applyFromEnv(config, section);
    config.$meta.updatedAt = new Date().toISOString();
    config.$meta.source = "configure";
    writeConfig(config, opts.config);
    p.log.success(section ? `${SECTION_LABELS[section]} updated from environment/defaults.` : "Configuration updated from environment/defaults.");
    p.outro("Configuration saved.");
    return;
  }

  // Section selection loop
  let continueLoop = true;
  while (continueLoop) {
    if (!section) {
      const choice = await p.select({
        message: "Which section do you want to configure?",
        options: Object.entries(SECTION_LABELS).map(([value, label]) => ({
          value: value as Section,
          label,
        })),
      });

      if (p.isCancel(choice)) {
        p.cancel("Configuration cancelled.");
        return;
      }

      section = choice;
    }

    p.log.step(pc.bold(SECTION_LABELS[section]));

    switch (section) {
      case "database":
        config.database = await promptDatabase(config.database);
        break;
      case "llm": {
        const llm = await promptLlm();
        if (llm) {
          config.llm = llm;
        } else {
          delete config.llm;
        }
        break;
      }
      case "logging":
        config.logging = await promptLogging();
        break;
      case "server":
        {
          const { server, auth } = await promptServer({
            currentServer: config.server,
            currentAuth: config.auth,
          });
          config.server = server;
          config.auth = auth;
        }
        break;
      case "storage":
        config.storage = await promptStorage(config.storage);
        break;
      case "secrets":
        config.secrets = await promptSecrets(config.secrets);
        {
          const keyResult = ensureLocalSecretsKeyFile(config, configPath);
          if (keyResult.status === "created") {
            p.log.success(`Created local secrets key file at ${pc.dim(keyResult.path)}`);
          } else if (keyResult.status === "existing") {
            p.log.message(pc.dim(`Using existing local secrets key file at ${keyResult.path}`));
          } else if (keyResult.status === "skipped_provider") {
            p.log.message(pc.dim("Skipping local key file management for non-local provider"));
          } else {
            p.log.message(pc.dim("Skipping local key file management because PAPERCLIP_SECRETS_MASTER_KEY is set"));
          }
        }
        break;
    }

    config.$meta.updatedAt = new Date().toISOString();
    config.$meta.source = "configure";

    writeConfig(config, opts.config);
    p.log.success(`${SECTION_LABELS[section]} configuration updated.`);

    // If section was provided via CLI flag, don't loop
    if (opts.section) {
      continueLoop = false;
    } else {
      const another = await p.confirm({
        message: "Configure another section?",
        initialValue: false,
      });

      if (p.isCancel(another) || !another) {
        continueLoop = false;
      } else {
        section = undefined; // Reset to show picker again
      }
    }
  }

  p.outro("Configuration saved.");
}
