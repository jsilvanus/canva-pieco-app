import { defineConfig } from "vite";

// One JavaScript file (CSS inlined, no chunks, no html) for the Canva app upload.
export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist-js",
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: "src/canva-entry.mjs",
      formats: ["es"],
      fileName: () => "canva-pieco-app.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
