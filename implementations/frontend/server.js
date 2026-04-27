const express = require("express");
const path = require("node:path");
const fetch = require("node-fetch");

const app = express();
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;
const BACKEND_URL = (
  process.env.BACKEND_URL || "http://localhost:8080"
).replace(/\/$/, "");
const FRONTEND_ROOT = __dirname;

app.use(express.raw({ type: "*/*", limit: "10mb" }));
app.use(express.static(FRONTEND_ROOT));

function shouldSendBody(method) {
  return method !== "GET" && method !== "HEAD";
}

function copyRequestHeaders(headers) {
  const result = { ...headers };
  delete result.host;
  delete result["content-length"];
  return result;
}

app.use(["/api", "/locales"], async (req, res) => {
  const targetUrl = `${BACKEND_URL}${req.originalUrl}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: copyRequestHeaders(req.headers),
      body:
        shouldSendBody(req.method) && req.body?.length ? req.body : undefined,
      redirect: "manual",
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    });

    const responseBuffer = Buffer.from(await upstream.arrayBuffer());
    res.send(responseBuffer);
  } catch (error) {
    res.status(502).json({
      error: "Unable to reach backend API",
      details: error.message,
      backendUrl: BACKEND_URL,
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, "index.html"));
});

app.listen(FRONTEND_PORT, () => {
  console.log(`Frontend server running at http://localhost:${FRONTEND_PORT}`);
  console.log(`Proxying /api and /locales to ${BACKEND_URL}`);
});
