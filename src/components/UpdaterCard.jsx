import { motion } from "framer-motion";

const statusMap = {
  idle: {
    label: "Ready",
    tone: "neutral",
    description: "Check GitHub Releases for a newer Solis build."
  },
  checking: {
    label: "Checking",
    tone: "accent",
    description: "Checking the configured GitHub release channel."
  },
  available: {
    label: "Update available",
    tone: "accent",
    description: "A newer build is ready to download."
  },
  downloading: {
    label: "Downloading",
    tone: "accent",
    description: "The update is downloading in the background."
  },
  downloaded: {
    label: "Ready to restart",
    tone: "accent",
    description: "The update is downloaded and waiting to be applied."
  },
  "not-available": {
    label: "Up to date",
    tone: "neutral",
    description: "This installation is already on the latest release."
  },
  development: {
    label: "Development",
    tone: "neutral",
    description: "Live release checks are disabled while running locally."
  },
  error: {
    label: "Update error",
    tone: "error",
    description: "The updater could not complete the requested operation."
  }
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }

  const mb = bytes / 1024 / 1024;

  if (mb < 1024) {
    return \`\${mb.toFixed(mb < 10 ? 1 : 0)} MB\`;
  }

  return \`\${(mb / 1024).toFixed(1)} GB\`;
};

const formatRate = (bytesPerSecond) => {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return "0 MB/s";
  }

  const mb = bytesPerSecond / 1024 / 1024;

  return \`\${mb.toFixed(mb < 10 ? 1 : 0)} MB/s\`;
};

const badgeClass = (tone) => {
  if (tone === "accent") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-400";
  }

  if (tone === "error") {
    return "border-red-500/25 bg-red-500/10 text-red-400";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-400";
};

const buttonBase =
  "inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-45";

export function UpdaterCard({
  state,
  development,
  onCheck,
  onDownload,
  onInstall
}) {
  const status = statusMap[state.type] || statusMap.idle;
  const progress = Math.max(0, Math.min(100, state.percent || 0));
  const isChecking = state.type === "checking";
  const isDownloading = state.type === "downloading";

  const mock = async (type, data = {}) => {
    await window.electronAPI.updater.mock(type, data);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
      <div className="border-b border-zinc-800 px-6 py-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              Update Center
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-50">
              Keep Solis current
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {status.description}
            </p>
          </div>

          <div
            className={[
              "rounded-md border px-2.5 py-1 text-xs font-medium",
              badgeClass(status.tone)
            ].join(" ")}
          >
            {status.label}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
              <div>
                <div className="text-xs text-zinc-500">Current version</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-zinc-200">
                  {state.currentVersion}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-zinc-500">Target</div>
                <div className="mt-1 font-mono text-sm tabular-nums text-zinc-200">
                  {state.updateVersion || "—"}
                </div>
              </div>
            </div>

            {(state.type === "available" ||
              state.type === "downloading" ||
              state.type === "downloaded") && (
              <div className="space-y-2.5">
                <div className="flex items-end justify-between gap-4">
                  <div className="font-mono text-xs tabular-nums text-zinc-400">
                    {progress.toFixed(1)}%
                  </div>

                  {state.type === "downloading" ? (
                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums text-zinc-500">
                      <span>{formatRate(state.bytesPerSecond)}</span>
                      <span>
                        {formatBytes(state.transferred)} /{" "}
                        {formatBytes(state.total)}
                      </span>
                    </div>
                  ) : (
                    <div className="font-mono text-xs tabular-nums text-zinc-500">
                      {state.type === "downloaded"
                        ? "Downloaded"
                        : "Ready to download"}
                    </div>
                  )}
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    className="h-full origin-left rounded-full bg-emerald-500"
                    animate={{ scaleX: progress / 100 }}
                    transition={{
                      type: "spring",
                      stiffness: 180,
                      damping: 26,
                      mass: 0.45
                    }}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            )}

            {state.message && (
              <motion.div
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm leading-5 text-red-300"
              >
                {state.message}
              </motion.div>
            )}
          </div>

          <div className="flex items-end sm:justify-end">
            {state.type === "available" && (
              <button
                type="button"
                className={\`\${buttonBase} border-zinc-700 bg-zinc-100 text-zinc-950 hover:bg-white\`}
                onClick={onDownload}
              >
                Download update
              </button>
            )}

            {state.type === "downloaded" && (
              <button
                type="button"
                className={\`\${buttonBase} border-emerald-400/30 bg-emerald-500 text-zinc-950 hover:bg-emerald-400\`}
                onClick={onInstall}
              >
                Restart to apply
              </button>
            )}

            {state.type !== "available" &&
              state.type !== "downloaded" &&
              !isDownloading && (
                <button
                  type="button"
                  className={\`\${buttonBase} border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800\`}
                  disabled={isChecking || state.type === "development"}
                  onClick={onCheck}
                >
                  {isChecking
                    ? "Checking…"
                    : state.type === "error"
                      ? "Try again"
                      : "Check for updates"}
                </button>
              )}

            {isDownloading && (
              <button
                type="button"
                className={\`\${buttonBase} border-zinc-800 bg-zinc-950 text-zinc-400\`}
                disabled
              >
                Downloading…
              </button>
            )}
          </div>
        </div>

        {development && (
          <details className="mt-6 border-t border-zinc-800 pt-5">
            <summary className="cursor-pointer select-none text-xs font-medium text-zinc-500 hover:text-zinc-300">
              Development state simulation
            </summary>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={\`\${buttonBase} h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200\`}
                onClick={() =>
                  mock("update-available", { version: "1.0.1" })
                }
              >
                Available
              </button>

              <button
                type="button"
                className={\`\${buttonBase} h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200\`}
                onClick={() =>
                  mock("download-progress", {
                    percent: 47.5,
                    bytesPerSecond: 8.4 * 1024 * 1024,
                    transferred: 47.5 * 1024 * 1024,
                    total: 100 * 1024 * 1024
                  })
                }
              >
                47.5%
              </button>

              <button
                type="button"
                className={\`\${buttonBase} h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200\`}
                onClick={() =>
                  mock("update-downloaded", { version: "1.0.1" })
                }
              >
                Downloaded
              </button>

              <button
                type="button"
                className={\`\${buttonBase} h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200\`}
                onClick={() =>
                  mock("error", {
                    message: "Mock updater failure."
                  })
                }
              >
                Error
              </button>

              <button
                type="button"
                className={\`\${buttonBase} h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200\`}
                onClick={() =>
                  mock("update-not-available", {
                    currentVersion: state.currentVersion,
                    development: false
                  })
                }
              >
                Up to date
              </button>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
