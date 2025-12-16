/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/templates/**/*.ts",
    "./public/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Ensure dynamic classes aren't purged
    'bg-green-100',
    'bg-green-400',
    'bg-green-500',
    'bg-green-600',
    'text-green-600',
    'hidden',
  ],
};
