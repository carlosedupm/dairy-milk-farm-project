#!/usr/bin/env node
/**
 * Validador de referências a regras de negócio (BR-*, TMP-*, INT-*).
 *
 * Fonte de verdade: docs/business/*.md (catálogo), apenas definições formais
 * (heading #…#### ID ou primeira célula de tabela | ID |).
 *
 * Verifica:
 *   1. Toda referência em código (backend/, frontend/src/) e briefings
 *      existe como definição formal no catálogo.
 *   2. docs/business/INDEX.md está sincronizado com o catálogo
 *      (gerar com: node scripts/generate-br-index.mjs).
 *   3. Metadados dos briefings (BRF-NNN, Status, ≥1 BR-*).
 *   4. BR-* com Estado implementado tem briefing (Status
 *      implementado|arquivado) OU está em pre-briefing-allowlist.txt.
 *   5. Briefing com Status rascunho não pode ser a única cobertura de um
 *      BR-* já citado em código.
 *
 * Uso: node scripts/validate-br-refs.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUSINESS = path.join(ROOT, "docs/business");
const INDEX_PATH = path.join(BUSINESS, "INDEX.md");
const ALLOWLIST_PATH = path.join(BUSINESS, "pre-briefing-allowlist.txt");

const ID_PATTERN = /\b(?:BR-[A-Z]+-\d{3}|TMP-\d{3}|INT-\d{3})\b/g;
const HEADING_DEF =
  /^#{1,4}\s+(BR-[A-Z]+-\d{3}|TMP-\d{3}|INT-\d{3})\b/gm;
const TABLE_DEF =
  /^\|\s*(BR-[A-Z]+-\d{3}|TMP-\d{3}|INT-\d{3})\s*\|/gm;
const BRIEFING_STATUS = ["rascunho", "aprovado", "implementado", "arquivado"];
const COVERING_STATUS = new Set(["aprovado", "implementado", "arquivado"]);

function listFiles(dir, exts) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { recursive: true })
    .map((rel) => path.join(abs, rel))
    .filter((f) => exts.some((e) => f.endsWith(e)) && fs.statSync(f).isFile());
}

function listBusinessMd() {
  return listFiles("docs/business", [".md"]).filter((f) => {
    const base = path.basename(f);
    return base !== "INDEX.md" && base !== "README.md";
  });
}

function collectFormalIds() {
  const definedIds = new Set();
  for (const file of listBusinessMd()) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(HEADING_DEF)) definedIds.add(m[1]);
    for (const m of text.matchAll(TABLE_DEF)) definedIds.add(m[1]);
  }
  return definedIds;
}

function parseAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return new Set();
  const ids = new Set();
  for (const line of fs.readFileSync(ALLOWLIST_PATH, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (/^BR-[A-Z]+-\d{3}$/.test(t)) ids.add(t);
  }
  return ids;
}

function collectImplementedBr() {
  const impl = new Set();
  const blockRe =
    /^#{1,4}\s+(BR-[A-Z]+-\d{3})\b[\s\S]*?(?=^#{1,4}\s+|\Z)/gm;
  for (const file of listBusinessMd()) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(blockRe)) {
      const id = m[1];
      const block = m[0];
      if (
        /\*\*Estado\*\*:\s*[^\n]*implementado/i.test(block) ||
        (path.basename(file).startsWith("BR-") &&
          /\*\*implementado\*\*|Estado[^\n]*implementado/i.test(block))
      ) {
        impl.add(id);
      }
    }
  }
  return impl;
}

function parseBriefings() {
  const briefings = listFiles("docs/briefings", [".md"]).filter((f) => {
    const base = path.basename(f);
    return base !== "README.md" && base !== "briefing-template.md";
  });

  /** @type {{rel: string, status: string|null, brIds: Set<string>}[]} */
  const parsed = [];
  for (const file of briefings) {
    const rel = path.relative(ROOT, file);
    const content = fs.readFileSync(file, "utf8");
    const statusMatch = content.match(/\|\s*Status\s*\|\s*([^|\n]+)\|/i);
    const status = statusMatch?.[1].trim().toLowerCase() ?? null;
    const brIds = new Set(content.match(/\bBR-[A-Z]+-\d{3}\b/g) ?? []);
    parsed.push({ rel, status, brIds, content });
  }
  return parsed;
}

