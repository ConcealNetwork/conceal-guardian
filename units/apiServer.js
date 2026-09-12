// Copyright (c) 2019-2026, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import path from "node:path";
import axios from "axios";
import express from "express";
import rateLimit from "express-rate-limit";
import geoip from "geoip2-api";
import readLastLines from "read-last-lines";
import validator from "validator";
import { ensureUserDataDir } from "./utils.js";

function safeResolve(relPath) {
  const safeSuffix = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.resolve(safeSuffix);
}

/** Express adapter: handlers declare only the bindings they use via destructuring. */
function asRoute(handler) {
  return async (request, response, next) => {
    try {
      await handler({ request, response });
    } catch (err) {
      next(err);
    }
  };
}

// Sanitize IP addresses and validate URLs for outbound requests
function sanitizeForGeolocation(ip) {
  // Validate IP format
  if (!validator.isIP(ip)) {
    return null;
  }

  // Sanitize IP to prevent path traversal
  const sanitizedIP = validator.escape(ip).substring(0, 45); // Max IPv6 length + buffer

  return sanitizedIP;
}

function formatGeoData(data) {
  return {
    city: data.city || "Unknown",
    region: data.region || "Unknown",
    country: data.country || "Unknown",
    ll: [data.latitude || null, data.longitude || null],
  };
}

export function createServer(config, nodeDirectory, onDataCallback) {
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
  });

  // create express and rate limiter
  const app = express();
  app.use(limiter);

  app.listen(config.api.port, () => {
    console.log(`API server running on port ${config.api.port}`);
  });

  app.get(
    "/getInfo",
    asRoute(async ({ response }) => {
      try {
        const statusResponse = await onDataCallback();
        response.set("Access-Control-Allow-Origin", "*");
        response.set("X-Powered-By", "ConcealNodeGuard");
        response.json(statusResponse);
      } catch {
        response.status(500).json({ error: "Failed to get node info" });
      }
    }),
  );

  app.get(
    "/getDaemonLog",
    asRoute(async ({ response }) => {
      const lines = await readLastLines.read(path.join(nodeDirectory, "conceald.log"), 500);
      response.send(lines);
    }),
  );

  app.get(
    "/getGuardianLog",
    asRoute(async ({ response }) => {
      const lines = await readLastLines.read(path.join(ensureUserDataDir(), "debug.log"), 500);
      response.send(lines);
    }),
  );

  app.get(
    "/getPeersData",
    asRoute(async ({ response }) => {
      try {
        const statusResponse = await onDataCallback();
        let peerGeoData = [];

        if (statusResponse.blockchain?.connections) {
          if (statusResponse.blockchain.connections.length > 0) {
            // Process each peer connection
            const peerPromises = statusResponse.blockchain.connections.map(async (connection) => {
              try {
                // Extract and sanitize IP from connection
                const peerIP = connection.toString().split(":")[0]; // Remove port if present
                const sanitizedIP = sanitizeForGeolocation(peerIP);

                if (!sanitizedIP) {
                  return {
                    city: "Unknown",
                    region: "Unknown",
                    country: "Unknown",
                    ll: [null, null],
                  };
                }

                // Define APIs to try in order with proper URL validation
                const apis = [
                  {
                    name: "geoip2-api",
                    fn: async () => await geoip.get(sanitizedIP),
                  },
                  {
                    name: "ipinfo.io",
                    fn: async () => {
                      const url = `https://ipinfo.io/${sanitizedIP}/json`;
                      if (!validator.isURL(url, { protocols: ["https"], require_protocol: true })) {
                        throw new Error("Invalid URL");
                      }
                      return await axios.get(url, {
                        timeout: 5000,
                        headers: { "User-Agent": "Conceal Node Guardian" },
                      });
                    },
                  },
                  {
                    name: "ipapi.co",
                    fn: async () => {
                      const url = `https://ipapi.co/${sanitizedIP}/json/`;
                      if (!validator.isURL(url, { protocols: ["https"], require_protocol: true })) {
                        throw new Error("Invalid URL");
                      }
                      return await axios.get(url, {
                        timeout: 5000,
                        headers: { "User-Agent": "Conceal Node Guardian" },
                      });
                    },
                  },
                ];

                // Try each API in sequence
                for (const api of apis) {
                  try {
                    const geoData = await api.fn();

                    // Handle different response formats
                    if (api.name === "geoip2-api") {
                      // Validate geoip2-api response
                      if (geoData?.latitude && geoData.longitude) {
                        return formatGeoData(geoData);
                      } else {
                      }
                    } else if (api.name === "ipapi.co") {
                      // Validate ipapi.co response
                      if (geoData.data?.latitude && geoData.data.longitude) {
                        return formatGeoData(geoData.data);
                      } else {
                      }
                    } else if (api.name === "ipinfo.io") {
                      // Validate ipinfo.io response
                      if (geoData.data?.loc) {
                        const [lat, lng] = geoData.data.loc.split(",");
                        if (lat && lng) {
                          return {
                            city: geoData.data.city || "Unknown",
                            region: geoData.data.region || "Unknown",
                            country: geoData.data.country || "Unknown",
                            ll: [parseFloat(lat) || null, parseFloat(lng) || null],
                          };
                        }
                      }
                    }
                  } catch (err) {
                    // Check if it's a rate limit error
                    const isRateLimited =
                      err.message.includes("429") ||
                      err.message.includes("403") ||
                      err.message.includes("304") ||
                      err.response?.status === 429 ||
                      err.response?.status === 403 ||
                      err.response?.status === 304;

                    if (isRateLimited) {
                    } else {
                    }
                  }
                }

                // All APIs failed, return unknown
                return {
                  city: "Unknown",
                  region: "Unknown",
                  country: "Unknown",
                  ll: [null, null],
                };
              } catch {
                return {
                  city: "Unknown",
                  region: "Unknown",
                  country: "Unknown",
                  ll: [null, null],
                };
              }
            });

            // Wait for all geolocation requests to complete
            peerGeoData = await Promise.all(peerPromises);

            response.json(peerGeoData);
          } else {
            response.json(peerGeoData);
          }
        } else {
          response.json(peerGeoData);
        }
      } catch (err) {
        console.error("Error getting peers data:", err);
        response.status(500).json({ error: "Failed to get peers data" });
      }
    }),
  );

  const htmlRoot = safeResolve("./html");

  // Alias /index → /index.html, then serve the UI from ./html (path-safe via express.static).
  app.use((request, response, next) => {
    if (request.path === "/index") {
      request.url = "/index.html";
    }
    if (path.extname(request.path) === ".map") {
      response.status(404).send("Not found");
      return;
    }
    next();
  });
  app.use(express.static(htmlRoot));
  app.use((request, response) => {
    console.debug(`API 404 ${request.method} ${request.path}`);
    response.status(404).send("Not found");
  });
}
