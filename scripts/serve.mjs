import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.argv[2] || "src");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
const routes = new Set([
  "/",
  "/locations",
  "/rooms",
  "/rooms/standard-double",
  "/rooms/twin",
  "/rooms/superior",
  "/rooms/studio",
]);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const path = decodeURIComponent(url.pathname).replace(/\/$/, "") || "/";
    let file = resolve(root, "." + path);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (routes.has(path)) file = resolve(root, "index.html");
    else if ((await stat(file)).isDirectory())
      file = resolve(file, "index.html");
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      (await readFile(resolve(root, "index.html"), "utf8")).replace(
        'data-page="auto"',
        'data-page="404"',
      ),
    );
  }
}).listen(port, "0.0.0.0", () =>
  console.log(`PIPE Hotel → http://localhost:${port}`),
);
