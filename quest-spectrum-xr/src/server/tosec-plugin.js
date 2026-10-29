/**
 * Vite Dev Server Plugin: Sinclair ZX Spectrum TOSEC Archive Streamer
 * Directly serves and searches the 29,000+ games in the user's TOSEC archive over WiFi
 */
import fs from 'fs';
import http from 'http';
import path from 'path';
import zlib from 'zlib';
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';

export function tosecServerPlugin() {
  const TOSEC_ROOT = 'C:/Users/adria/Desktop/DEV FOLDER/_=[ 07_3MU_R37R0 ]=_/Sinclair ZX Spectrum [TOSEC]';
  const FUSE_DIR = 'C:/Users/adria/.gemini/antigravity/scratch/fuse-1.10.0';
  const FUSE_EXE = path.join(FUSE_DIR, 'fuse.exe');
  const categories = ['[Z80]', '[TAP]', '[DSK]', '[TRD]', '[TZX]'];

  let gameIndex = [];
  let indexBuilt = false;
  let lastRandomIdx = -1;
  let fuseSpawnAttempted = false;

  function ensureFuseRunning() {
    if (fuseSpawnAttempted) return;
    fuseSpawnAttempted = true;
    const req = http.get('http://127.0.0.1:8765/status.json', { timeout: 600 }, (res) => {
      res.resume();
    });
    req.on('error', () => {
      if (fs.existsSync(FUSE_EXE)) {
        try {
          console.log('[Fuse Bridge] Auto-starting Fuse 1.10.0 with --quest-vr on port 8765...');
          const child = spawn(FUSE_EXE, ['--quest-vr'], {
            cwd: FUSE_DIR,
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        } catch (e) {
          console.warn('[Fuse Bridge] Failed to spawn fuse.exe:', e.message);
        }
      }
    });
  }

  function syncBufferToFuse(buf, nameOrExt) {
    ensureFuseRunning();
    try {
      const rawExt = (nameOrExt || '').includes('.')
        ? nameOrExt.split('.').pop().toLowerCase()
        : (nameOrExt || 'z80').toLowerCase();
      const cleanExt = ['z80', 'sna', 'tap', 'tzx', 'dsk', 'trd', 'scl', 'pok'].includes(rawExt) ? rawExt : 'z80';
      const liveName = `_live_game.${cleanExt}`;
      const outPath = path.join(FUSE_DIR, 'games', liveName);
      fs.writeFileSync(outPath, buf);
      const req = http.get(`http://127.0.0.1:8765/api/control?action=load_local&file=${liveName}`, { timeout: 1500 }, (r) => r.resume());
      req.on('error', () => {});
    } catch (e) {
      console.warn('[Fuse Bridge] Failed to sync game to Fuse:', e.message);
    }
  }

  function proxyToFuse(req, res) {
    ensureFuseRunning();
    const cleanHeaders = {};
    if (req.headers) {
      for (const [k, v] of Object.entries(req.headers)) {
        if (!k.startsWith(':') && k.toLowerCase() !== 'connection' && k.toLowerCase() !== 'host') {
          cleanHeaders[k] = v;
        }
      }
    }
    cleanHeaders['host'] = '127.0.0.1:8765';
    cleanHeaders['connection'] = 'close';

    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: 8765,
      path: req.url,
      method: req.method,
      headers: cleanHeaders,
      timeout: 2500
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'fuse_offline' }));
      }
    });
    req.pipe(proxyReq);
  }

  function buildIndex() {
    if (indexBuilt) return;
    console.log('[TOSEC Plugin] Indexing TOSEC games directory...');
    const start = Date.now();
    gameIndex = [];

    for (const cat of categories) {
      const catDir = path.join(TOSEC_ROOT, 'Games', cat);
      if (!fs.existsSync(catDir)) continue;

      try {
        const files = fs.readdirSync(catDir);
        const format = cat.replace(/[\[\]]/g, '').toLowerCase();

        for (const file of files) {
          if (!file.endsWith('.zip') && !file.endsWith('.z80') && !file.endsWith('.tap') &&
              !file.endsWith('.dsk') && !file.endsWith('.trd') && !file.endsWith('.tzx')) {
            continue;
          }

          // Clean display title
          let title = file.replace(/\.zip$/i, '');
          const is128K = title.includes('[128K]') || title.includes('+3');

          gameIndex.push({
            name: title,
            file: file,
            category: cat,
            format: format,
            relPath: `Games/${cat}/${file}`,
            is128K: is128K
          });
        }
      } catch (err) {
        console.warn(`[TOSEC Plugin] Failed to read ${catDir}:`, err.message);
      }
    }

    indexBuilt = true;
    console.log(`[TOSEC Plugin] Indexed ${gameIndex.length} games across 5 categories in ${Date.now() - start}ms`);
  }

  function unzipFirstEntry(buf) {
    if (buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
      return null;
    }
    const method = buf.readUInt16LE(8);
    const compSize = buf.readUInt32LE(18);
    const fnLen = buf.readUInt16LE(26);
    const extraLen = buf.readUInt16LE(28);
    const innerName = buf.toString('utf8', 30, 30 + fnLen);
    const dataStart = 30 + fnLen + extraLen;
    const compData = buf.subarray(dataStart, dataStart + compSize);

    let uncompressed;
    if (method === 0) {
      uncompressed = compData;
    } else if (method === 8) {
      uncompressed = zlib.inflateRawSync(compData);
    } else {
      throw new Error(`Unsupported PKZIP compression method: ${method}`);
    }

    return {
      name: innerName,
      data: uncompressed
    };
  }

  return {
    name: 'tosec-server-plugin',
    configureServer(server) {
      // Build index asynchronously on startup
      setTimeout(buildIndex, 50);

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        if (url.pathname === '/api/diag') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            console.log(`[CLIENT-DIAG] ${body}`);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          });
          return;
        }

        // 1. Stats endpoint: /api/tosec/stats
        if (url.pathname === '/api/tosec/stats') {
          buildIndex();
          const stats = {
            total: gameIndex.length,
            z80: gameIndex.filter(g => g.format === 'z80').length,
            tap: gameIndex.filter(g => g.format === 'tap').length,
            dsk: gameIndex.filter(g => g.format === 'dsk').length,
            trd: gameIndex.filter(g => g.format === 'trd').length,
            tzx: gameIndex.filter(g => g.format === 'tzx').length
          };
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(stats));
        }

        // 2. Search endpoint: /api/tosec/search?q=...&cat=...&limit=...
        if (url.pathname === '/api/tosec/search') {
          buildIndex();
          const query = (url.searchParams.get('q') || '').trim().toLowerCase();
          const cat = (url.searchParams.get('cat') || 'all').toLowerCase();
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

          let results = gameIndex;
          if (cat !== 'all') {
            results = results.filter(g => g.format === cat);
          }

          if (query) {
            const terms = query.split(/\s+/).filter(Boolean);
            results = results.filter(g => {
              const lower = g.name.toLowerCase();
              return terms.every(t => lower.includes(t));
            });
          }

          const page = results.slice(0, limit);
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            totalMatches: results.length,
            results: page
          }));
        }

        // 3. Random game endpoint: /api/tosec/random?cat=...&online=1
        if (url.pathname === '/api/tosec/random') {
          buildIndex();
          const cat = (url.searchParams.get('cat') || 'all').toLowerCase();
          const forceOnline = url.searchParams.get('online') === '1';
          let pool = gameIndex;
          if (cat && cat !== 'all') {
            pool = pool.filter(g => g.format === cat);
          } else {
            // Prefer instant-boot and standard trap formats (Z80, TAP, DSK, TRD) over custom turbo TZX
            pool = pool.filter(g => g.format !== 'tzx');
          }
          if (pool.length === 0) pool = gameIndex;

          // If local TOSEC is not installed (or online=1 requested), pick a random game from Internet Archive TOSEC 44k Cloud!
          if (pool.length === 0 || forceOnline) {
            (async () => {
              try {
                const ranges = {
                  z80: [2132776, 3275000],
                  tap: [3417433, 4028000],
                  dsk: [415012,  526000],
                  trd: [3349987, 3401000],
                  tzx: [534860,  2099000]
                };
                const fmts = ['z80', 'tap', 'dsk', 'trd'];
                const chosenFmt = (cat && ranges[cat]) ? cat : fmts[Math.floor(Math.random() * fmts.length)];
                const [startB, endB] = ranges[chosenFmt];
                const offset = startB + Math.floor(Math.random() * Math.max(4096, endB - startB));
                const idxUrl = 'https://archive.org/download/Sinclair_ZX_Spectrum_TOSEC_2012_04_23/Sinclair_ZX_Spectrum_TOSEC_2012_04_23.txt';
                const r = await fetch(idxUrl, { headers: { Range: `bytes=${offset}-${offset + 12287}` } });
                const slice = await r.text();
                const lines = slice.split('\n')
                  .map(l => {
                    const m = l.match(/(Sinclair ZX Spectrum \[TOSEC\]\/Games\/\[[^\]]+\]\/[^\r\n]+\.zip)/);
                    return m ? m[1] : null;
                  })
                  .filter(Boolean);
                if (lines.length > 0) {
                  const chosen = lines[Math.floor(Math.random() * lines.length)];
                  const rawFile = chosen.split('/').pop();
                  const title = rawFile.replace(/\.zip$/i, '');
                  const cloudGame = {
                    name: title,
                    file: rawFile,
                    category: `[${chosenFmt.toUpperCase()}]`,
                    format: chosenFmt,
                    relPath: `cloud://${chosen}`,
                    is128K: title.includes('[128K]') || title.includes('+3'),
                    cloud: true
                  };
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ game: cloudGame, ...cloudGame }));
                }
              } catch (e) {
                console.warn('[TOSEC Cloud] Online random fallback error:', e.message);
              }
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'empty' }));
            })();
            return;
          }

          let idx = Math.floor(Math.random() * pool.length);
          if (pool.length > 1 && idx === lastRandomIdx) {
            idx = (idx + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
          }
          lastRandomIdx = idx;
          const randomGame = pool[idx];
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ game: randomGame, ...randomGame }));
        }

        // Direct upload handler for Fuse 1.10.0 Native C Core
        if (url.pathname === '/api/upload' && req.method === 'POST') {
          const nameParam = url.searchParams.get('name') || 'game.z80';
          const chunks = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', () => {
            const buf = Buffer.concat(chunks);
            syncBufferToFuse(buf, nameParam);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          });
          return;
        }

        // Proxy Fuse 1.10.0 Native C Core endpoints to 127.0.0.1:8765
        if (
          url.pathname === '/api/frame.pal' ||
          url.pathname === '/api/cheats' ||
          url.pathname === '/api/cheats/action' ||
          url.pathname === '/api/control' ||
          url.pathname === '/status.json' ||
          url.pathname === '/input' ||
          url.pathname === '/frame.jpg'
        ) {
          return proxyToFuse(req, res);
        }

        // 4. Stream / Download game: /api/tosec/get?file=...
        if (url.pathname === '/api/tosec/get') {
          const relFile = url.searchParams.get('file');
          if (!relFile) {
            res.statusCode = 400;
            return res.end('Missing file parameter');
          }

          if (relFile.startsWith('cloud://')) {
            const innerPath = relFile.slice(8);
            const dlUrl = `https://archive.org/download/Sinclair_ZX_Spectrum_TOSEC_2012_04_23/Sinclair_ZX_Spectrum_TOSEC_2012_04_23.zip/${encodeURIComponent(innerPath)}`;
            (async () => {
              try {
                const r = await fetch(dlUrl);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const rawBytes = Buffer.from(await r.arrayBuffer());
                let filename = path.basename(innerPath);
                let fileData = rawBytes;
                if (rawBytes.length >= 4 && rawBytes[0] === 0x50 && rawBytes[1] === 0x4b) {
                  const extracted = unzipFirstEntry(rawBytes);
                  if (extracted) {
                    filename = extracted.name;
                    fileData = extracted.data;
                  }
                }
                const ext = filename.split('.').pop().toLowerCase();
                syncBufferToFuse(fileData, ext);
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
                res.setHeader('X-Extracted-Name', filename);
                res.setHeader('X-Extracted-Format', ext);
                res.setHeader('Access-Control-Expose-Headers', 'X-Extracted-Name, X-Extracted-Format');
                return res.end(fileData);
              } catch (err) {
                console.error('[TOSEC Cloud] Error downloading file:', err.message);
                res.statusCode = 502;
                return res.end(`Cloud download failed: ${err.message}`);
              }
            })();
            return;
          }

          // Security check: prevent directory traversal
          const safeRel = path.normalize(relFile).replace(/^(\.\.[\/\\])+/, '');
          const fullPath = path.join(TOSEC_ROOT, safeRel);

          if (!fs.existsSync(fullPath)) {
            res.statusCode = 404;
            return res.end(`File not found: ${safeRel}`);
          }

          try {
            const rawBytes = fs.readFileSync(fullPath);
            let filename = path.basename(fullPath);
            let fileData = rawBytes;

            // Automatically extract if PKZIP
            if (rawBytes.length >= 4 && rawBytes[0] === 0x50 && rawBytes[1] === 0x4b) {
              const extracted = unzipFirstEntry(rawBytes);
              if (extracted) {
                filename = extracted.name;
                fileData = extracted.data;
              }
            }

            const ext = filename.split('.').pop().toLowerCase();
            syncBufferToFuse(fileData, ext);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
            res.setHeader('X-Extracted-Name', filename);
            res.setHeader('X-Extracted-Format', ext);
            res.setHeader('Access-Control-Expose-Headers', 'X-Extracted-Name, X-Extracted-Format');
            return res.end(fileData);
          } catch (err) {
            console.error('[TOSEC Plugin] Error serving file:', err);
            res.statusCode = 500;
            return res.end(`Error serving file: ${err.message}`);
          }
        }

        next();
      });

      // Dedicated WebSocket Remote Relay for low-latency, rock-solid cross-device sync
      if (server.httpServer) {
        const wss = new WebSocketServer({ noServer: true });

        server.httpServer.on('upgrade', (req, socket, head) => {
          let pathname = '';
          try {
            pathname = new URL(req.url, 'http://localhost').pathname;
          } catch (e) {
            return;
          }

          if (pathname === '/ws-relay') {
            wss.handleUpgrade(req, socket, head, (ws) => {
              wss.emit('connection', ws, req);
            });
          }
          // Other pathnames (e.g. / for Vite HMR) are untouched so Vite HMR never collides
        });

        const broadcast = (sender, msg) => {
          const raw = typeof msg === 'string' ? msg : JSON.stringify(msg);
          for (const client of wss.clients) {
            if (client !== sender && client.readyState === 1) { // 1 = OPEN
              client.send(raw);
            }
          }
        };

        const broadcastStatus = () => {
          for (const client of wss.clients) {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'status',
                peerCount: wss.clients.size - 1
              }));
            }
          }
        };

        let lastState = {
          loadGame: null,
          controlMode: 'kempston'
        };

        wss.on('connection', (ws, req) => {
          const ip = req.socket.remoteAddress || 'unknown';
          console.log(`[RelayWS] Client connected from ${ip}. Total connected: ${wss.clients.size}`);
          broadcastStatus();

          // Do NOT auto-load games on connect to prevent loop resets

          ws.on('message', (rawData) => {
            try {
              const msg = JSON.parse(rawData.toString());
              if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                return;
              }

              if (msg.type === 'load-game' || msg.type === 'load-tosec') {
                console.log(`[RelayWS] Mirroring ${msg.type} to ${wss.clients.size - 1} peer(s):`, msg.data?.name || msg.data?.gamePath);
              }

              broadcast(ws, msg);
            } catch (err) {
              console.error('[RelayWS] Message parse error:', err);
            }
          });

          ws.on('close', (code, reason) => {
            console.log(`[RelayWS] Client disconnected (${ip}). Code: ${code}, Reason: ${reason}. Remaining: ${wss.clients.size}`);
            broadcastStatus();
          });

          ws.on('error', (err) => {
            console.warn('[RelayWS] Socket error:', err.message);
          });
        });

        wss.on('error', (err) => {
          console.warn('[RelayWS] WSS server error:', err.message);
        });

        process.on('uncaughtException', (err) => {
          console.warn('[Server] Uncaught exception caught:', err.message);
        });

        process.on('unhandledRejection', (reason) => {
          console.warn('[Server] Unhandled rejection caught:', reason);
        });
      }
    }
  };
}
