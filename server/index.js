"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const { spawnSync } = require("child_process");

const PORT = Number(process.env.PORT) || 3000;
const SITE_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(SITE_ROOT, "data");
const ALLOWED_SIGNERS = path.join(__dirname, "allowed_signers");
const SSH_NAMESPACE = process.env.SSH_NAMESPACE || "berrymx-api";
const MAX_BODY_BYTES = 1_000_000;
const ADMIN_CLOCK_SKEW_MS = 5 * 60 * 1000;

const apiResources = {
  projects: "projects.json",
  software: "software.json",
  news: "news.json",
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
};

const sendText = (res, status, text) => {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", (err) => reject(err));
  });

const loadResource = async (resource) => {
  const fileName = apiResources[resource];
  if (!fileName) {
    return [];
  }
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const saveResource = async (resource, data) => {
  const fileName = apiResources[resource];
  if (!fileName) {
    return;
  }
  const filePath = path.join(DATA_DIR, fileName);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

const sanitizePayload = (resource, payload) => {
  const fields = {
    projects: ["title", "stack", "status", "year"],
    software: ["name", "type", "status"],
    news: ["title", "date"],
  };
  const required = {
    projects: ["title"],
    software: ["name"],
    news: ["title"],
  };

  const allowed = fields[resource] || [];
  const requiredFields = required[resource] || [];
  const cleaned = {};

  allowed.forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) {
      return;
    }
    if (key === "stack") {
      if (Array.isArray(value)) {
        cleaned.stack = value.map((entry) => String(entry).trim()).filter(Boolean);
      } else if (typeof value === "string") {
        cleaned.stack = value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return;
    }
    cleaned[key] = String(value).trim();
  });

  const missing = requiredFields.filter((key) => !cleaned[key]);
  if (missing.length > 0) {
    return {
      error: `Missing required fields: ${missing.join(", ")}`,
    };
  }

  return { cleaned };
};

const buildSignedMessage = (req, pathname, body, timestamp) => {
  const bodyHash = crypto
    .createHash("sha256")
    .update(body || "")
    .digest("hex");
  return `${req.method}\n${pathname}\n${timestamp}\n${bodyHash}\n`;
};

const verifyAdmin = (req, pathname, body) => {
  const keyId = req.headers["x-ssh-key-id"];
  const signatureB64 = req.headers["x-ssh-signature"];
  const timestamp = req.headers["x-ssh-timestamp"];

  if (!keyId || !signatureB64 || !timestamp) {
    return { ok: false, error: "Missing SSH auth headers" };
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) {
    return { ok: false, error: "Invalid timestamp" };
  }
  if (Math.abs(Date.now() - timestampMs) > ADMIN_CLOCK_SKEW_MS) {
    return { ok: false, error: "Timestamp out of range" };
  }

  if (!fs.existsSync(ALLOWED_SIGNERS)) {
    return { ok: false, error: "Allowed signers file not found" };
  }

  let signaturePath = null;
  try {
    const signatureBuffer = Buffer.from(signatureB64, "base64");
    signaturePath = path.join(
      os.tmpdir(),
      `berrymx-sig-${process.pid}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.sig`
    );
    fs.writeFileSync(signaturePath, signatureBuffer);

    const message = buildSignedMessage(req, pathname, body, timestamp);
    const result = spawnSync(
      "ssh-keygen",
      [
        "-Y",
        "verify",
        "-f",
        ALLOWED_SIGNERS,
        "-I",
        keyId,
        "-n",
        SSH_NAMESPACE,
        "-s",
        signaturePath,
      ],
      { input: message }
    );

    if (result.error) {
      return { ok: false, error: "ssh-keygen failed to run" };
    }
    if (result.status !== 0) {
      return { ok: false, error: "SSH signature verification failed" };
    }
    return { ok: true };
  } finally {
    if (signaturePath) {
      fs.promises.unlink(signaturePath).catch(() => {});
    }
  }
};

const serveStatic = async (req, res, pathname) => {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.resolve(SITE_ROOT, `.${safePath}`);
  if (!resolved.startsWith(SITE_ROOT)) {
    sendText(res, 400, "Invalid path");
    return;
  }

  try {
    const stat = await fs.promises.stat(resolved);
    if (stat.isDirectory()) {
      sendText(res, 403, "Forbidden");
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
    });
    fs.createReadStream(resolved).pipe(res);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendText(res, 404, "Not found");
      return;
    }
    sendText(res, 500, "Server error");
  }
};

const handleApi = async (req, res, pathname) => {
  const parts = pathname.split("/").filter(Boolean);
  const resource = parts[1];
  if (!apiResources[resource]) {
    sendJson(res, 404, { error: "Unknown resource" });
    return;
  }

  if (req.method === "GET") {
    try {
      const data = await loadResource(resource);
      sendJson(res, 200, data);
    } catch (error) {
      sendJson(res, 500, { error: "Failed to load data" });
    }
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let body = "";
  try {
    body = await readBody(req);
  } catch (error) {
    sendJson(res, 413, { error: "Body too large" });
    return;
  }

  const auth = verifyAdmin(req, pathname, body);
  if (!auth.ok) {
    sendJson(res, 401, { error: auth.error });
    return;
  }

  let payload = {};
  try {
    payload = body ? JSON.parse(body) : {};
  } catch (error) {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const { cleaned, error } = sanitizePayload(resource, payload);
  if (error) {
    sendJson(res, 400, { error });
    return;
  }

  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...cleaned,
  };

  try {
    const data = await loadResource(resource);
    data.unshift(item);
    await saveResource(resource, data);
    sendJson(res, 201, item);
  } catch (err) {
    sendJson(res, 500, { error: "Failed to save data" });
  }
};

const server = http.createServer(async (req, res) => {
  const base = `http://${req.headers.host || "localhost"}`;
  const url = new URL(req.url, base);
  let pathname = "";
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    sendText(res, 400, "Bad request");
    return;
  }

  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname);
    return;
  }

  await serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`BerryMX server running at http://localhost:${PORT}`);
});
