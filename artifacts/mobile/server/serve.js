/**
 * Production server for Expo web builds (expo export --platform web).
 *
 * Serves the output of `expo export --platform web` from the dist/ directory.
 * Falls back to static-build/ for legacy Replit builds.
 *
 * - SPA routing: returns index.html for any route without a matching static file
 * - Uses process.env.PORT for web deployment
 * - Handles BASE_PATH prefix
 *
 * Zero external dependencies — uses only Node.js built-ins.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");

const STATIC_ROOT = fs.existsSync(path.join(PROJECT_ROOT, "dist"))
  ? path.join(PROJECT_ROOT, "dist")
  : path.join(PROJECT_ROOT, "static-build");

const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000",
  });
  res.end(content);
}

function serveIndexHtml(res) {
  const indexPath = path.join(STATIC_ROOT, "index.html");
  if (!fs.existsSync(indexPath)) {
    res.writeHead(503, { "content-type": "text/html; charset=utf-8" });
    res.end(
      `<!doctype html><html><body>
       <h2>Trade Mock Pro — Build not found</h2>
       <p>Run <code>npm run build</code> to generate the web build, then restart the server.</p>
       </body></html>`,
    );
    return;
  }
  serveFile(indexPath, res);
}

const server = http.createServer((req, res) => {
  res.setHeader("x-content-type-options", "nosniff");

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (!pathname.startsWith("/")) pathname = "/" + pathname;

  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(filePath, res);
    return;
  }

  serveIndexHtml(res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Trade Mock Pro web server running on port ${port}`);
  console.log(`Serving from: ${STATIC_ROOT}`);
  if (!fs.existsSync(STATIC_ROOT)) {
    console.warn(`Warning: ${STATIC_ROOT} does not exist. Run 'npm run build' first.`);
  }
});
