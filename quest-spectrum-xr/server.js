/**
 * Sinclair ZX Spectrum XR - Persistent Dev Server
 * Programmatic Vite Server with CI=true, stdin detached, and exit interception
 */
process.env.CI = 'true';

// Prevent stdin close from triggering Vite termination
if (process.stdin) {
  try {
    process.stdin.pause();
    process.stdin.removeAllListeners();
    process.stdin.on = () => process.stdin;
    process.stdin.once = () => process.stdin;
  } catch (e) {}
}

// Intercept exit signals
for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) {
  try {
    process.on(sig, () => {
      console.log(`[Server] ${sig} received - keeping dev server active.`);
    });
  } catch (e) {}
}

process.on('uncaughtException', (err) => {
  console.warn('[Server] Uncaught exception:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Server] Unhandled rejection:', reason);
});

// Intercept unexpected process.exit() calls from Vite or libraries
const realExit = process.exit.bind(process);
let allowExit = false;
process.exit = (code) => {
  if (allowExit) {
    return realExit(code);
  }
  console.warn(`[Server] Prevented process.exit(${code}) call - server remains active.`);
};

async function start() {
  try {
    const { createServer } = await import('vite');

    const tryListen = async (port) => {
      const server = await createServer({
        configFile: './vite.config.js',
        server: {
          port: port,
          shortcuts: false
        }
      });
      await server.listen();
      return server;
    };

    let server;
    let activePort = 5173;
    try {
      server = await tryListen(5173);
    } catch (err) {
      if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
        console.warn(`[Server] Port 5173 unavailable (${err.code}). Trying fallback port 8443...`);
        activePort = 8443;
        server = await tryListen(8443);
      } else {
        throw err;
      }
    }

    server.printUrls();
    console.log(`[Server] ZX Spectrum XR Server is running and listening on port ${activePort}.`);
  } catch (err) {
    console.error('[Server] Failed to start server:', err);
    allowExit = true;
    realExit(1);
  }
}

// Keep Node event loop alive
const keepAliveTimer = setInterval(() => {}, 60000);
keepAliveTimer.unref = () => {};

start();
