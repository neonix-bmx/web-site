"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const { spawnSync } = require("child_process");

const PORT = Number(process.env.PORT) || 3000;
const SITE_ROOT = path.resolve(__dirname, "..");
const DEFAULT_ADMIN_ROOT = "/var/berrymx";
const FALLBACK_ADMIN_ROOT = "/var/tmp/berrymx";
const isExplicitAdminPath = Boolean(
  process.env.BERRYMX_ADMIN_ROOT ||
    process.env.BERRYMX_DATA_DIR ||
    process.env.BERRYMX_KEYS_DIR ||
    process.env.BERRYMX_ALLOWED_SIGNERS
);

let adminRoot = process.env.BERRYMX_ADMIN_ROOT || DEFAULT_ADMIN_ROOT;
let dataDir = process.env.BERRYMX_DATA_DIR || path.join(adminRoot, "data");
let keysDir = process.env.BERRYMX_KEYS_DIR || path.join(adminRoot, "keys");
const SSH_NAMESPACE = process.env.SSH_NAMESPACE || "berrymx-api";
const MAX_BODY_BYTES = 1_000_000;
const ADMIN_CLOCK_SKEW_MS = 5 * 60 * 1000;
const SEO_FIELDS = [
  "title",
  "description",
  "keywords",
  "ogImage",
  "ogVideo",
  "ogVideoType",
  "canonical",
  "canonicalBase",
  "robots",
  "themeColor",
  "siteName",
  "twitterCard",
  "twitterImage",
  "twitterPlayer",
  "ogType",
];

const ensureDir = (dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.warn(`Could not create ${dirPath}: ${error.message}`);
    return false;
  }
};

const dataReady = ensureDir(dataDir);
const keysReady = ensureDir(keysDir);
if ((!dataReady || !keysReady) && !isExplicitAdminPath) {
  adminRoot = FALLBACK_ADMIN_ROOT;
  dataDir = path.join(adminRoot, "data");
  keysDir = path.join(adminRoot, "keys");
  ensureDir(dataDir);
  ensureDir(keysDir);
  console.warn(`Falling back to ${adminRoot} for admin storage.`);
}

const ADMIN_ROOT = adminRoot;
const DATA_DIR = dataDir;
const KEYS_DIR = keysDir;
const ALLOWED_SIGNERS =
  process.env.BERRYMX_ALLOWED_SIGNERS ||
  path.join(KEYS_DIR, "allowed_signers");

const apiResources = {
  projects: { file: "projects.json", mode: "collection" },
  software: { file: "software.json", mode: "collection" },
  news: { file: "news.json", mode: "collection" },
  about: { file: "about.json", mode: "singleton" },
  seo: { file: "seo.json", mode: "singleton" },
  pages: { file: "pages.json", mode: "singleton" },
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
};

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

const getResourceConfig = (resource) => apiResources[resource];

const loadResource = async (resource) => {
  const config = getResourceConfig(resource);
  if (!config) {
    return config && config.mode === "singleton" ? {} : [];
  }
  const filePath = path.join(DATA_DIR, config.file);
  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    const data = JSON.parse(raw);
    if (config.mode === "singleton") {
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return config.mode === "singleton" ? {} : [];
    }
    throw error;
  }
};

const saveResource = async (resource, data) => {
  const config = getResourceConfig(resource);
  if (!config) {
    return;
  }
  const filePath = path.join(DATA_DIR, config.file);
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

const sanitizeSeoObject = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const cleaned = {};
  SEO_FIELDS.forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) {
      return;
    }
    if (key === "keywords") {
      if (Array.isArray(value)) {
        const list = value.map((entry) => String(entry).trim()).filter(Boolean);
        if (list.length) {
          cleaned.keywords = list.join(", ");
        }
      } else if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) {
          cleaned.keywords = trimmed;
        }
      }
      return;
    }
    const trimmed = String(value).trim();
    if (trimmed) {
      cleaned[key] = trimmed;
    }
  });
  return Object.keys(cleaned).length ? cleaned : null;
};

const sanitizePagesObject = (payload, depth = 0) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  if (depth > 4) {
    return null;
  }
  const cleaned = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value === "string" || typeof value === "number") {
      const trimmed = String(value).trim();
      if (trimmed) {
        cleaned[key] = trimmed;
      }
      return;
    }
    if (Array.isArray(value)) {
      const items = value
        .map((entry) => {
          if (entry === null || entry === undefined) {
            return null;
          }
          if (typeof entry === "string" || typeof entry === "number") {
            const trimmed = String(entry).trim();
            return trimmed ? trimmed : null;
          }
          if (typeof entry === "object" && !Array.isArray(entry)) {
            const nested = sanitizePagesObject(entry, depth + 1);
            return nested && Object.keys(nested).length ? nested : null;
          }
          return null;
        })
        .filter(Boolean);
      if (items.length) {
        cleaned[key] = items;
      }
      return;
    }
    if (typeof value === "object") {
      const nested = sanitizePagesObject(value, depth + 1);
      if (nested && Object.keys(nested).length) {
        cleaned[key] = nested;
      }
    }
  });
  return Object.keys(cleaned).length ? cleaned : null;
};

