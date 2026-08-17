import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
};

function resolveRequestFile(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const file = resolve(root, ...segments);
  const relative = file.slice(root.length);
  if (relative.startsWith(sep) || relative === "") return file;
  return null;
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  let file = resolveRequestFile(pathname);

  if (!file) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Portfolio is running at http://127.0.0.1:${port}`);
  console.log("Open this URL in your browser. Do not open site/index.html directly.");
});
