import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UpdaterCard } from "./components/UpdaterCard";

const initialState = {
  type: "idle",
  currentVersion: "—",
  updateVersion: null,
  percent: 0,
  bytesPerSecond: 0,
  transferred: 0,
  total: 0,
  message: "",
  development: false
};

export default function App() {
  const [state, setState] = useState(initialState);
  const [development, setDevelopment] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) {
      setState((current) => ({
        ...current,
        type: "error",
        message: "Electron preload bridge is unavailable."
      }));
      return undefined;
    }

    let cleanup = () => {};
    let active = true;

    const initialize = async () => {
      try {
        const [version, isDevelopment] = await Promise.all([
          window.electronAPI.app.getVersion(),
          window.electronAPI.app.isDevelopment()
        ]);

        if (!active) {
          return;
        }

        setDevelopment(isDevelopment);
        setState((current) => ({
          ...current,
          currentVersion: version
        }));

        cleanup = window.electronAPI.updater.onEvent((event) => {
          setState((current) => {
            switch (event.type) {
              case "checking-for-update":
                return {
                  ...current,
                  type: "checking",
                  message: "",
                  development: false
                };

              case "update-available":
                return {
                  ...current,
                  type: "available",
                  updateVersion: event.version || null,
                  percent: 0,
                  bytesPerSecond: 0,
                  transferred: 0,
                  total: 0,
                  message: "",
                  development: false
                };

              case "update-not-available":
                return {
                  ...current,
                  type: event.development ? "development" : "not-available",
                  currentVersion:
                    event.currentVersion || current.currentVersion,
                  updateVersion: null,
                  percent: 0,
                  bytesPerSecond: 0,
                  transferred: 0,
                  total: 0,
                  message: "",
                  development: Boolean(event.development)
                };

              case "download-progress":
                return {
                  ...current,
                  type: "downloading",
                  percent: event.percent || 0,
                  bytesPerSecond: event.bytesPerSecond || 0,
                  transferred: event.transferred || 0,
                  total: event.total || 0,
                  message: "",
                  development: false
                };

              case "update-downloaded":
                return {
                  ...current,
                  type: "downloaded",
                  percent: 100,
                  updateVersion: event.version || current.updateVersion,
                  bytesPerSecond: 0,
                  message: "",
                  development: false
                };

              case "error":
                return {
                  ...current,
                  type: "error",
                  message: event.message || "The updater encountered an error.",
                  development: false
                };

              default:
                return current;
            }
          });
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          type: "error",
          message:
            error instanceof Error ? error.message : String(error)
        }));
      }
    };

    initialize();

    return () => {
      active = false;
      cleanup();
    };
  }, []);

  const handleCheck = async () => {
    setState((current) => ({
      ...current,
      type: "checking",
      message: ""
    }));

    const result = await window.electronAPI.updater.check();

    if (!result?.ok && result?.error) {
      setState((current) => ({
        ...current,
        type: "error",
        message: result.error
      }));
    }
  };

  const handleDownload = async () => {
    setState((current) => ({
      ...current,
      type: "downloading",
      percent: 0,
      message: ""
    }));

    const result = await window.electronAPI.updater.download();

    if (!result?.ok && result?.error) {
      setState((current) => ({
        ...current,
        type: "error",
        message: result.error
      }));
    }
  };

  const handleInstall = async () => {
    const result = await window.electronAPI.updater.install();

    if (!result?.ok && result?.error) {
      setState((current) => ({
        ...current,
        type: "error",
        message: result.error
      }));
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-8 py-10">
        <header className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Solis
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              Application center
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              A focused Electron foundation with secure IPC and release-driven
              updates.
            </p>
          </div>

          <div className="rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">
              Version
            </div>
            <div className="mt-1 font-mono text-sm tabular-nums text-zinc-200">
              {state.currentVersion}
            </div>
          </div>
        </header>

        <motion.section
          layout
          transition={{ layout: { duration: 0.22, ease: "easeOut" } }}
          className="mt-10"
        >
          <UpdaterCard
            state={state}
            development={development}
            onCheck={handleCheck}
            onDownload={handleDownload}
            onInstall={handleInstall}
          />
        </motion.section>

        <footer className="mt-auto pt-10 text-xs text-zinc-600">
          GitHub Releases is the distribution source for packaged updates.
        </footer>
      </div>
    </main>
  );
}
