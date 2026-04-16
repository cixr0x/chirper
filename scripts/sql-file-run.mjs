import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const args = parseArgs(process.argv.slice(2));
const rootDir = process.cwd();
const serviceName = args.service;
const relativeFile = args.file;

if (!serviceName || !relativeFile) {
  console.error(
    "Usage: node ./scripts/sql-file-run.mjs --service <service> --file <relative-sql-file> [--env-file .env]",
  );
  process.exit(1);
}

const serviceDir = path.join(rootDir, "services", serviceName);
const sqlPath = path.join(serviceDir, relativeFile);
const envPath = resolveEnvPath(serviceDir, args["env-file"]);

if (!fs.existsSync(sqlPath)) {
  console.error(`Missing SQL file: ${sqlPath}`);
  process.exit(1);
}

if (!envPath) {
  console.error(`Missing env file for service "${serviceName}".`);
  process.exit(1);
}

const env = loadEnvFile(envPath);
if (!env.DATABASE_URL) {
  console.error(`DATABASE_URL not found in ${envPath}`);
  process.exit(1);
}

const connection = await createConnection(env.DATABASE_URL);
const sql = fs.readFileSync(sqlPath, "utf8");

console.log(
  JSON.stringify(
    {
      service: serviceName,
      file: path.relative(rootDir, sqlPath),
      envFile: path.relative(rootDir, envPath),
    },
    null,
    2,
  ),
);

try {
  await connection.query(sql);
  console.log("SQL file executed successfully.");
} finally {
  await connection.end();
}

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

async function createConnection(databaseUrl) {
  const url = new URL(databaseUrl);
  return mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || "3306"),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    multipleStatements: true,
  });
}
