/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                'playfair': ['Playfair Display', 'serif'],
                'manrope': ['Manrope', 'sans-serif'],
                'inter': ['Inter', 'sans-serif'],
                'lora': ['Lora', 'serif'],
                'mono': ['JetBrains Mono', 'monospace'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "#111111",
                    foreground: "#ffffff",
                    hover: "#2B2B2B",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "#8C8273",
                    foreground: "#ffffff",
                    hover: "#7A7163",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                stele: {
                    bg: "#F8F8F6",
                    surface: "#FFFFFF",
                    primary: "#111111",
                    secondary: "#E5E5E0",
                    accent: "#8C8273",
                    'accent-hover': "#7A7163",
                    muted: "#6E6D68",
                    border: "#E5E5E0",
                    success: "#2E4F3B",
                    error: "#6B2B2B",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    from: { opacity: "0", transform: "translateY(10px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in-slow": {
                    from: { opacity: "0", transform: "translateY(20px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.6s ease-out forwards",
                "fade-in-slow": "fade-in-slow 1s ease-out forwards",
            },
            boxShadow: {
                'ambient': '0 4px 40px rgba(0,0,0,0.03)',
                'hover-stele': '0 10px 60px rgba(0,0,0,0.06)',
                'sharp': '4px 4px 0px rgba(17,17,17,1)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
