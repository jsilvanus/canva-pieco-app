import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// One classic-script JavaScript file (IIFE, CSS inlined, no chunks, no html) for the Canva app upload.
export default defineConfig({
  // babel-plugin-formatjs gives each message the content-hash id Canva's translation tooling expects.
  plugins: [react({ babel: { plugins: [["formatjs", { idInterpolationPattern: "[sha512:contenthash:base64:6]", ast: true }]] } })],
  // The Canva kits read process.env["NODE_ENV"], which Vite does not replace on its own in library builds.
  define: { "process.env": JSON.stringify({ NODE_ENV: "production" }) },
  build: {
    target: "es2022",
    outDir: "dist-js",
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: "src/canva-entry.mjs",
      formats: ["iife"],
      name: "CanvaPiecoApp",
      fileName: () => "canva-pieco-app.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
