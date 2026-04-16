import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function loadServiceEnv() {
  const rootDir = path.resolve(process.cwd(), "../../");

  loadFile(path.join(process.cwd(), ".env.local"));
  loadFile(path.join(process.cwd(), ".env"));
  loadFile(path.join(rootDir, ".env.local"));
  loadFile(path.join(rootDir, ".env"));

  if (!process.env.DATABASE_URL) {
    loadFile(path.resolve(process.cwd(), "../identity/.env"), ["DATABASE_URL"]);
  }
}

function loadFile(filePath: string, onlyKeys?: string[]) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const loaded = dotenv.config({
    path: filePath,
    override: false,
    processEnv: onlyKeys ? {} : process.env,
  });

  if (!onlyKeys || loaded.error || !loaded.parsed) {
    return;
  }

  for (const key of onlyKeys) {
    const value = loaded.parsed[key];
    if (value !== undefined && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
