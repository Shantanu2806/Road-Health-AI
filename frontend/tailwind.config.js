/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          low: "#10b981",    // Emerald / Green
          medium: "#f59e0b", // Amber
          high: "#ef4444",   // Red
        },
        condition: {
          good: "#10b981",    // Green (81-100)
          fair: "#f59e0b",    // Amber (61-80)
          poor: "#f97316",    // Orange (31-60)
          critical: "#ef4444" // Crimson (0-30)
        },
        damage: {
          d00: "#3b82f6", // Longitudinal Crack (Blue)
          d10: "#f59e0b", // Transverse Crack (Amber)
          d20: "#a855f7", // Alligator Crack (Purple)
          d40: "#ef4444", // Pothole (Red)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
