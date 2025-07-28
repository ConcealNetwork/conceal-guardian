// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.
import { ensureUserDataDir } from "./utils.js";
import readLastLines from "read-last-lines";
import rateLimit from "express-rate-limit";
import geoip from "geoip2-api";
import express from "express";
import axios from "axios";
import path from "path";
import fs from "fs";

function safeResolve(relPath) {
  var safeSuffix = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.resolve(safeSuffix);
}

function formatGeoData(data) {
  return {
    city: data.city || 'Unknown',
    region: data.region || 'Unknown',
    country: data.country || 'Unknown',
    ll: [data.latitude || null, data.longitude || null]
  };
}

export function createServer(config, nodeDirectory, onDataCallback) {
  let limiter = rateLimit({
    windowMs: 1*60*1000, // 1 minute
    max: 60
  });

  // create express and rate limiter
  const app = express();
  app.use(limiter);

  app.listen(config.api.port, () => {
    console.log("API server running on port " + config.api.port);
  });

  app.get("/getInfo", async (req, res) => {
    try {
      var statusResponse = await onDataCallback();
      res.set('Access-Control-Allow-Origin', '*');
      res.set('X-Powered-By', 'ConcealNodeGuard');
      res.json(statusResponse);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get node info' });
    }
  });

  app.get("/getDaemonLog", (req, res) => {
    readLastLines.read(path.join(nodeDirectory, 'conceald.log'), 500).then((lines) => {
      res.send(lines);
    });
  });

  app.get("/getGuardianLog", (req, res) => {
    readLastLines.read(path.join(ensureUserDataDir(), 'debug.log'), 500).then((lines) => {
      res.send(lines);
    });
  });

  app.get("/getPeersData", async (req, res) => {
    try {
      var statusResponse = await onDataCallback();
      var peerGeoData = [];

      if ((statusResponse.blockchain) && (statusResponse.blockchain.connections)) {
        if (statusResponse.blockchain.connections.length > 0) {
          // Process each peer connection
          const peerPromises = statusResponse.blockchain.connections.map(async (connection) => {
            try {
              // Extract IP from connection (assuming it's a string with IP)
              const peerIP = connection.toString().split(':')[0]; // Remove port if present
              
              // Define APIs to try in order
              const apis = [
                { name: 'geoip2-api', fn: async () => await geoip.get(peerIP) },
                { name: 'ipinfo.io', fn: async () => await axios.get(`https://ipinfo.io/${peerIP}/json`, { timeout: 5000 }) },
                { name: 'ipapi.co', fn: async () => await axios.get(`https://ipapi.co/${peerIP}/json/`, { timeout: 5000 }) }
              ];
              
              // Try each API in sequence
              for (const api of apis) {
                try {
                  const geoData = await api.fn();
                  
                  // Handle different response formats
                  if (api.name === 'geoip2-api') {
                    // Validate geoip2-api response
                    if (geoData && geoData.latitude && geoData.longitude) {
                      return formatGeoData(geoData);
                    } else {
                      continue;
                    }
                  } else if (api.name === 'ipapi.co') {
                    // Validate ipapi.co response
                    if (geoData.data && geoData.data.latitude && geoData.data.longitude) {
                      return formatGeoData(geoData.data);
                    } else {
                      continue;
                    }
                  } else if (api.name === 'ipinfo.io') {
                    // Validate ipinfo.io response
                    if (geoData.data && geoData.data.loc) {
                      const [lat, lng] = geoData.data.loc.split(',');
                      if (lat && lng) {
                        return {
                          city: geoData.data.city || 'Unknown',
                          region: geoData.data.region || 'Unknown',
                          country: geoData.data.country || 'Unknown',
                          ll: [parseFloat(lat) || null, parseFloat(lng) || null]
                        };
                      }
                    }
                    continue;
                  }
                  
                } catch (err) {
                  // Check if it's a rate limit error
                  const isRateLimited = err.message.includes('429') || 
                                      err.message.includes('403') || 
                                      err.message.includes('304') ||
                                      err.response?.status === 429 ||
                                      err.response?.status === 403 ||
                                      err.response?.status === 304;
                  
                  if (isRateLimited) {
                    continue; // Try next API
                  } else {
                    continue; // Try next API
                  }
                }
              }
              
              // All APIs failed, return unknown
              return {
                city: 'Unknown',
                region: 'Unknown',
                country: 'Unknown', 
                ll: [null, null]
              };
              
            } catch (err) {
              return {
                city: 'Unknown',
                region: 'Unknown',
                country: 'Unknown', 
                ll: [null, null]
              };
            }
          });
          
          // Wait for all geolocation requests to complete
          peerGeoData = await Promise.all(peerPromises);
          
          res.json(peerGeoData);
        } else {
          res.json(peerGeoData);
        }
      } else {
        res.json(peerGeoData);
      }
    } catch (err) {
      console.error('Error getting peers data:', err);
      res.status(500).json({ error: 'Failed to get peers data' });
    }
  });

  app.get(["/index.html", "/index"], (req, res) => {
    res.sendFile(safeResolve('./html/index.html'));
  });

  app.get("/dashboard.html", (req, res) => {
    res.sendFile(safeResolve('./html/dashboard.html'));
  });

  app.get("/daemonLog.html", (req, res) => {
    res.sendFile(safeResolve('./html/daemonLog.html'));
  });

  app.get("/peers.html", (req, res) => {
    res.sendFile(safeResolve('./html/peers.html'));
  });

  app.get("/*splat", (req, res) => {
    if (path.extname(req.path) !== '.map') {
      var pathName = safeResolve('./html' + req.path);

      if (fs.existsSync(pathName)) {
        res.sendFile(pathName);
      } else {
        res.status(404).send('Not found');
      }
    } else {
      res.status(404).send('Not found');
    }
  });
}
