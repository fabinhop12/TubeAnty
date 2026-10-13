#!/usr/bin/env bash
# electron-builder so consegue empacotar arquivos "dentro" de apps/desktop/.
# Como este e um monorepo com npm workspaces, node_modules fica hospedado na
# raiz (hoisted) e symlinks de pacotes do workspace tambem apontam para fora
# deste diretorio. Este script materializa uma copia local e TEMPORARIA de
# node_modules (com symlinks resolvidos) so para o empacotamento, e remove
# essa copia ao final — ela nunca deve ficar parada aqui fora de um build,
# senao passa a mascarar o node_modules hoisted real durante `npm run dev`.
#
# O escopo @tubeanty e excluido da copia: @tubeanty/shared ja vai inlinado
# no bundle (nao e mais require()ado em runtime, ver electron.vite.config.ts)
# e @tubeanty/desktop e um symlink deste proprio pacote de volta pra si
# mesmo (node_modules/@tubeanty/desktop -> apps/desktop) — copiar com
# dereference entraria em recursao infinita.
set -euo pipefail
cd "$(dirname "$0")/.."

npx electron-vite build

if [ -e node_modules ]; then
  echo "Removendo node_modules local inesperado antes de recriar a copia..." >&2
  rm -rf node_modules
fi

mkdir -p node_modules
tar -C ../../node_modules --exclude='@tubeanty' -chf - . | tar -C node_modules -xf -

cleanup() {
  rm -rf node_modules
}
trap cleanup EXIT

npx electron-builder "$@"
