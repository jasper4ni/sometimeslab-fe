// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  srcDir: "src/",
  app: {
    pageTransition: { name: "page", mode: "out-in" },
  },
  css: ["~/assets/styles/main.scss"],
  modules: ["@nuxt/ui", "@pinia/nuxt"],
});
