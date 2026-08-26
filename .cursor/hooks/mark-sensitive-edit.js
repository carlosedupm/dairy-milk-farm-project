#!/usr/bin/env node
/**
 * afterFileEdit: marca sessão se path sensível foi editado (fail-open).
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const FLAG = path.join(os.tmpdir(), "ceialmilk-agent-docs-remind");
const SENSITIVE =
  /(^|\/)(docs\/business\/|memory-bank\/|backend\/internal\/(handlers|service|repository)\/|frontend\/src\/)/;

let payload = {};
try {
  const raw = fs.readFileSync(0, "utf8");
  if (raw.trim()) payload = JSON.parse(raw);
} catch {
  process.stdout.write("{}\n");
  process.exit(0);
}

const candidates = [];
const visit = (v) => {
  if (!v) return;
  if (typeof v === "string") {
    candidates.push(v.replace(/\\/g, "/"));
    return;
  }
  if (Array.isArray(v)) return v.forEach(visit);
  if (typeof v === "object") {
    for (const [k, val] of Object.entries(v)) {
      if (/path|file|uri|filename/i.test(k) && typeof val === "string") {
        candidates.push(val.replace(/\\/g, "/"));
      } else visit(val);
    }
  }
};
visit(payload);

const hit = candidates.some((p) => SENSITIVE.test(p));
if (hit) {
  try {
    fs.writeFileSync(FLAG, "1");
  } catch {
    /* fail-open */
  }
}
process.stdout.write("{}\n");
process.exit(0);
