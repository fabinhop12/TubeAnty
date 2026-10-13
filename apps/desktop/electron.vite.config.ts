import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const sharedSrc = resolve(__dirname, "../../packages/shared/src/index.ts");

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        "@tubeanty/shared": sharedSrc,
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
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
