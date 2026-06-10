#!/usr/bin/env node
/**
 * Validador de referências a regras de negócio (BR-*, TMP-*, INT-*).
 *
 * Fonte de verdade: docs/business/*.md (catálogo).
 * Verifica:
 *   1. Toda referência a BR-<DOMINIO>-NNN, TMP-NNN ou INT-NNN em código
 *      (backend/, frontend/src/) e em briefings (docs/briefings/) existe
 *      no catálogo — mata alucinação de ID na raiz.
 *   2. Todo briefing em docs/briefings/ (exceto README e template) tem
 *      metadados mínimos (ID BRF-NNN, Status válido) e referencia ao
 *      menos uma regra BR-*.
 *
 * Uso: node scripts/validate-br-refs.mjs
 * Sai com código 1 se houver violações.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const ID_PATTERN = /\b(?:BR-[A-Z]+-\d{3}|TMP-\d{3}|INT-\d{3})\b/g;
const BRIEFING_STATUS = ["rascunho", "aprovado", "implementado", "arquivado"];

function listFiles(dir, exts) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { recursive: true })
    .map((rel) => path.join(abs, rel))
    .filter((f) => exts.some((e) => f.endsWith(e)) && fs.statSync(f).isFile());
}

// 1. Coletar IDs definidos no catálogo
const definedIds = new Set();
for (const file of listFiles("docs/business", [".md"])) {
  const matches = fs.readFileSync(file, "utf8").match(ID_PATTERN) ?? [];
  for (const id of matches) definedIds.add(id);
}

if (definedIds.size === 0) {
  console.error("ERRO: nenhum ID encontrado em docs/business/ — catálogo ausente?");
  process.exit(1);
}

// 2. Verificar referências em código e briefings
const errors = [];

const scanTargets = [
  ...listFiles("backend", [".go"]),
  ...listFiles("frontend/src", [".ts", ".tsx"]),
  ...listFiles("docs/briefings", [".md"]),
];

for (const file of scanTargets) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const id of line.match(ID_PATTERN) ?? []) {
      if (!definedIds.has(id)) {
        errors.push(
          `${path.relative(ROOT, file)}:${i + 1} — ID "${id}" não existe em docs/business/`
        );
      }
    }
  });
}

// 3. Verificar metadados dos briefings
const briefings = listFiles("docs/briefings", [".md"]).filter((f) => {
  const base = path.basename(f);
  return base !== "README.md" && base !== "briefing-template.md";
});

for (const file of briefings) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, "utf8");

  if (!/\bBRF-\d{3}\b/.test(content)) {
    errors.push(`${rel} — briefing sem ID "BRF-NNN" nos metadados`);
  }

  const statusMatch = content.match(/\|\s*Status\s*\|\s*([^|\n]+)\|/i);
  const status = statusMatch?.[1].trim().toLowerCase();
  if (!status || !BRIEFING_STATUS.includes(status)) {
    errors.push(
      `${rel} — Status ausente ou inválido (esperado: ${BRIEFING_STATUS.join(" | ")})`
    );
  }

  if (!/\bBR-[A-Z]+-\d{3}\b/.test(content)) {
    errors.push(`${rel} — briefing não referencia nenhuma regra BR-* do catálogo`);
  }
}

// Resultado
if (errors.length > 0) {
  console.error(`validate-br-refs: ${errors.length} violação(ões):\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(
  `validate-br-refs: OK — ${definedIds.size} IDs no catálogo, ` +
    `${scanTargets.length} arquivos verificados, ${briefings.length} briefing(s).`
);
