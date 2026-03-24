import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(240 10% 3.9%)",
        foreground: "hsl(0 0% 98%)",
        card: "hsl(240 10% 5.9%)",
        "card-foreground": "hsl(0 0% 98%)",
        popover: "hsl(240 10% 3.9%)",
        "popover-foreground": "hsl(0 0% 98%)",
        primary: "hsl(252 89% 67%)",
        "primary-foreground": "hsl(0 0% 100%)",
        secondary: "hsl(240 4% 16%)",
        "secondary-foreground": "hsl(0 0% 98%)",
        muted: "hsl(240 4% 16%)",
        "muted-foreground": "hsl(240 5% 64.9%)",
        accent: "hsl(252 89% 67% / 10%)",
        "accent-foreground": "hsl(252 89% 67%)",
        border: "hsl(240 4% 16%)",
        input: "hsl(240 4% 16%)",
        ring: "hsl(252 89% 67%)",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
