import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serviceName = args.service;

if (!serviceName) {
  console.error("Usage: node ./scripts/prisma-generate.mjs --service <service>");
  process.exit(1);
}

const serviceDir = path.join(rootDir, "services", serviceName);
const envPath = resolveEnvPath(serviceDir);

const command =
  process.platform === "win32"
    ? "npx.cmd prisma generate --schema prisma/schema.prisma"
    : "npx prisma generate --schema prisma/schema.prisma";

const result = spawnSync(command, {
  cwd: serviceDir,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    ...(envPath ? loadEnvFile(envPath) : {}),
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

function resolveEnvPath(serviceDir) {
  const candidates = [
    path.join(serviceDir, ".env.local"),
    path.join(serviceDir, ".env"),
    path.join(rootDir, ".env.local"),
    path.join(rootDir, ".env"),
    path.join(rootDir, "services", "identity", ".env"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
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
