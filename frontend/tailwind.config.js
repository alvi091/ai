/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Ayymus design system — dark AI-native palette
        primary: {
          DEFAULT: '#0F766E', // deep teal — primary accent
          hover: '#14B8A6',
          pressed: '#115E59',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        accent: {
          DEFAULT: '#14B8A6',
          hover: '#2dd4bf',
          pressed: '#0d9488',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Neutral dark surfaces
        surface: {
          50: '#0A0A0B', // background
          100: '#121316', // surface
          200: '#1A1C21', // elevated
          300: '#2A2D35', // border
          400: '#3A3F47',
          500: '#6E7480', // muted
          600: '#8A909C',
          700: '#A1A7B3', // secondary
          800: '#D7DBE3', // body
          900: '#FFFFFF', // heading
        },
        success: {
          DEFAULT: '#22C55E',
          hover: '#4ADE80',
          pressed: '#16A34A',
        },
        warning: {
          DEFAULT: '#FACC15',
          hover: '#FDE047',
          pressed: '#EAB308',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#F87171',
          pressed: '#DC2626',
        },
        // ---- Legacy token aliases (normalized onto the system palette) ----
        canvas: '#0A0A0B',
        elevated: '#1A1C21',
        line: '#2A2D35',
        body: '#D7DBE3',
        mute: '#6E7480',
        heading: '#FFFFFF',
        soft: '#A1A7B3',
        base: '#0A0A0B',
        panel: '#121316',
        'line-strong': '#3A3F47',
        'surface-elevated': '#1A1C21',
        ink: {
          DEFAULT: '#D7DBE3',
          100: '#D7DBE3',
          200: '#C3C9D4',
          300: '#A1A7B3',
          400: '#8A909C',
          500: '#6E7480',
          muted: '#6E7480',
          secondary: '#A1A7B3',
        },
        'primary-light': '#5EEAD4',
        'primary-dark': '#115E59',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['Inter', 'system-ui', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['88px', { lineHeight: '0.98', letterSpacing: '-0.045em' }],
        display: ['64px', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'display-sm': ['48px', { lineHeight: '1.05', letterSpacing: '-0.035em' }],
        'hero': ['36px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'title': ['28px', { lineHeight: '1.15', letterSpacing: '-0.025em' }],
        'subtitle': ['20px', { lineHeight: '1.3', letterSpacing: '-0.015em' }],
        'body': ['16px', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'caption': ['14px', { lineHeight: '1.5', letterSpacing: '-0.005em' }],
        'micro': ['12px', { lineHeight: '1.4', letterSpacing: '0.01em' }],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.5)',
        'lift': '0 2px 4px rgba(0,0,0,0.3), 0 20px 48px -20px rgba(0,0,0,0.6)',
        'glow': '0 0 0 1px rgba(20,184,166,0.2), 0 12px 48px -12px rgba(15,118,110,0.5)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(-1deg)' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.9)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 1.1s step-end infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        scan: 'scan 1.8s ease-in-out infinite',
      },
      letterSpacing: {
        'tighter': '-0.04em',
      },
    },
  },
  plugins: [],
};
