#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Blindagem: valida a sintaxe de TODO o JavaScript do site antes
# de qualquer commit. Checa os arquivos js/*.js e também os
# <script> escritos direto dentro dos .html (admin, etc.).
# Se achar QUALQUER erro de sintaxe, bloqueia o commit.
# Usa o jsc (JavaScriptCore), que já vem no macOS; cai pro node se houver.
# ─────────────────────────────────────────────────────────────
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSC="/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
FALHOU=0

checar () { # $1 = arquivo js   $2 = rótulo amigável
  local f="$1" rotulo="$2" saida
  if [ -n "${NODE_OK:-}" ]; then
    if ! node --check "$f" 2>/tmp/_nodeerr; then
      echo "❌ ERRO DE SINTAXE em $rotulo:"; sed 's/^/   /' /tmp/_nodeerr | head -3; FALHOU=1
    fi
    return
  fi
  saida="$("$JSC" "$f" 2>&1)"
  if echo "$saida" | grep -q "SyntaxError"; then
    echo "❌ ERRO DE SINTAXE em $rotulo:"
    echo "$saida" | grep "SyntaxError" | head -1 | sed 's/^/   /'
    FALHOU=1
  fi
}

if command -v node >/dev/null 2>&1; then NODE_OK=1
elif [ ! -x "$JSC" ]; then
  echo "⚠️  Sem jsc nem node — não deu pra validar a sintaxe. Pulando checagem."
  exit 0
fi

# 1) Arquivos .js
for f in "$ROOT"/js/*.js; do
  [ -f "$f" ] && checar "$f" "$(basename "$f")"
done

# 2) <script> inline dos .html (sem src=)
TMP="$(mktemp -d)"
for html in "$ROOT"/*.html; do
  [ -f "$html" ] || continue
  python3 - "$html" "$TMP" <<'PY'
import sys, re, os
html, tmp = sys.argv[1], sys.argv[2]
src = open(html, encoding='utf-8').read()
base = os.path.basename(html)
for i, m in enumerate(re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', src, re.S | re.I)):
    code = m.group(1).strip()
    if not code:
        continue
    p = os.path.join(tmp, f'{base}.{i}.js')
    open(p, 'w', encoding='utf-8').write(code)
    print(p)
PY
done > "$TMP/lista.txt"
while IFS= read -r p; do
  [ -f "$p" ] && checar "$p" "inline em $(basename "${p%.*.js}")"
done < "$TMP/lista.txt"
rm -rf "$TMP"

if [ "$FALHOU" = "1" ]; then
  echo ""
  echo "🚫 Commit BLOQUEADO: corrija o(s) erro(s) de sintaxe acima antes de publicar."
  exit 1
fi
echo "✅ Sintaxe validada — todo o JavaScript está OK."
exit 0
