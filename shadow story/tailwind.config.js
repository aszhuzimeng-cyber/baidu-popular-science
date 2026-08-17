/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        "wood": "var(--shadow-card)",
        "inner-paper": "inset 0 0 0 1px var(--color-border-default), inset 0 8px 20px rgba(255,255,255,0.22)",
        "button": "var(--shadow-button)",
      },
      colors: {
        stage: {
          bg: "var(--color-bg-primary)",
          paper: "var(--color-bg-warm-light)",
          wood: "var(--color-text-primary)",
          woodDark: "var(--color-text-secondary)",
          gold: "var(--color-theme-secondary)",
          red: "var(--color-theme-primary)"
        }
      },
      borderRadius: {
        stage: "var(--radius-card-main)"
      },
      fontFamily: {
        display: ["var(--font-family-base)"],
        body: ["var(--font-family-base)"],
        sans: ["var(--font-family-base)"],
      }
    },
  },
  plugins: [],
};
