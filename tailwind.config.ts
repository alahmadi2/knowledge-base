import type { Config } from "tailwindcss";

// هوية الماجدية المعتمدة 2025
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2A3335", // الفحمي الداكن
          soft: "#39464a",
          accent: "#A5ADD1", // البنفسجي الفاتح
          "accent-strong": "#8B94C4",
          muted: "#767E9B",
        },
        surface: {
          page: "#F6F7F9",
          card: "#FFFFFF",
          line: "#E5E8ED",
        },
        ink: {
          DEFAULT: "#1F2426",
          soft: "#5A6470",
          faint: "#8B94A0",
        },
        state: {
          success: "#3E7D5B",
          "success-bg": "#EAF4EF",
          warning: "#9A6B1F",
          "warning-bg": "#FBF3E4",
          danger: "#A94446",
          "danger-bg": "#F9ECEC",
          info: "#4A5A8A",
          "info-bg": "#EEF0F8",
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,36,38,.05), 0 1px 3px rgba(31,36,38,.06)",
        pop: "0 8px 30px rgba(31,36,38,.14)",
      },
    },
  },
  plugins: [],
};
export default config;
