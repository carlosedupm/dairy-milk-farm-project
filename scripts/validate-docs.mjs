#!/usr/bin/env node
/**
 * Validador de integridade da documentação.
 *
 * Verifica:
 *   1. Todo link markdown relativo em .md resolve para um ficheiro existente
 *      — apanha caminhos escritos como se fossem relativos à raiz quando o
 *      documento está numa subpasta.
 *   2. Todo caminho de código citado em backticks dentro de docs/ e
 *      memory-bank/ existe — protege o campo "Implementação" das regras BR-*,
 *      que é o elo entre catálogo de negócio e código.
 *   3. Os ficheiros de estado do memory bank não excedem o teto de linhas —
 *      impede que voltem a acumular changelog (ver skill atualizar-documentacao).
 *   4. Nenhum ficheiro fora de docs/business/ **define** códigos de conformidade
 *      TMP-NNN. Restar a tabela canónica no harness fez a numeração derivar do
 *      código; referenciar os códigos é permitido, redefini-los não.
 *
 * Uso: node scripts/validate-docs.mjs
 * Sai com código 1 se houver violações.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// Nomes de pasta ignorados em qualquer profundidade (ex.: frontend/node_modules).
const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
]);

// Caminhos ignorados a partir da raiz (artefactos de execução não versionados).
const IGNORED_PATHS = ["testsprite_tests/tmp"];

// Alvos da verificação 2: onde documentamos ponteiros para o código.
const DOC_ROOTS = ["docs", "memory-bank"];
const CODE_PATH_PREFIXES = ["backend/", "frontend/", "scripts/"];

// Verificação 3: ficheiros de estado / índices e teto de linhas.
const LINE_LIMITS = {
  "memory-bank/activeContext.md": 150,
  "memory-bank/progress.md": 150,
  "memory-bank/systemPatterns.md": 80,
};

// Módulos de padrões: cada ficheiro em memory-bank/patterns/ tem teto próprio.
const PATTERNS_DIR = "memory-bank/patterns";
const PATTERNS_LINE_LIMIT = 220;

// Verificação 4: onde a tabela de códigos TMP pode ser definida.
// docs/business/ é o catálogo canónico; .cursor/plans/ são rascunhos efémeros.
const TMP_DEF_ALLOWED = ["docs/business/", ".cursor/plans/"];

const MD_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CODE_PATH = /`([^`\n]+)`/g;
// Definição: código seguido de ":" ou "=" e texto, ou como chave de linha de
// tabela (primeira célula). Referências não casam — nem em prosa
// ("TMP-001 a TMP-006, ver auditoria.md") nem dentro de uma célula
// ("| ... | 400 TMP-001 |").
const TMP_DEFINITION = /^\s*\|\s*TMP-\d{3}\s*\||TMP-\d{3}\s*[:=]\s*\S/;

function isIgnoredPath(rel) {
  const normalized = rel.split(path.sep).join("/");
  return IGNORED_PATHS.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`)
  );
}

/** Percorre `dir` recursivamente podando pastas ignoradas (não entra em node_modules). */
function listFiles(dir, exts) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];

  const found = [];
  const stack = [abs];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.relative(ROOT, full);

      if (entry.isDirectory()) {
        if (IGNORED_DIR_NAMES.has(entry.name) || isIgnoredPath(rel)) continue;
        stack.push(full);
      } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
        if (!isIgnoredPath(rel)) found.push(full);
      }
    }
  }

  return found;
}

const errors = [];

// 1. Links markdown relativos
const markdownFiles = listFiles(".", [".md"]);
let linksChecked = 0;

