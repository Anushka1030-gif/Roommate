/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FBF5EC',
        page: '#FBF5EC',
        surface: '#FFFFFF',
        'surface-border': '#EADFCF',
        beige: {
          DEFAULT: '#F3E9DA',
          50: '#FBF5EC',
          100: '#F7EFE4',
          200: '#F3E9DA',
          300: '#EADFCF',
          400: '#DECDBD',
        },
        'peach-soft': '#FFE3D1',
        peach: {
          DEFAULT: '#F4B393',
          soft: '#FFE3D1',
          accent: '#D9825B',
          deep: '#AC5429',
          deeper: '#8E3E19',
        },
        'peach-deep': '#AC5429',
        'peach-deeper': '#8E3E19',
        'text-primary': '#3D2C24',
        'text-secondary': '#7A6458',
        success: '#5E9C76',
        warning: '#D9A441',
        error: '#C75146',
        brand: {
          success: '#5E9C76',
          warning: '#D9A441',
          error: '#C75146',
        },
      },
    },
  },
  plugins: [],
};
