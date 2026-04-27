/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Forest Green — primary action / FBF brand action color.
        // Aliased as `brand` so legacy class names (bg-brand-600 etc.) keep working.
        brand: {
          50:  "#EAF4EC",
          100: "#C9E3CE",
          200: "#94C6A0",
          300: "#5DA770",
          400: "#2E8B4E",
          500: "#1F6E3D",
          600: "#155A30",
          700: "#0F4524",
          800: "#0A3119",
          900: "#062012",
        },
        green: {
          50:  "#EAF4EC",
          100: "#C9E3CE",
          200: "#94C6A0",
          300: "#5DA770",
          400: "#2E8B4E",
          500: "#1F6E3D",
          600: "#155A30",
          700: "#0F4524",
          800: "#0A3119",
        },
        cream: {
          50:  "#FBF7EC",
          100: "#F6EFD9",
          200: "#EFE3B8",
          300: "#E5D28E",
        },
        gold: {
          300: "#F4CF45",
          400: "#E5B81F",
          500: "#C99B0E",
          600: "#9F7A06",
        },
        charcoal: {
          50:  "#F4F2EE",
          100: "#E6E3DC",
          200: "#C9C4B8",
          300: "#9C9689",
          400: "#6E6859",
          500: "#4A4538",
          600: "#2E2B22",
          700: "#1F1D17",
          800: "#14130E",
          900: "#0A0907",
        },
        // Lead-score tiers — warm orange (NOT pure red), forest green, gold, charcoal grey.
        tier: {
          "hot-bg":     "#FFE9D6",
          "hot-fg":     "#B23E0E",
          "hot-ring":   "#F4A36A",
          "good-bg":    "#EAF4EC",
          "good-fg":    "#0F4524",
          "good-ring":  "#94C6A0",
          "maybe-bg":   "#FBF1D2",
          "maybe-fg":   "#9F7A06",
          "maybe-ring": "#F4CF45",
          "weak-bg":    "#F4F2EE",
          "weak-fg":    "#6E6859",
          "weak-ring":  "#C9C4B8",
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Source Serif Pro', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      boxShadow: {
        xs:  "0 1px 2px rgba(20, 19, 14, 0.04)",
        sm:  "0 1px 3px rgba(20, 19, 14, 0.06), 0 1px 2px rgba(20, 19, 14, 0.04)",
        md:  "0 4px 12px -2px rgba(20, 19, 14, 0.08), 0 2px 4px rgba(20, 19, 14, 0.04)",
        lg:  "0 12px 28px -8px rgba(20, 19, 14, 0.16), 0 4px 8px rgba(20, 19, 14, 0.04)",
        pop: "0 18px 40px -12px rgba(31, 110, 61, 0.28)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.3, 0, 0, 1.1)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
