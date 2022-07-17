import { defineConfig, loadEnv } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import proxy from "vite-plugin-http2-proxy";

export default defineConfig(({ mode }) => {
  const { VITE_ACCESS_TOKEN } = loadEnv(mode, process.cwd());

  return {
    server: {
      https: true,
    },
    plugins: [
      basicSsl(),
      proxy({
        "^/api/": {
          target: "https://gorest.co.in/public/v2/",
          rewrite: (url) => url.replace(/^\/api\//, ""),
          headers: {
            Authorization: `Bearer ${VITE_ACCESS_TOKEN}`,
          },
        },
      }),
    ],
  };
});
