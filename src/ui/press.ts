import * as stylex from "@stylexjs/stylex";
import { motion } from "@/theme/tokens.stylex";

export const press = stylex.create({
  scale: {
    transform: {
      default: "none",
      ":active:not(:disabled)": `scale(${motion.pressScale})`,
    },
  },
  row: {
    transform: {
      default: "none",
      ":active:not(:disabled)": `scale(${motion.pressScaleRow})`,
    },
  },
});
