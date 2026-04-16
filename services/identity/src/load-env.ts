import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function loadServiceEnv(additionalCandidates: string[] = []) {
  const rootDir = path.resolve(process.cwd(), "../../");
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
    path.join(rootDir, ".env.local"),
    path.join(rootDir, ".env"),
    ...additionalCandidates.map((candidate) => path.resolve(process.cwd(), candidate)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
    }
  }
}

