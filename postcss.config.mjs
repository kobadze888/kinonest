/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // ეს არის სწორი პლაგინი Tailwind v4-სთვის
    '@tailwindcss/postcss': {},
    // Autoprefixer აღარ არის საჭირო, რადგან ის ავტომატურად შედის
  },
};

export default config;