const errors = [];
const definedIds = collectFormalIds();

if (definedIds.size === 0) {
  console.error(
    "ERRO: nenhum ID formal (heading/tabela) em docs/business/ — catálogo ausente?"
  );
  process.exit(1);
}

// 1. Referências em código e briefings
const scanTargets = [
  ...listFiles("backend", [".go"]),
  ...listFiles("frontend/src", [".ts", ".tsx"]),
  ...listFiles("docs/briefings", [".md"]),
];

const idsInCode = new Set();
for (const file of scanTargets) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const inCode =
    file.includes(`${path.sep}backend${path.sep}`) ||
    file.includes(`${path.sep}frontend${path.sep}src${path.sep}`);
  lines.forEach((line, i) => {
    for (const id of line.match(ID_PATTERN) ?? []) {
      if (inCode) idsInCode.add(id);
      if (!definedIds.has(id)) {
        errors.push(
          `${path.relative(ROOT, file)}:${i + 1} — ID "${id}" não tem definição formal em docs/business/ (heading ou célula de tabela)`
        );
      }
    }
  });
}

// 2. INDEX.md sincronizado (sem reescrever o ficheiro)
if (!fs.existsSync(INDEX_PATH)) {
  errors.push(
    "docs/business/INDEX.md ausente — rode: node scripts/generate-br-index.mjs"
  );
} else {
  const indexText = fs.readFileSync(INDEX_PATH, "utf8");
  const indexIds = new Set(indexText.match(ID_PATTERN) ?? []);
  for (const id of definedIds) {
    if (!indexIds.has(id)) {
      errors.push(
        `docs/business/INDEX.md — falta ID formal "${id}" (rode generate-br-index.mjs)`
      );
    }
  }
  for (const id of indexIds) {
    if (!definedIds.has(id)) {
      errors.push(
        `docs/business/INDEX.md — ID "${id}" não tem definição formal no catálogo`
      );
    }
  }
}

// 3. Metadados dos briefings
const briefings = parseBriefings();
for (const b of briefings) {
  if (!/\bBRF-\d{3}\b/.test(b.content)) {
    errors.push(`${b.rel} — briefing sem ID "BRF-NNN" nos metadados`);
  }
  if (!b.status || !BRIEFING_STATUS.includes(b.status)) {
    errors.push(
      `${b.rel} — Status ausente ou inválido (esperado: ${BRIEFING_STATUS.join(" | ")})`
    );
  }
  if (b.brIds.size === 0) {
    errors.push(`${b.rel} — briefing não referencia nenhuma regra BR-* do catálogo`);
  }
}

// Map BR → covering briefings (aprovado|implementado|arquivado) and rascunho
const covering = new Map(); // id → Set of briefing rels
const draftOnly = new Map();
for (const b of briefings) {
  for (const id of b.brIds) {
    if (COVERING_STATUS.has(b.status)) {
      if (!covering.has(id)) covering.set(id, new Set());
      covering.get(id).add(b.rel);
    } else if (b.status === "rascunho") {
      if (!draftOnly.has(id)) draftOnly.set(id, new Set());
      draftOnly.get(id).add(b.rel);
    }
  }
}

// 4. Implementado ⇒ briefing covering OU allowlist
const allowlist = parseAllowlist();
const implemented = collectImplementedBr();
for (const id of implemented) {
  if (covering.has(id)) continue;
  if (allowlist.has(id)) continue;
  errors.push(
    `${id} — Estado implementado sem briefing (aprovado|implementado|arquivado) e fora de docs/business/pre-briefing-allowlist.txt`
  );
}

// 5. Rascunho não pode ser única cobertura de ID já no código
for (const id of idsInCode) {
  if (!id.startsWith("BR-")) continue;
  if (covering.has(id)) continue;
  if (draftOnly.has(id)) {
    errors.push(
      `${id} — citado em código mas só aparece em briefing(s) rascunho (${[...draftOnly.get(id)].join(", ")}); aprove G1 ou remova a referência`
    );
  }
}

if (errors.length > 0) {
  console.error(`validate-br-refs: ${errors.length} violação(ões):\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(
  `validate-br-refs: OK — ${definedIds.size} IDs formais, ` +
    `${scanTargets.length} arquivos verificados, ${briefings.length} briefing(s), ` +
    `${allowlist.size} ID(s) na allowlist pré-briefing.`
);
