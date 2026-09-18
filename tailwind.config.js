/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        saffron: {
          50: '#FDF8F3',
          100: '#FBEEDE',
          200: '#F7D8BC',
          300: '#F0BC91',
          400: '#E4985F',
          500: '#C86314', // Warm, grounded saffron / terracotta orange
          600: '#B0530D',
          700: '#914209',
          800: '#75350A',
          900: '#5F2C0B',
        },
        cream: {
          50: '#FDFBF9',
          100: '#FAF7F2',
          200: '#F4EFEA',
          300: '#ECE4DC',
          400: '#DDD2C6',
        },
        temple: {
          900: '#2A2421', // Deep brown / charcoal
          800: '#3D3430',
          700: '#524641',
          600: '#6C5E57',
          500: '#897A73',
          400: '#AA9B94',
          300: '#D0C3BC',
          200: '#E6DED8',
          100: '#F3EFEA',
        },
        gold: {
          50: '#FCF9F2',
          100: '#F8F1E2',
          200: '#EEDDB9',
          300: '#E2C48B',
          400: '#D5A75B',
          500: '#C08B34',
          600: '#9F6F24',
        }
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(42, 36, 33, 0.04)',
        'soft-md': '0 4px 20px rgba(42, 36, 33, 0.06)',
        'soft-lg': '0 10px 30px rgba(42, 36, 33, 0.08)',
      }
    },
  },
  plugins: [],
}
