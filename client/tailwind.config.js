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

        shell: {
          light: '#0B121C',
          lightFrom: '#36404A',
          lightVia: '#293440',
          lightTo: '#07101E',
          dark: '#061A3A',
          darkFrom: '#0B2A5B',
          darkVia: '#061A3A',
          darkTo: '#020617',
          onLight: '#FFFFFF',
          onDark: '#EAF6FF',
          mutedLight: 'rgba(255,255,255,0.78)',
          mutedDark: 'rgba(234,246,255,0.78)',
          hover: {
            light: '#343B44',
            dark: '#0B2A5B',
          },
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
        shellLight: '0 16px 38px rgba(2,6,23,0.34), inset 0 1px 0 rgba(255,255,255,0.14)',
        shellDark: '0 16px 40px rgba(2,6,23,0.55)',
      },

      backgroundImage: {
        'shell-light': 'linear-gradient(135deg, #36404A 0%, #293440 38%, #172538 68%, #07101E 100%)',
        'shell-dark': 'linear-gradient(135deg, #0B2A5B 0%, #061A3A 52%, #020617 100%)',
        'shell-light-shine': 'radial-gradient(circle at 14% -20%, rgba(148,163,184,0.20), transparent 38%), radial-gradient(circle at 88% 115%, rgba(30,64,175,0.14), transparent 34%), linear-gradient(135deg, #36404A 0%, #293440 38%, #172538 68%, #07101E 100%)',
        'shell-dark-shine': 'radial-gradient(circle at 12% 0%, rgba(125,211,252,0.24), transparent 30%), linear-gradient(135deg, #0B2A5B 0%, #061A3A 52%, #020617 100%)',
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
