import { readFileSync } from "node:fs";

const REQUIRED = [
  "OPENCOMPUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "GITHUB_TOKEN",
  "DEMO_SESSION_AGENT_ID",
];

function readEnv(file) {
  const values = new Map();
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const raw = match[2].trim();
    const value =
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
        ? raw.slice(1, -1)
        : raw;
    values.set(match[1], value);
  }
  return values;
}

let values;
try {
  values = readEnv(".env.local");
} catch {
  console.error("FAIL  .env.local is missing. Follow README.md → Quick start.");
  process.exit(1);
}

const missing = REQUIRED.filter((key) => {
  const value = process.env[key]?.trim() || values.get(key)?.trim();
  return !value || value.endsWith("...");
});

if (missing.length > 0) {
  for (const key of missing) console.error(`FAIL  ${key} is not configured.`);
  process.exit(1);
}

const agentId =
  process.env.DEMO_SESSION_AGENT_ID?.trim() ||
  values.get("DEMO_SESSION_AGENT_ID");
if (!/^agt_[0-9a-f]{24}$/.test(agentId)) {
  console.error("FAIL  DEMO_SESSION_AGENT_ID must be an agt_ id.");
  process.exit(1);
}

for (const key of REQUIRED) console.log(`OK    ${key}`);
console.log("READY Environment is configured. No credential values were printed.");
