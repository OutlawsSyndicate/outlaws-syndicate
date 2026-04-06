/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        outlaw: {
          bg: "#0d0d0d",
          panel: "#1a1a1a",
          border: "#2a2a2a",
          orange: "#f26419",
          "orange-dim": "#c44e10",
        },
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', "monospace"],
        display: ['"Orbitron"', "sans-serif"],
      },
      animation: {
        "scan": "scan 4s linear infinite",
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "flicker": "flicker 3s linear infinite",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 5px #f26419, 0 0 10px rgba(242,100,25,0.3)" },
          "50%": { boxShadow: "0 0 20px #f26419, 0 0 40px rgba(242,100,25,0.4)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.3" },
          "94%": { opacity: "1" },
          "96%": { opacity: "0.5" },
          "97%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
