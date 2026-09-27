const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const viteEntry = require.resolve("vite/bin/vite.js");
const electronPath = require("electron");

const port = 5173;
const url = \`http://127.0.0.1:\${port}\`;

const waitForServer = () =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume();

        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }

        setTimeout(poll, 150);
      });

      request.on("error", () => {
        if (Date.now() - startedAt > 30000) {
          reject(new Error("Vite development server did not start."));
          return;
        }

        setTimeout(poll, 150);
      });
    };

    poll();
  });

const vite = spawn(
  process.execPath,
  [viteEntry, "--host", "127.0.0.1", "--port", String(port)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      BROWSER: "none"
    }
  }
);

const cleanup = () => {
  if (!vite.killed) {
    vite.kill();
  }
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

waitForServer()
  .then(() => {
    const electron = spawn(electronPath, ["."], {
      stdio: "inherit",
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: url
      },
      cwd: path.resolve(__dirname, "..")
    });

    electron.on("exit", (code, signal) => {
      cleanup();

      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      process.exit(code ?? 0);
    });
  })
  .catch((error) => {
    cleanup();
    process.stderr.write(\`\${error.message}\\n\`);
    process.exit(1);
  });

if (!existsSync(viteEntry)) {
  process.stderr.write("Vite is not installed. Run npm install first.\\n");
  process.exit(1);
}
