#!/usr/bin/env node
/**
 * Valida design tokens CeialMilk:
 * 1. Paridade entre globals.css e tokens.json (valores-chave)
 * 2. Ausência de cores literais Tailwind fora de landing/ e dev-studio/
 *
 * Uso: node scripts/validate-design-tokens.mjs
 * Exit 0 = OK; exit 1 = falhas
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRONTEND_ROOT = join(__dirname, '..');
const GLOBALS_PATH = join(FRONTEND_ROOT, 'src/app/globals.css');
const TOKENS_PATH = join(FRONTEND_ROOT, 'design-tokens/tokens.json');
const SRC_ROOT = join(FRONTEND_ROOT, 'src');

const ALLOWED_LITERAL_PREFIXES = [
  'components/landing/',
  'components/dev-studio/',
];

/** Tailwind palette literals — forbidden outside exceptions */
const LITERAL_COLOR_RE =
  /\b(?:text|bg|border|ring|from|to|via|fill|stroke|divide|outline|decoration)-(?:amber|green|blue|red|emerald|lime|teal|cyan|sky|indigo|violet|purple|pink|rose|orange|yellow)-[\w/[\].%-]+/g;

const errors = [];

function fail(message) {
  errors.push(message);
}

function parseCssBlocks(css) {
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/s);
  const darkMatch = css.match(/\.dark\s*\{([^}]+)\}/s);
  return {
    light: parseVars(rootMatch?.[1] ?? ''),
    dark: parseVars(darkMatch?.[1] ?? ''),
  };
}

function parseVars(block) {
  const vars = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*(--[\w-]+):\s*(.+?);?\s*$/);
    if (!m) continue;
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

/** "152 42% 36%" → [152, 0.42, 0.36] */
function hslTripletToComponents(triplet) {
  const parts = triplet.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!parts) return null;
  return [
    Number(parts[1]),
    Number(parts[2]) / 100,
    Number(parts[3]) / 100,
  ];
}

function componentsEqual(a, b, tolerance = 0.001) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => Math.abs(v - b[i]) < tolerance);
}

function getJsonHsl(obj, mode) {
  const node = obj[mode] ?? obj;
  const val = node?.$value;
  if (!val?.components) return null;
  return val.components;
}

function compareHsl(label, cssLight, cssDark, jsonNode) {
  const jsonLight = getJsonHsl(jsonNode, 'light');
  const jsonDark = getJsonHsl(jsonNode, 'dark');

  const cssLightComp = hslTripletToComponents(cssLight);
  const cssDarkComp = hslTripletToComponents(cssDark);

  if (jsonLight && cssLightComp && !componentsEqual(cssLightComp, jsonLight)) {
    fail(
      `[paridade] ${label} light: CSS "${cssLight}" ≠ JSON [${jsonLight.join(', ')}]`,
    );
  }
  if (jsonDark && cssDarkComp && !componentsEqual(cssDarkComp, jsonDark)) {
    fail(
      `[paridade] ${label} dark: CSS "${cssDark}" ≠ JSON [${jsonDark.join(', ')}]`,
    );
  }
}

function validateCssJsonParity() {
  const css = readFileSync(GLOBALS_PATH, 'utf8');
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8'));
  const { light, dark } = parseCssBlocks(css);

  const checks = [
    ['primary', '--primary', tokens.color.primitive.primary],
    ['destructive', '--destructive', tokens.color.primitive.destructive],
    ['background', '--background', tokens.color.primitive.background],
    [
      'feedback.success',
      '--color-feedback-success',
      tokens.color.feedback.success,
    ],
    [
      'feedback.warning',
      '--color-feedback-warning',
      tokens.color.feedback.warning,
    ],
    ['feedback.info', '--color-feedback-info', tokens.color.feedback.info],
  ];

  for (const [label, cssVar, jsonNode] of checks) {
    compareHsl(label, light[cssVar], dark[cssVar], jsonNode);
  }

  const fontChecks = [
    ['typography.fontSize.sm', '--font-size-sm', tokens.typography.fontSize.sm],
    [
      'typography.fontSize.base',
      '--font-size-base',
      tokens.typography.fontSize.base,
    ],
  ];

  for (const [label, cssVar, jsonNode] of fontChecks) {
    const cssVal = light[cssVar];
    const jsonVal = jsonNode?.$value;
    if (cssVal && jsonVal && cssVal !== jsonVal) {
      fail(`[paridade] ${label}: CSS "${cssVal}" ≠ JSON "${jsonVal}"`);
    }
  }

  const bpChecks = [
    ['breakpoint.sm', tokens.breakpoint.sm],
    ['breakpoint.md', tokens.breakpoint.md],
    ['breakpoint.lg', tokens.breakpoint.lg],
    ['breakpoint.xl', tokens.breakpoint.xl],
    ['breakpoint.2xl', tokens.breakpoint['2xl']],
  ];

  for (const [label, jsonNode] of bpChecks) {
    const jsonVal = jsonNode?.$value;
    if (!jsonVal) {
      fail(`[paridade] ${label}: ausente em tokens.json`);
    }
  }

  const radiusCss = light['--radius'];
  const radiusJson = tokens.borderRadius.lg?.$value;
  if (radiusCss && radiusJson && radiusCss !== radiusJson) {
    fail(
      `[paridade] borderRadius.lg: CSS --radius "${radiusCss}" ≠ JSON "${radiusJson}"`,
    );
  }

  const expectedSpacing = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24'];
  for (const key of expectedSpacing) {
    if (!tokens.spacing[key]) {
      fail(`[paridade] spacing.${key}: ausente em tokens.json`);
    }
  }
}

function walkSourceFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkSourceFiles(full, acc);
    } else if (/\.(tsx|jsx|ts|js)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function validateNoLiteralColors() {
  const files = walkSourceFiles(SRC_ROOT);

  for (const file of files) {
    const rel = relative(SRC_ROOT, file).replace(/\\/g, '/');
    if (ALLOWED_LITERAL_PREFIXES.some((p) => rel.startsWith(p))) {
      continue;
    }

    const content = readFileSync(file, 'utf8');
    const matches = content.match(LITERAL_COLOR_RE);
    if (matches) {
      const unique = [...new Set(matches)];
      fail(
        `[cores literais] src/${rel}: use tokens feedback-* — encontrado: ${unique.join(', ')}`,
      );
    }
  }
}

validateCssJsonParity();
validateNoLiteralColors();

if (errors.length > 0) {
  console.error('validate-design-tokens: falhou\n');
  for (const e of errors) {
    console.error(`  • ${e}`);
  }
  console.error(`\n${errors.length} problema(s). Ver docs/design-system/tokens.md`);
  process.exit(1);
}

console.log('validate-design-tokens: OK (paridade CSS↔JSON + sem cores literais proibidas)');
