import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));
const rootDir = process.cwd();
const serviceName = args.service;
const command = args.command;

if (!serviceName || !command) {
  console.error(
    "Usage: node ./scripts/flyway-run.mjs --service <service> --command <info|migrate|validate> [--env-file .env]",
  );
  process.exit(1);
}

const supportedCommands = new Set(["info", "migrate", "validate"]);
if (!supportedCommands.has(command)) {
  console.error(`Unsupported Flyway command "${command}".`);
  process.exit(1);
}

const boundaries = JSON.parse(
  fs.readFileSync(path.join(rootDir, "service-boundaries.json"), "utf8"),
);
const service = boundaries.services[serviceName];

if (!service?.dbPrefix) {
  console.error(`Service "${serviceName}" does not own database tables.`);
  process.exit(1);
}

const serviceDir = path.join(rootDir, "services", serviceName);
const migrationsDir = path.join(serviceDir, "db", "migrations");
const envPath = resolveEnvPath(serviceDir, args["env-file"]);

if (!fs.existsSync(migrationsDir)) {
  console.error(`Missing migrations directory: ${migrationsDir}`);
  process.exit(1);
}

if (!envPath) {
  console.error(`Missing env file for service "${serviceName}".`);
  process.exit(1);
}

const env = loadEnvFile(envPath);
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  console.error(`DATABASE_URL not found in ${envPath}`);
  process.exit(1);
}

const jdbc = toJdbcConnection(databaseUrl);
const dockerArgs = [
  "run",
  "--rm",
  "--mount",
  `type=bind,src=${normalizePath(migrationsDir)},dst=/flyway/sql,readonly`,
  "--env",
  "FLYWAY_LOCATIONS",
  "--env",
  "FLYWAY_TABLE",
  "--env",
  "FLYWAY_URL",
  "--env",
  "FLYWAY_USER",
  "--env",
  "FLYWAY_PASSWORD",
  "--env",
  "FLYWAY_BASELINE_ON_MIGRATE",
  "--env",
  "FLYWAY_BASELINE_VERSION",
  "flyway/flyway:12.3.0",
  command,
];

console.log(
  JSON.stringify(
    {
      service: serviceName,
      command,
      database: jdbc.database,
      historyTable: `${service.dbPrefix}_schema_history`,
      envFile: path.relative(rootDir, envPath),
    },
    null,
    2,
  ),
);

const result = spawnSync("docker", dockerArgs, {
  cwd: rootDir,
  stdio: "inherit",
  env: {
    ...process.env,
    FLYWAY_LOCATIONS: "filesystem:/flyway/sql",
    FLYWAY_TABLE: `${service.dbPrefix}_schema_history`,
    FLYWAY_URL: jdbc.url,
    FLYWAY_USER: jdbc.user,
    FLYWAY_PASSWORD: jdbc.password,
    FLYWAY_BASELINE_ON_MIGRATE: "true",
    FLYWAY_BASELINE_VERSION: "0",
  },
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function loadEnvFile(envPath) {
  const env = {};
  const raw = fs.readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function resolveEnvPath(serviceDir, explicitEnvFile) {
  const candidates = explicitEnvFile
    ? [path.resolve(serviceDir, explicitEnvFile)]
    : [
        path.join(serviceDir, ".env.local"),
        path.join(serviceDir, ".env"),
        path.join(rootDir, ".env.local"),
        path.join(rootDir, ".env"),
        path.join(rootDir, "services", "identity", ".env"),
      ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function toJdbcConnection(databaseUrl) {
  const url = new URL(databaseUrl);
  if (url.protocol !== "mysql:") {
    throw new Error(`Unsupported protocol ${url.protocol}. Expected mysql:.`);
  }

  const database = url.pathname.replace(/^\//, "");
  const baseUrl = `jdbc:mysql://${url.hostname}:${url.port || "3306"}/${database}`;
  const query = url.search ? url.search : "";

  return {
    url: `${baseUrl}${query}`,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
  };
}

function normalizePath(targetPath) {
  return path.resolve(targetPath).replace(/\\/g, "/");
}
