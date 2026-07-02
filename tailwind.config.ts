import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        wod: {
          black: "#050506",
          panel: "#111318",
          panel2: "#181b21",
          line: "#303541",
          gold: "#f4c430",
          text: "#f8f3e6",
          muted: "#aaa392",
          green: "#42d392",
          red: "#ff6565",
          blue: "#69b9ff"
        }
      },
      boxShadow: {
        glow: "0 24px 80px rgba(0,0,0,.38)"
      }
    }
  },
  plugins: []
};

export default config;
