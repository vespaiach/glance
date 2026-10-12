import path from "node:path";
import babel from "@rolldown/plugin-babel";
import styleXPlugin from "@stylexjs/babel-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

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
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
});
