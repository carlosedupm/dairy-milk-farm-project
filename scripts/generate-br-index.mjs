#!/usr/bin/env node
/**
 * Gera docs/business/INDEX.md a partir de headings formais e células de tabela
 * no catálogo (IDs BR-, TMP- e INT-).
 *
 * Uso: node scripts/generate-br-index.mjs
 * O CI (validate-br-refs) falha se INDEX.md estiver desatualizado.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUSINESS = path.join(ROOT, "docs/business");
const INDEX_PATH = path.join(BUSINESS, "INDEX.md");

const HEADING_DEF =
  /^#{1,4}\s+(BR-[A-Z]+-\d{3}|TMP-\d{3}|INT-\d{3})\b/gm;
const TABLE_DEF =
  /^\|\s*(BR-[A-Z]+-\d{3}|TMP-\d{3}|INT-\d{3})\s*\|/gm;

function listBusinessMd() {
  return fs
    .readdirSync(BUSINESS, { recursive: true })
    .map((rel) => path.join(BUSINESS, rel))
    .filter(
      (f) =>
        f.endsWith(".md") &&
        fs.statSync(f).isFile() &&
        path.basename(f) !== "INDEX.md" &&
        path.basename(f) !== "README.md"
    );
}

/** @returns {Map<string, string[]>} id → ficheiros relativos */
function collectFormalIds() {
  const byId = new Map();
  for (const file of listBusinessMd()) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    const text = fs.readFileSync(file, "utf8");
    const ids = new Set();
    for (const m of text.matchAll(HEADING_DEF)) ids.add(m[1]);
    for (const m of text.matchAll(TABLE_DEF)) ids.add(m[1]);
    for (const id of ids) {
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(rel);
    }
  }
  return byId;
}

function renderIndex(byId) {
  const ids = [...byId.keys()].sort();
  const byDomain = new Map();
  for (const id of ids) {
    const domain = id.startsWith("BR-")
      ? id.split("-")[1]
      : id.split("-")[0];
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(id);
  }

  const lines = [
    "# Índice de IDs de negócio (BR-*/TMP-*/INT-*)",
    "",
    "> Gerado por `node scripts/generate-br-index.mjs`. Não edite à mão —",
    "> o CI (`validate-br-refs.mjs`) exige paridade com headings/tabelas em",
    "> `docs/business/`.",
    "",
    `**Total**: ${ids.length} IDs formais.`,
    "",
  ];

  for (const domain of [...byDomain.keys()].sort()) {
    lines.push(`## ${domain}`, "");
    lines.push("| ID | Definido em |");
    lines.push("|----|------------|");
    for (const id of byDomain.get(domain)) {
      const short = byId
        .get(id)
        .map((f) => {
          const base = f.replace(/^docs\/business\//, "");
          return `[${base}](./${base})`;
        })
        .join(", ");
      lines.push(`| \`${id}\` | ${short} |`);
    }
    lines.push("");
  }

  lines.push(`**Gerado em**: ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  return lines.join("\n");
}

const byId = collectFormalIds();
if (byId.size === 0) {
  console.error("generate-br-index: nenhum ID formal em docs/business/");
  process.exit(1);
}

const body = renderIndex(byId);
fs.writeFileSync(INDEX_PATH, body);
console.log(
  `generate-br-index: ${byId.size} IDs → docs/business/INDEX.md`
);
