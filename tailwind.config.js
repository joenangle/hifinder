/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '744px', // iPad Mini width
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Map design system CSS variables to Tailwind color utilities
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)',
        'tertiary': 'var(--text-tertiary)',
        'accent': 'var(--accent-primary)',
        'success': 'var(--success)',
        'warning': 'var(--warning)', 
        'error': 'var(--error)',
        'surface': 'var(--background-primary)',
        'surface-secondary': 'var(--background-secondary)',
        'surface-tertiary': 'var(--background-tertiary)',
      },
      backgroundColor: {
        'primary': 'var(--background-primary)',
        'secondary': 'var(--background-secondary)',
        'tertiary': 'var(--background-tertiary)',
        'accent': 'var(--accent-primary)',
        'surface': 'var(--background-primary)',
      },
      textColor: {
        'primary': 'var(--text-primary)',
        'secondary': 'var(--text-secondary)', 
        'tertiary': 'var(--text-tertiary)',
        'accent': 'var(--accent-primary)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'error': 'var(--error)',
      },
    },
  },
  plugins: [],
}