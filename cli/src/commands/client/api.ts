import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { Command } from "commander";
import {
  addCommonClientOptions,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface ApiRequestOptions extends BaseClientOptions {
  body?: string;
  bodyFile?: string;
  stdin?: boolean;
  query?: string[];
  header?: string[];
}

interface HttpResponseSummary {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  data: unknown;
}

export function registerApiCommands(program: Command): void {
  const api = program.command("api").description("Low-level API access for full SSH/headless control-plane coverage");

  for (const method of ["get", "post", "patch", "delete"] as const) {
    addCommonClientOptions(
      api
        .command(`${method} <path>`)
        .description(`${method.toUpperCase()} an API path (for example /api/companies/:companyId/goals)`)
        .option("--body <json>", "JSON body payload (string)")
        .option("--body-file <path>", "Read request body from JSON file")
        .option("--stdin", "Read request body from stdin")
        .option("--query <key=value>", "Add query parameter (repeatable)", collectRepeatable, [])
        .option("--header <key=value>", "Add request header (repeatable)", collectRepeatable, [])
        .action(async (path: string, opts: ApiRequestOptions) => {
          try {
            const ctx = resolveCommandContext(opts);
            const requestBody = await resolveRequestBody(opts);
            const response = await sendRequest({
              apiBase: ctx.api.apiBase,
              apiKey: ctx.api.apiKey,
              method,
              path,
              body: requestBody,
              query: opts.query ?? [],
              headers: opts.header ?? [],
            });

            if (ctx.json) {
              printOutput(response, { json: true });
              return;
            }

            printOutput(response.data, { json: false, label: `${response.status} ${response.ok ? "OK" : "ERROR"}` });
          } catch (error) {
            handleCommandError(error);
          }
        }),
    );
  }
}

async function sendRequest(input: {
  apiBase: string;
  apiKey?: string;
  method: "get" | "post" | "patch" | "delete";
  path: string;
  body?: string;
  query: string[];
  headers: string[];
}): Promise<HttpResponseSummary> {
  const url = buildUrl(input.apiBase, input.path, input.query);
  const headers = parseKeyValueList(input.headers);
  headers.accept = headers.accept ?? "application/json";

  if (input.apiKey) {
    headers.authorization = `Bearer ${input.apiKey}`;
  }

  if (input.body !== undefined) {
    headers["content-type"] = headers["content-type"] ?? "application/json";
  }

  const response = await fetch(url, {
    method: input.method.toUpperCase(),
    headers,
    body: input.body,
  });

  const text = await response.text();
  const data = safeParse(text);

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data
      ? String((data as Record<string, unknown>).error)
      : `Request failed with status ${response.status}`;
    throw new Error(`${message} (status=${response.status})`);
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    data,
  };
}

function buildUrl(apiBase: string, path: string, queryPairs: string[]): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(apiBase);
  const [pathname, existingSearch] = normalizedPath.split("?");
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${pathname}`;

  if (existingSearch) {
    url.search = existingSearch;
  }

  for (const pair of queryPairs) {
    const [key, value] = splitKeyValue(pair, "query");
    url.searchParams.append(key, value);
  }

  return url.toString();
}

function parseKeyValueList(input: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const pair of input) {
    const [key, value] = splitKeyValue(pair, "header");
    record[key.toLowerCase()] = value;
  }
  return record;
}

function splitKeyValue(value: string, source: "query" | "header"): [string, string] {
  const idx = value.indexOf("=");
  if (idx <= 0) {
    throw new Error(`Invalid ${source} pair \"${value}\". Expected key=value.`);
  }

  return [value.slice(0, idx), value.slice(idx + 1)];
}

async function resolveRequestBody(opts: ApiRequestOptions): Promise<string | undefined> {
  const sources = [opts.body !== undefined, opts.bodyFile !== undefined, opts.stdin === true].filter(Boolean).length;
  if (sources > 1) {
    throw new Error("Pass only one body source: --body, --body-file, or --stdin.");
  }

  if (opts.body !== undefined) {
    return assertJsonBody(opts.body, "--body");
  }

  if (opts.bodyFile) {
    const fileBody = await readFile(opts.bodyFile, "utf8");
    return assertJsonBody(fileBody, `--body-file ${opts.bodyFile}`);
  }

  if (opts.stdin) {
    const stdinBody = await readStdin();
    return assertJsonBody(stdinBody, "--stdin");
  }

  return undefined;
}

function assertJsonBody(value: string, source: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  try {
    JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON from ${source}.`);
  }
  return trimmed;
}

function safeParse(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function collectRepeatable(value: string, previous: string[]): string[] {
  return [...previous, value];
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}
