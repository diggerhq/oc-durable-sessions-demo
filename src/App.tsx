import { useCallback, useEffect, useState } from "react";
import { CodePanel } from "./components/CodePanel";
import { RunPanel } from "./components/RunPanel";
import {
  getDemoRun,
  loadDemoConfig,
  startDemoRun,
  type DemoConfig,
  type DemoRun,
  type DemoRunKind,
} from "./lib/api";
import { activeSlide, slides } from "./lib/demo";

const POLL_INTERVAL_MS = 900;

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [configError, setConfigError] = useState<string>();
  const [messages, setMessages] = useState<Record<DemoRunKind, string>>(() => ({
    agent: activeSlide.defaultMessage,
    security:
      slides.find((candidate) => candidate.runKind === "security")
        ?.defaultMessage ?? "",
    session:
      slides.find((candidate) => candidate.runKind === "session")
        ?.defaultMessage ?? "",
  }));
  const [runs, setRuns] = useState<Partial<Record<DemoRunKind, DemoRun>>>({});
  const [runErrors, setRunErrors] = useState<
    Partial<Record<DemoRunKind, string>>
  >({});
  const [startingRuns, setStartingRuns] = useState<
    Partial<Record<DemoRunKind, boolean>>
  >({});
  const slide = slides[activeIndex] ?? activeSlide;
  const runKind = slide.runKind;
  const message = messages[runKind];
  const run = runs[runKind] ?? null;
  const runError = runErrors[runKind];
  const starting = startingRuns[runKind] === true;
  const execution =
    runKind === "session"
      ? config?.durableSession.execution
      : config?.execution;
  const activeConfig =
    config && runKind === "session"
      ? {
          ...config,
          execution: config.durableSession.execution,
          missing: config.durableSession.missing,
        }
      : config;

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
    const polledKind = runKind;

    const refresh = () => {
      void getDemoRun(runId)
        .then((next) => {
          setRuns((current) => ({ ...current, [polledKind]: next }));
          setRunErrors((current) => ({
            ...current,
            [polledKind]: undefined,
          }));
        })
        .catch((error: unknown) => {
          setRunErrors((current) => ({
            ...current,
            [polledKind]:
              error instanceof Error
                ? error.message
                : "Could not refresh the run.",
          }));
        });
    };
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [run?.id, run?.state, runKind]);

  const start = useCallback(async () => {
    if (
      execution !== "live" ||
      !message.trim() ||
      starting ||
      run?.state === "running"
    ) {
      return;
    }

    const startedKind = runKind;
    setStartingRuns((current) => ({ ...current, [startedKind]: true }));
    setRuns((current) => {
      const next = { ...current };
      delete next[startedKind];
      return next;
    });
    setRunErrors((current) => ({ ...current, [startedKind]: undefined }));

    try {
      const next = await startDemoRun({
        kind: startedKind,
        message: message.trim(),
        requestId: crypto.randomUUID(),
      });
      setRuns((current) => ({ ...current, [startedKind]: next }));
    } catch (error) {
      setRunErrors((current) => ({
        ...current,
        [startedKind]:
          error instanceof Error ? error.message : "Could not start the run.",
      }));
    } finally {
      setStartingRuns((current) => ({ ...current, [startedKind]: false }));
    }
  }, [execution, message, run?.state, runKind, starting]);

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
            aria-current={index === activeIndex ? "page" : undefined}
            className={index === activeIndex ? "active" : ""}
            key={slide.id}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {slide.navLabel}
          </button>
        ))}
      </nav>

      <main className="workbench">
        <CodePanel slide={slide} />
        <RunPanel
          config={activeConfig}
          configError={configError}
          inputLabel={slide.inputLabel}
          message={message}
          onMessage={(value) =>
            setMessages((current) => ({ ...current, [runKind]: value }))
          }
          onRun={() => void start()}
          run={run}
          runError={runError}
          outputView={slide.outputView}
          slideLabel={slide.navLabel}
          starting={starting}
          targetLabel={
            slide.targetLabel ??
            (runKind === "session"
              ? `agent · ${config?.durableSession.agentId || "DEMO_SESSION_AGENT_ID"}`
              : config?.targetRepo ?? "")
          }
        />
      </main>
    </div>
  );
}
