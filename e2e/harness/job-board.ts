import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:https";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, sep } from "node:path";

/**
 * The fixture job board: `fixtures/pages/` over HTTPS on 127.0.0.1. Chromium maps the e2e build's
 * granted site (`jobs.cvsnap.test`) to it with `--host-resolver-rules` and accepts the self-signed
 * test certificate with `--ignore-certificate-errors`.
 */

export const JOB_BOARD_HOST = "jobs.cvsnap.test";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};

export interface JobBoard {
  port: number;
  /** Chromium arguments that send the board's host to this server. */
  chromiumArgs: string[];
  url(path: string): string;
  close(): Promise<void>;
}

export async function startJobBoard(fixturesDir: string): Promise<JobBoard> {
  const pagesDir = join(fixturesDir, "pages");
  const server: Server = createServer(
    {
      key: readFileSync(join(fixturesDir, "cert", "key.pem")),
      cert: readFileSync(join(fixturesDir, "cert", "cert.pem")),
    },
    (request, response) => {
      const path = normalize(
        join(pagesDir, decodeURIComponent(new URL(request.url ?? "/", "https://x").pathname)),
      );
      if (!path.startsWith(pagesDir + sep)) {
        response.writeHead(403).end();
        return;
      }
      readFile(path).then(
        (body) => {
          response.writeHead(200, {
            "content-type": TYPES[extname(path)] ?? "application/octet-stream",
          });
          response.end(body);
        },
        () => response.writeHead(404).end(),
      );
    },
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    port,
    chromiumArgs: [
      `--host-resolver-rules=MAP ${JOB_BOARD_HOST}:443 127.0.0.1:${String(port)}`,
      "--ignore-certificate-errors",
    ],
    url: (path) => `https://${JOB_BOARD_HOST}/${path.replace(/^\//, "")}`,
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  };
}
