import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 8765);
const host = process.env.HOST || '127.0.0.1';

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
]);

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const requested = pathname === '/' ? '/amblyopia-vision-demo.html' : pathname;
  const filePath = normalize(join(root, requested));
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) return null;
  return filePath;
}

const server = createServer((req, res) => {
  const filePath = resolveRequestPath(req.url || '/');
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}/amblyopia-vision-demo.html`);
});
