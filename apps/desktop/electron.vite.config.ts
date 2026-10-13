import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const sharedSrc = resolve(__dirname, "../../packages/shared/src/index.ts");

// @tubeanty/shared e um pacote de workspace symlinkado (fora de apps/desktop);
// se ficar como require() externo, o electron-builder nao consegue empacotar
// o symlink no asar. Por isso ele e excluido da externalizacao e inlinado no
// bundle via o alias abaixo.
const externalizeOptions = { exclude: ["@tubeanty/shared"] };

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(externalizeOptions)],
    resolve: {
      alias: {
        "@tubeanty/shared": sharedSrc,
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin(externalizeOptions)],
    resolve: {
      alias: {
        "@tubeanty/shared": sharedSrc,
      },
    },
  },
  renderer: {
    root: "src/renderer",
    resolve: {
      alias: {
        "@tubeanty/shared": sharedSrc,
        "@": resolve(__dirname, "src/renderer/src"),
      },
    },
    plugins: [react()],
  },
});
