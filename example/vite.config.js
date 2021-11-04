import proxy from "vite-plugin-http2-proxy";

export default {
  server: {
    https: true,
  },
  plugins: [
    proxy({
      "^/api/": {
        target: "https://gorest.co.in/public/v1/",
        rewrite: (url) => url.replace(/^\/api\//, ""),
      },
    }),
  ],
};
