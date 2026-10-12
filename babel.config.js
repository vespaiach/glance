import path from "node:path";
import styleXPlugin from "@stylexjs/babel-plugin";

const root = import.meta.dirname;

export default {
  presets: ["next/babel"],
  plugins: [
    [
      styleXPlugin,
      {
        dev: process.env.NODE_ENV === "development",
        runtimeInjection: false,
        treeshakeCompensation: true,
        aliases: {
          "@/*": [path.join(root, "src", "*")],
        },
        unstable_moduleResolution: {
          type: "commonJS",
          rootDir: root,
        },
      },
    ],
  ],
};
