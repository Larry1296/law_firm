/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        background: {
          light: '#F3F0EA',
          dark: '#0B1220',
        },

        surface: {
          light: '#FFFDF8',
          dark: '#111B2E',
        },

        border: {
          light: '#D8D2C8',
          dark: '#1F2A44',
        },

        // Text
        text: {
          primary: {
            light: '#1F2933',
            dark: '#E5E7EB',
          },
          muted: {
            light: '#5F6673',
            dark: '#94A3B8',
          },
        },

        // Brand colors
        brand: {
          primary: '#12385A',
          accent: '#B88A2B',
        },

        // Status colors
        success: '#0F8F67',
        warning: '#B87503',
        error: '#C2413A',
        info: '#2563EB',
      },

      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui'],
        display: ['Poppins', 'ui-sans-serif'],
      },

      boxShadow: {
        soft: '0 2px 10px rgba(31,41,51,0.08)',
        medium: '0 8px 22px rgba(31,41,51,0.12)',
        strong: '0 14px 34px rgba(31,41,51,0.18)',
      },

      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },

      keyframes: {
        fadeIn: {
          '0%': {
            opacity: 0,
            transform: 'translateY(8px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },

        slideIn: {
          '0%': {
            opacity: 0,
            transform: 'translateX(-10px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
      },

      animation: {
        fadeIn: 'fadeIn 0.25s ease-out',
        slideIn: 'slideIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
