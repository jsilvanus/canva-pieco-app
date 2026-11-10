import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // babel-plugin-formatjs gives each message the content-hash id Canva's translation tooling expects.
  plugins: [react({ babel: { plugins: [["formatjs", { idInterpolationPattern: "[sha512:contenthash:base64:6]", ast: true }]] } })],
  // The Canva kits read process.env["NODE_ENV"], which Vite does not replace on its own in library builds.
  define: { "process.env": JSON.stringify({ NODE_ENV: "development" }) },
  base: "./",
  server: {
    port: 3100,
    host: "0.0.0.0",
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
  },
});
