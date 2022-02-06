import { Plugin } from "vite";
import proxy from "http2-proxy";

const error = (message: string): never => {
  throw new Error(message);
};

export default (options: {
  [regexp: string]: {
    target: string;
    rewrite?: (url: string) => string;
    headers?: Record<string, number | string | string[] | undefined>;
  };
}): Plugin => {
  return {
    name: "http2-proxy",
    configureServer: (server) => {
      for (const [regexp, { target, rewrite, headers }] of Object.entries(
        options
      )) {
        const re = new RegExp(regexp);
        const tu = new URL(target);

        if (!tu.pathname.endsWith("/")) {
          tu.pathname += "/";
        }

        const protocol = /^https?:$/.test(tu.protocol)
          ? (tu.protocol.slice(0, -1) as "https" | "http")
          : error(`Invalid protocol: ${tu.href}`);

        const port =
          tu.port === ""
            ? { https: 443, http: 80 }[protocol]
            : /^\d+$/.test(tu.port)
            ? Number(tu.port)
            : error(`Invalid port: ${tu.href}`);

        server.middlewares.use((req, res, next) => {
          if (req.url && re.test(req.url)) {
            const url = (rewrite?.(req.url) ?? req.url).replace(/^\/+/, "");
            const { pathname, search } = new URL(url, tu);
            proxy.web(
              req,
              res,
              {
                protocol,
                port,
                hostname: tu.hostname,
                path: pathname + search,
                onReq: async (_, options) => {
                  options.headers = {
                    ...options.headers,
                    ...headers,
                  };
                },
              },
              (err) => err && next(err)
            );
          } else {
            next();
          }
        });
      }
    },
  };
};
