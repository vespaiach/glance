import path from "node:path";
import babel from "@rolldown/plugin-babel";
import styleXPlugin from "@stylexjs/babel-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { version } from "./package.json";

const root = import.meta.dirname;

process.env.TZ = "Asia/Kolkata";

export default defineConfig({
  plugins: [
    react(),
    babel({
      include: /\/src\/.*\.tsx?$/,
      parserOpts: { plugins: ["typescript", "jsx"] },
      plugins: [
        [
          styleXPlugin,
          {
            dev: false,
            test: true,
            runtimeInjection: false,
            aliases: { "@/*": [path.join(root, "src", "*")] },
            unstable_moduleResolution: { type: "commonJS", rootDir: root },
          },
        ],
      ],
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": path.join(root, "node_modules/server-only/empty.js") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    env: { NEXT_PUBLIC_APP_VERSION: version },
    projects: [{ extends: true, test: { name: "app", include: ["src/**/*.test.{ts,tsx}"] } }],
  },
});
