import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const boundariesPath = path.join(root, "service-boundaries.json");
const boundaries = JSON.parse(await readFile(boundariesPath, "utf8"));

const services = Object.entries(boundaries.services).filter(([, config]) => config.dbPrefix);
const allPrefixes = services.map(([, config]) => config.dbPrefix);
const violations = [];

for (const [serviceName, config] of services) {
  const schemaPath = path.join(root, "services", serviceName, "prisma", "schema.prisma");

  try {
    await access(schemaPath);
  } catch {
    continue;
  }

  const schema = await readFile(schemaPath, "utf8");
  const ownedPrefix = `${config.dbPrefix}_`;
  const mappedTables = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((match) => match[1]);

  if (mappedTables.length === 0) {
    violations.push(`${serviceName}: schema has no @@map(...) table mappings`);
    continue;
  }

  for (const tableName of mappedTables) {
    if (!tableName.startsWith(ownedPrefix)) {
      violations.push(
        `${serviceName}: table "${tableName}" does not start with owned prefix "${ownedPrefix}"`,
      );
    }
  }

  for (const foreignPrefix of allPrefixes) {
    if (foreignPrefix === config.dbPrefix) {
      continue;
    }

    const foreignPattern = new RegExp(`\\b${foreignPrefix}_[a-zA-Z0-9_]+\\b`, "g");
    const matches = schema.match(foreignPattern);

    if (matches?.length) {
      violations.push(
        `${serviceName}: schema references foreign-owned tables ${[...new Set(matches)].join(", ")}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("Table ownership violations detected:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Table ownership validated for ${services.length} database-owning services.`);
