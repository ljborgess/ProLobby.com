#!/usr/bin/env bash
# Valida links markdown cruzados em docs/ e cobertura do índice.
# Exit 0 = ok. Exit 1 = achou problema (saída lista o que quebrou).
set -u
cd "$(dirname "$0")/.." || exit 1

fail=0
report() { fail=1; echo "$1"; }

# 1) todo link relativo ](algo.md) precisa resolver pra um arquivo real
while IFS= read -r -d '' f; do
  dir=$(dirname "$f")
  while IFS= read -r link; do
    # ignora link absoluto (http, /, #)
    case "$link" in
      http*|/*|\#*) continue ;;
    esac
    target=$(readlink -f "$dir/$link" 2>/dev/null || realpath -m "$dir/$link" 2>/dev/null)
    if [ -z "$target" ] || [ ! -f "$target" ]; then
      report "LINK QUEBRADO: $f -> $link"
    fi
  done < <(grep -oE '\]\([^)]*\.md\)' "$f" | sed -E 's/^\]\((.*)\)$/\1/')
done < <(find docs -name '*.md' -print0)

# 2) todo arquivo .md do dossiê precisa estar referenciado no README.md do domínio
check_index_coverage() {
  local base_dir="$1" index_file="$2"
  while IFS= read -r -d '' f; do
    base=$(basename "$f")
    [ "$base" = "$(basename "$index_file")" ] && continue
    if ! grep -qF "$base" "$index_file" 2>/dev/null; then
      report "ORFAO (fora do índice): $f não referenciado em $index_file"
    fi
  done < <(find "$base_dir" -name '*.md' -print0)
}

check_index_coverage "docs/produto" "docs/produto/README.md"
check_index_coverage "docs/discord" "docs/discord/README.md"
check_index_coverage "docs/negocio" "docs/negocio/README.md"

if [ "$fail" -eq 0 ]; then
  echo "docs OK: links e índice consistentes."
fi
exit $fail
