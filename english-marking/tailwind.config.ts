import type { Config } from "tailwindcss";

const v = (name: string) => `oklch(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: v("paper"),
        surface: v("surface"),
        sunk: v("sunk"),
        line: v("line"),
        ink: v("ink"),
        muted: v("muted"),
        rubric: v("rubric"),
        "rubric-ink": v("rubric-ink"),
        "rubric-wash": v("rubric-wash"),
        good: v("good"),
        "good-wash": v("good-wash"),
        warn: v("warn"),
        "warn-wash": v("warn-wash"),
        bad: v("bad"),
        "bad-wash": v("bad-wash"),
      },
      fontFamily: {
        sans: ['"Schibsted Grotesk"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        initial: ['"UnifrakturMaguntia"', "serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.875rem", { lineHeight: "1.35rem" }],
        base: ["1rem", { lineHeight: "1.55rem" }],
        lg: ["1.2rem", { lineHeight: "1.7rem" }],
        xl: ["1.44rem", { lineHeight: "1.9rem" }],
        "2xl": ["1.728rem", { lineHeight: "2.1rem" }],
        "3xl": ["2.2rem", { lineHeight: "2.5rem" }],
      },
      borderRadius: { DEFAULT: "6px", lg: "10px" },
      transitionTimingFunction: { out: "cubic-bezier(0.25, 1, 0.5, 1)" },
    },
  },
  plugins: [],
} satisfies Config;
