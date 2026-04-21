#!/usr/bin/env bash
# Restaura TC007 após generateCodeAndExecute (o gerador cloud costuma ignorar o envelope data.* do login).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/testsprite_tests/fixtures/TC007_post_api_v1_animais_creates_animal.canonical.py"
DST="$ROOT/testsprite_tests/TC007_post_api_v1_animais_creates_animal.py"
cp "$SRC" "$DST"
echo "OK: restaurado $DST a partir do fixture canónico."
