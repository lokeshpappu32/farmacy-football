/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        pitch: "#07120d",
        turf: "#0d3b25",
        ember: "#e11d48",
        gold: "#f8c945",
        flood: "#f6f7fb",
      },
      boxShadow: {
        glow: "0 0 40px rgba(248, 201, 69, 0.24)",
        redglow: "0 0 45px rgba(225, 29, 72, 0.28)",
      },
      backgroundImage: {
        stadium:
          "radial-gradient(circle at 50% -10%, rgba(248,201,69,.32), transparent 32%), radial-gradient(circle at 0% 20%, rgba(225,29,72,.22), transparent 28%), linear-gradient(135deg,#050608 0%,#07120d 45%,#111827 100%)",
      },
    },
  },
  plugins: [],
};
