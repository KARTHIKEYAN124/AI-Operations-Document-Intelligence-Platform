import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101318",
        muted: "#667085",
        line: "#d9e1e8",
        panel: "#ffffff",
        canvas: "#f6f9fb",
        teal: "#087f83",
        amber: "#d89000"
      },
      boxShadow: {
        panel: "0 16px 36px rgba(16, 24, 40, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
