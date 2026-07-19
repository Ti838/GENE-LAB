/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.html",
    "./js/**/*.js",
    "./components/**/*.js"
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1728px',
        '4xl': '1920px',
        'uw': '2560px',
      },
      colors: {
        cyan: 'var(--cyan)',
        teal: { DEFAULT: 'var(--teal)', 400: 'var(--teal)' },
        violet: { DEFAULT: 'var(--violet)', 400: 'var(--violet)', 500: 'var(--violet)' },
        lime: 'var(--lime)',
        coral: 'var(--coral)',
        ink: 'var(--ink)',
        slate: { 300: 'var(--text-muted)', 400: 'var(--text-muted)', 500: 'var(--text-faint)', 800: '#1e293b' }
      }
    },
  },
  plugins: [],
}
