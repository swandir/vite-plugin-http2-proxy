import { Plugin, Connect } from "vite";
import proxy, { http1Options } from "http2-proxy";
import http from "node:http";
import net from "node:net";

const error = (message: string): never => {
  throw new Error(message);
};

export default (options: {
  [regexp: string]: {
    target: string;
    rewrite?: (url: string) => string;
    headers?: Record<string, number | string | string[] | undefined>;
    secure?: boolean;
    ws?: boolean;
  };
}): Plugin => {
  const configure = ({
    httpServer,
    middlewares,
  }: {
    httpServer: http.Server | null;
    middlewares: Connect.Server;
  }) => {
    for (const [
      regexp,
      { target, rewrite, headers, secure = true, ws = false },
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

      const match = (req: http.IncomingMessage) => true;

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

      if (ws) {
        if (!httpServer) {
          throw Error("Unable to proxy WebSockets in middleware mode");
        }
        httpServer.on("upgrade", (req, socket, head) => {
          if (req.url && re.test(req.url)) {
            proxy.ws<http.IncomingMessage>(
              req,
              socket as net.Socket,
              head,
              {
                port,
                hostname: tu.hostname,
              },
              () => socket.destroy()
            );
          }
        });
      }
    }
  };

  return {
    name: "http2-proxy",
    configureServer: configure,
    configurePreviewServer: configure,
  };
};