for (const file of markdownFiles) {
  const rel = path.relative(ROOT, file);
  const dir = path.dirname(file);

  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const match of line.matchAll(MD_LINK)) {
        // Descarta o fragmento: o alvo é o ficheiro, não a âncora.
        const target = match[1].split("#")[0].trim();

        // Âncora pura, URL ou placeholder de template.
        if (!target) continue;
        if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        if (target.startsWith("<") || target.includes("${")) continue;

        linksChecked++;
        if (!fs.existsSync(path.resolve(dir, decodeURIComponent(target)))) {
          errors.push(`${rel}:${i + 1} — link relativo quebrado: "${target}"`);
        }
      }
    });
}

// 2. Ponteiros para ficheiros de código citados na documentação
let pointersChecked = 0;

for (const root of DOC_ROOTS) {
  for (const file of listFiles(root, [".md"])) {
    const rel = path.relative(ROOT, file);

    fs.readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const match of line.matchAll(CODE_PATH)) {
          const candidate = match[1].trim();

          if (!CODE_PATH_PREFIXES.some((p) => candidate.startsWith(p))) continue;
          // Curingas e segmentos dinâmicos descrevem padrões, não ficheiros.
          if (/[*?\[\]{}\s]/.test(candidate)) continue;
          // Só validamos caminhos de ficheiro (com extensão) e diretórios (com /).
          if (!path.extname(candidate) && !candidate.endsWith("/")) continue;

          pointersChecked++;
          if (!fs.existsSync(path.join(ROOT, candidate))) {
            errors.push(
              `${rel}:${i + 1} — caminho inexistente no repo: "${candidate}"`
            );
          }
        }
      });
  }
}

// 3. Teto de linhas dos ficheiros de estado / índices
for (const [rel, limit] of Object.entries(LINE_LIMITS)) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`${rel} — ficheiro de estado ausente`);
    continue;
  }

  const lines = fs.readFileSync(abs, "utf8").trimEnd().split("\n").length;
  if (lines > limit) {
    errors.push(
      `${rel} — ${lines} linhas excede o teto de ${limit}. ` +
        `Este ficheiro descreve o estado atual, não histórico: substitua ` +
        `entradas em vez de empilhar (skill atualizar-documentacao).`
    );
  }
}

const patternsAbs = path.join(ROOT, PATTERNS_DIR);
if (fs.existsSync(patternsAbs)) {
  for (const name of fs.readdirSync(patternsAbs)) {
    if (!name.endsWith(".md")) continue;
    const rel = `${PATTERNS_DIR}/${name}`;
    const lines = fs
      .readFileSync(path.join(patternsAbs, name), "utf8")
      .trimEnd()
      .split("\n").length;
    if (lines > PATTERNS_LINE_LIMIT) {
      errors.push(
        `${rel} — ${lines} linhas excede o teto de ${PATTERNS_LINE_LIMIT}. ` +
          `Parta o módulo ou resuma; o índice é memory-bank/systemPatterns.md.`
      );
    }
  }
}

// 4. Definição de códigos TMP fora do catálogo canónico
const harnessFiles = listFiles(".", [".md", ".mdc"]);
let tmpFilesChecked = 0;

for (const file of harnessFiles) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (TMP_DEF_ALLOWED.some((p) => rel.startsWith(p))) continue;

  tmpFilesChecked++;
  fs.readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (!TMP_DEFINITION.test(line)) return;
      errors.push(
        `${rel}:${i + 1} — define código TMP fora de docs/business/. ` +
          `A tabela canónica é docs/business/auditoria.md: referencie os ` +
          `códigos em vez de repetir a numeração (ela já derivou uma vez).`
      );
    });
}

// Resultado
if (errors.length > 0) {
  console.error(`validate-docs: ${errors.length} violação(ões):\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(
  `validate-docs: OK — ${markdownFiles.length} ficheiros .md, ` +
    `${linksChecked} links, ${pointersChecked} ponteiros de código, ` +
    `${Object.keys(LINE_LIMITS).length} ficheiro(s) com teto fixo OK, ` +
    `patterns ≤${PATTERNS_LINE_LIMIT} linhas, ` +
    `${tmpFilesChecked} ficheiro(s) sem definição de código TMP.`
);
