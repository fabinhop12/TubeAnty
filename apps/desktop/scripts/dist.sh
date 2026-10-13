#!/usr/bin/env bash
# electron-builder so consegue empacotar arquivos "dentro" de apps/desktop/.
# Como este e um monorepo com npm workspaces, node_modules fica hospedado na
# raiz (hoisted) e symlinks de pacotes do workspace tambem apontam para fora
# deste diretorio. Este script materializa uma copia local e TEMPORARIA de
# node_modules (com symlinks resolvidos) so para o empacotamento, e remove
# essa copia ao final — ela nunca deve ficar parada aqui fora de um build,
# senao passa a mascarar o node_modules hoisted real durante `npm run dev`.
#
# node_modules/@tubeanty/shared e excluido da copia: ja vai inlinado no
# bundle (nao e mais require()ado em runtime, ver electron.vite.config.ts).
# node_modules/tubeanty-desktop e excluido porque e um symlink deste
# proprio pacote de volta pra si mesmo (-> apps/desktop) — copiar isso
# entraria em recursao infinita. Os demais symlinks (ex: node_modules/.bin/*)
# sao preservados como symlinks, nao dereferenciados: seus alvos sao
# relativos e continuam validos na copia, e dereferenciar quebraria os
# requires relativos desses shims (ex: electron-builder).
set -euo pipefail
cd "$(dirname "$0")/.."

npx electron-vite build

if [ -e node_modules ]; then
  echo "Removendo node_modules local inesperado antes de recriar a copia..." >&2
  rm -rf node_modules
fi

mkdir -p node_modules
tar -C ../../node_modules --exclude='@tubeanty' --exclude='tubeanty-desktop' -cf - . | tar -C node_modules -xf -

cleanup() {
  rm -rf node_modules
}
trap cleanup EXIT

npx electron-builder "$@"
