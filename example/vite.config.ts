import { defineConfig, loadEnv } from "vite";
import proxy from "vite-plugin-http2-proxy";
import selfsigned from "selfsigned";

export default defineConfig(({ mode }) => {
  const { VITE_ACCESS_TOKEN } = loadEnv(mode, process.cwd());

  const { cert, private: key } = selfsigned.generate(
    [{ name: "commonName", value: "example" }],
    { days: 7 }
  );

  return {
    server: {
      https: {
        cert,
        key,
      },
    },
    plugins: [
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
