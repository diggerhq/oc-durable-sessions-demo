import { useCallback, useEffect, useState } from "react";
import { CodePanel } from "./components/CodePanel";
import { RunPanel } from "./components/RunPanel";
import {
  getDemoRun,
  loadDemoConfig,
  startDemoRun,
  type DemoConfig,
  type DemoRun,
} from "./lib/api";
import { activeSlide, slides } from "./lib/demo";

const POLL_INTERVAL_MS = 900;

export default function App() {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [configError, setConfigError] = useState<string>();
  const [message, setMessage] = useState(activeSlide.defaultMessage);
  const [run, setRun] = useState<DemoRun | null>(null);
  const [runError, setRunError] = useState<string>();
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void loadDemoConfig()
      .then((next) => {
        setConfig(next);
        setConfigError(undefined);
      })
      .catch((error: unknown) => {
        setConfigError(
          error instanceof Error
            ? error.message
            : "The local demo API is unavailable.",
        );
      });
  }, []);

  useEffect(() => {
    const runId = run?.state === "running" ? run.id : undefined;
    if (!runId) return;

    const refresh = () => {
      void getDemoRun(runId)
        .then((next) => {
          setRun(next);
          setRunError(undefined);
        })
        .catch((error: unknown) => {
          setRunError(
            error instanceof Error ? error.message : "Could not refresh the run.",
          );
        });
    };
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [run?.id, run?.state]);

  const start = useCallback(async () => {
    if (
      config?.execution !== "live" ||
      !message.trim() ||
      starting ||
      run?.state === "running"
    ) {
      return;
    }

    setStarting(true);
    setRun(null);
    setRunError(undefined);

    try {
      setRun(
        await startDemoRun({
          message: message.trim(),
          requestId: crypto.randomUUID(),
        }),
      );
    } catch (error) {
      setRunError(
        error instanceof Error ? error.message : "Could not start the run.",
      );
    } finally {
      setStarting(false);
    }
  }, [config?.execution, message, run?.state, starting]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "r" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      void start();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [start]);

  return (
    <div className="app-shell">
      <nav className="example-tabs" aria-label="Demo steps">
        {slides.map((slide, index) => (
          <button
            aria-current="page"
            className="active"
            key={slide.id}
            type="button"
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {slide.navLabel}
          </button>
        ))}
      </nav>

      <main className="workbench">
        <CodePanel slide={activeSlide} />
        <RunPanel
          config={config}
          configError={configError}
          message={message}
          onMessage={setMessage}
          onRun={() => void start()}
          run={run}
          runError={runError}
          starting={starting}
        />
      </main>
    </div>
  );
}