const sanitizePayload = (resource, payload, options = {}) => {
  if (resource === "pages") {
    const cleaned = sanitizePagesObject(payload);
    if (!cleaned) {
      return { error: "No valid fields provided" };
    }
    return { cleaned };
  }
  const fields = {
    projects: ["title", "stack", "status", "year"],
    software: ["name", "type", "status"],
    news: [
      "title",
      "date",
      "slug",
      "summary",
      "metaTitle",
      "metaDescription",
      "ogImage",
      "ogVideo",
      "ogVideoType",
      "canonical",
    ],
    about: ["title", "summary", "highlights", "stats"],
    seo: [
      "title",
      "description",
      "keywords",
      "ogImage",
      "ogVideo",
      "ogVideoType",
      "canonical",
      "canonicalBase",
      "robots",
      "themeColor",
      "siteName",
      "twitterCard",
      "twitterImage",
      "twitterPlayer",
      "ogType",
      "pages",
    ],
  };
  const required = {
    projects: ["title"],
    software: ["name"],
    news: ["title"],
    about: ["title"],
    seo: [],
  };

  const allowed = fields[resource] || [];
  const requiredFields = required[resource] || [];
  const allowPartial = Boolean(options.allowPartial);
  const cleaned = {};

  allowed.forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null) {
      return;
    }
    if (key === "stack") {
      if (Array.isArray(value)) {
        cleaned.stack = value
          .map((entry) => String(entry).trim())
          .filter(Boolean);
      } else if (typeof value === "string") {
        cleaned.stack = value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return;
    }
    if (key === "highlights") {
      if (Array.isArray(value)) {
        cleaned.highlights = value
          .map((entry) => String(entry).trim())
          .filter(Boolean);
      } else if (typeof value === "string") {
        cleaned.highlights = value
          .split(/\r?\n|,/)
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return;
    }
    if (key === "stats") {
      if (Array.isArray(value)) {
        cleaned.stats = value
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const label = entry.label ? String(entry.label).trim() : "";
            const statValue = entry.value ? String(entry.value).trim() : "";
            if (!label && !statValue) {
              return null;
            }
            return { label, value: statValue };
          })
          .filter(Boolean);
      }
      return;
    }
    if (key === "slug") {
      const slug = String(value)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (slug) {
        cleaned.slug = slug;
      }
      return;
    }
    if (key === "pages") {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return;
      }
      const pages = {};
      Object.entries(value).forEach(([pageKey, pageValue]) => {
        const sanitized = sanitizeSeoObject(pageValue);
        if (sanitized) {
          pages[pageKey] = sanitized;
        }
      });
      if (Object.keys(pages).length > 0) {
        cleaned.pages = pages;
      }
      return;
    }
    if (key === "keywords") {
      if (Array.isArray(value)) {
        cleaned.keywords = value
          .map((entry) => String(entry).trim())
          .filter(Boolean)
          .join(", ");
      } else if (typeof value === "string") {
        cleaned.keywords = value.trim();
      }
      return;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return;
    }
    cleaned[key] = trimmed;
  });

  if (allowPartial) {
    if (Object.keys(cleaned).length === 0) {
      return { error: "No valid fields provided" };
    }
    return { cleaned };
  }

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
  const itemId = parts[2];
  const config = getResourceConfig(resource);
  if (!config) {
    sendJson(res, 404, { error: "Unknown resource" });
    return;
  }

  if (config.mode === "singleton") {
    if (itemId) {
      sendJson(res, 400, { error: "Resource does not support ids" });
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
    if (req.method !== "POST" && req.method !== "PUT") {
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

    const { cleaned, error } = sanitizePayload(resource, payload, {
      allowPartial: true,
    });
    if (error) {
      sendJson(res, 400, { error });
      return;
    }

    try {
      const current = await loadResource(resource);
      const now = new Date().toISOString();
      const updated = {
        ...current,
        ...cleaned,
        updatedAt: now,
      };
      if (!current || !current.createdAt) {
        updated.createdAt = now;
      }
      await saveResource(resource, updated);
      sendJson(res, 200, updated);
    } catch (err) {
      sendJson(res, 500, { error: "Failed to save data" });
    }
    return;
  }

  if (req.method === "GET") {
    try {
      const data = await loadResource(resource);
      if (itemId) {
        const item = data.find((entry) => entry.id === itemId);
        if (!item) {
          sendJson(res, 404, { error: "Not found" });
          return;
        }
        sendJson(res, 200, item);
        return;
      }
      sendJson(res, 200, data);
    } catch (error) {
      sendJson(res, 500, { error: "Failed to load data" });
    }
    return;
  }

  if (req.method !== "POST" && req.method !== "PUT" && req.method !== "DELETE") {
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

  if (req.method === "DELETE") {
    if (!itemId) {
      sendJson(res, 400, { error: "Missing resource id" });
      return;
    }
    try {
      const data = await loadResource(resource);
      const next = data.filter((entry) => entry.id !== itemId);
      if (next.length === data.length) {
        sendJson(res, 404, { error: "Not found" });
        return;
      }
      await saveResource(resource, next);
      sendJson(res, 200, { ok: true, id: itemId });
    } catch (err) {
      sendJson(res, 500, { error: "Failed to delete data" });
    }
    return;
  }

  let payload = {};
  try {
    payload = body ? JSON.parse(body) : {};
  } catch (error) {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  if (req.method === "POST") {
    if (itemId) {
      sendJson(res, 400, { error: "POST does not accept resource id" });
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
    return;
  }

  if (!itemId) {
    sendJson(res, 400, { error: "Missing resource id" });
    return;
  }

  const { cleaned, error } = sanitizePayload(resource, payload, {
    allowPartial: true,
  });
  if (error) {
    sendJson(res, 400, { error });
    return;
  }

  try {
    const data = await loadResource(resource);
    const index = data.findIndex((entry) => entry.id === itemId);
    if (index === -1) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const updated = {
      ...data[index],
      ...cleaned,
      updatedAt: new Date().toISOString(),
    };
    data[index] = updated;
    await saveResource(resource, data);
    sendJson(res, 200, updated);
  } catch (err) {
    sendJson(res, 500, { error: "Failed to update data" });
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
