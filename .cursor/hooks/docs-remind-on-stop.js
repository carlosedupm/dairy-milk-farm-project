#!/usr/bin/env node
/**
 * stop: se houve edit sensível na sessão, followup_message (fail-open).
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const FLAG = path.join(os.tmpdir(), "ceialmilk-agent-docs-remind");

try {
  // drain stdin
  fs.readFileSync(0, "utf8");
} catch {
  /* ignore */
}

if (fs.existsSync(FLAG)) {
  try {
    fs.unlinkSync(FLAG);
  } catch {
    /* ignore */
  }
  process.stdout.write(
    JSON.stringify({
      followup_message:
        "Caminhos de domínio/código foram editados nesta sessão. Antes de encerrar: skill atualizar-documentacao (se comportamento ou padrão mudou) e comando /validar (gates de merge).",
    }) + "\n"
  );
} else {
  process.stdout.write("{}\n");
}
process.exit(0);
