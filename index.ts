import { Plugin, Connect } from "vite";
import proxy from "http2-proxy";

const error = (message: string): never => {
  throw new Error(message);
};

export default (options: {
  [regexp: string]: {
    target: string;
    rewrite?: (url: string) => string;
    headers?: Record<string, number | string | string[] | undefined>;
    secure?: boolean;
    timeout?: number;
  };
}): Plugin => {
  const configure = ({ middlewares }: { middlewares: Connect.Server }) => {
    for (const [
      regexp,
      { target, rewrite, headers, secure = true, timeout = 30_000 },
    ] of Object.entries(options)) {
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

      middlewares.use((req, res, next) => {
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
              proxyTimeout: timeout,
              onReq: async (_, options) => {
                options.headers = {
                  ...options.headers,
                  ...headers,
                };
              },
              ["rejectUnauthorized" as never]: secure,
            },
            (err) => err && next(err)
          );
        } else {
          next();
        }
      });
    }
  };

  return {
    name: "http2-proxy",
    configureServer: configure,
    configurePreviewServer: configure,
  };
};
