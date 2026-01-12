/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1cc588',
                    dark: '#16a372',
                    light: '#d1fae5',
                },
                secondary: '#0ea5e9',
                medical: {
                    bg: '#f8fafc',
                    text: '#1e293b',
                    muted: '#64748b',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
            }
        },
    },
    plugins: [],
}
