const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = __dirname;
const dataDir = path.join(rootDir, "data");
const stateFile = path.join(dataDir, "map-state.json");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/state") {
      await handleStateApi(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendText(response, 405, "Method not allowed");
      return;
    }

    await serveStatic(url.pathname, request.method, response);
  } catch (error) {
    console.error(error);
    sendText(response, 500, "Internal server error");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the existing server or run with PORT=4174 npm start.`);
    process.exit(1);
  }

  throw error;
});

server.listen(port, () => {
  console.log(`WithCamp Map server running at http://localhost:${port}`);
});

async function handleStateApi(request, response) {
  if (request.method === "GET") {
    const state = await readState();
    sendJson(response, 200, state);
    return;
  }

  if (request.method === "PUT") {
    try {
      const state = JSON.parse(await readBody(request, 8 * 1024 * 1024));
      validateState(state);
      await writeState(state);
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendText(response, 400, error.message);
    }
    return;
  }

  sendText(response, 405, "Method not allowed");
}

async function serveStatic(pathname, method, response) {
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = path.join(rootDir, safePath === path.sep ? "index.html" : safePath);
  const filePath = await resolveFilePath(requestedPath);

  if (!filePath || !filePath.startsWith(rootDir)) {
    sendText(response, 404, "Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });

  if (method === "HEAD") {
    response.end();
    return;
  }

  response.end(await fs.readFile(filePath));
}

async function resolveFilePath(requestedPath) {
  try {
    const stats = await fs.stat(requestedPath);
    if (stats.isDirectory()) return path.join(requestedPath, "index.html");
    if (stats.isFile()) return requestedPath;
  } catch {
    return null;
  }

  return null;
}

async function readState() {
  try {
    const rawState = await fs.readFile(stateFile, "utf8");
    return JSON.parse(rawState);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { floors: [] };
  }
}

async function writeState(state) {
  await fs.mkdir(dataDir, { recursive: true });
  const tempFile = `${stateFile}.${process.pid}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fs.rename(tempFile, stateFile);
}

function validateState(state) {
  if (!state || !Array.isArray(state.floors)) {
    throw new Error("State must include a floors array");
  }
}

function readBody(request, limitBytes) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > limitBytes) {
        reject(new Error("Request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}
