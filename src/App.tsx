import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { CodePanel } from "./components/CodePanel";
import { RunPanel, type RunViewState } from "./components/RunPanel";
import {
  createDemoSession,
  loadDemoConfig,
  type DemoConfig,
} from "./lib/api";
import { scenarios, type ScenarioId } from "./lib/scenarios";

function mapScenarios<T>(factory: (id: ScenarioId) => T): Record<ScenarioId, T> {
  return Object.fromEntries(
    scenarios.map((scenario) => [scenario.id, factory(scenario.id)]),
  ) as Record<ScenarioId, T>;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function initialScenarioIndex(): number {
  const requested = new URLSearchParams(window.location.search).get("step");
  const index = scenarios.findIndex((scenario) => scenario.id === requested);
  return index >= 0 ? index : 0;
}

export default function App() {
  const [activeIndex, setActiveIndex] = useState(initialScenarioIndex);
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [configError, setConfigError] = useState<string>();
  const [notesVisible, setNotesVisible] = useState(false);
  const [inputs, setInputs] = useState(() =>
    mapScenarios(
      (id) => scenarios.find((scenario) => scenario.id === id)!.defaultInput,
    ),
  );
  const [runs, setRuns] = useState<Record<ScenarioId, RunViewState>>(() =>
    mapScenarios(() => ({ state: "idle" })),
  );

  const scenario = scenarios[activeIndex];
  const run = runs[scenario.id];

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", scenario.id);
    window.history.replaceState(null, "", url);
  }, [scenario.id]);

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

  const move = useCallback((direction: -1 | 1) => {
    setActiveIndex((current) =>
      Math.min(scenarios.length - 1, Math.max(0, current + direction)),
    );
  }, []);

  const runScenario = useCallback(async () => {
    const current = scenarios[activeIndex];
    const input = inputs[current.id].trim();
    if (!input || runs[current.id].state === "running") return;

    setRuns((previous) => ({
      ...previous,
      [current.id]: { state: "running" },
    }));

    try {
      const receipt = await createDemoSession({
        scenario: current.id,
        input,
        requestId: crypto.randomUUID(),
      });
      setRuns((previous) => ({
        ...previous,
        [current.id]: { state: "success", receipt },
      }));
    } catch (error) {
      setRuns((previous) => ({
        ...previous,
        [current.id]: {
          state: "error",
          message:
            error instanceof Error ? error.message : "The session run failed.",
        },
      }));
    }
  }, [activeIndex, inputs, runs]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key.toLowerCase() === "r") void runScenario();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move, runScenario]);

  const wiringSummary = useMemo(() => {
    if (configError) return "Local adapter offline";
    if (!config) return "Reading local wiring";
    const liveCount = Object.values(config.scenarios).filter(
      ({ execution }) => execution === "live" || execution === "stand-in",
    ).length;
    return liveCount
      ? `${liveCount} of ${scenarios.length} steps wired live`
      : "Mock-ready · no keys required";
  }, [config, configError]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="OpenComputer demo home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>OpenComputer</span>
        </a>
        <div className="header-context">
          <span>Durable Agent Sessions</span>
          <span className="header-divider" aria-hidden="true" />
          <span className="prototype-label">Demo studio</span>
        </div>
        <div className="wiring-summary">
          <span aria-hidden="true" />
          {wiringSummary}
        </div>
      </header>

      <main>
        <section className="story-intro">
          <p className="story-index">A six-step product story</p>
          <h1>
            <span>One session call.</span>
            <em>Any agent behind it.</em>
          </h1>
          <p className="story-deck">
            Start with a runtime. Grow into a versioned repository. Own the
            implementation when you need to.
          </p>
        </section>

        <nav className="step-rail" aria-label="Demo steps">
          {scenarios.map((item, index) => (
            <button
              aria-current={index === activeIndex ? "step" : undefined}
              className={index === activeIndex ? "active" : ""}
              key={item.id}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <span>{item.step}</span>
              {item.navLabel}
            </button>
          ))}
        </nav>

        <section className="scene" key={scenario.id}>
          <header className="scene-header">
            <div>
              <p>{scenario.eyebrow}</p>
              <h2>{scenario.title}</h2>
            </div>
            <p className="scene-description">{scenario.description}</p>
          </header>

          <div className="workbench">
            <CodePanel scenario={scenario} />
            <RunPanel
              config={config?.scenarios[scenario.id] ?? null}
              configError={configError}
              input={inputs[scenario.id]}
              onInput={(value) =>
                setInputs((previous) => ({
                  ...previous,
                  [scenario.id]: value,
                }))
              }
              onRun={() => void runScenario()}
              run={run}
              scenario={scenario}
            />
          </div>
        </section>

        <aside className={`presenter-note${notesVisible ? " is-open" : ""}`}>
          <button
            aria-expanded={notesVisible}
            onClick={() => setNotesVisible((visible) => !visible)}
            type="button"
          >
            {notesVisible ? (
              <EyeOff aria-hidden="true" size={14} />
            ) : (
              <Eye aria-hidden="true" size={14} />
            )}
            Presenter notes
          </button>
          {notesVisible && (
            <p>
              <span>{scenario.step}</span>
              {scenario.presenterNote}
            </p>
          )}
        </aside>
      </main>

      <footer className="app-footer">
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd>
          navigate
        </span>
        <span>
          <kbd>R</kbd>
          run
        </span>
        <div className="footer-nav">
          <button
            aria-label="Previous step"
            disabled={activeIndex === 0}
            onClick={() => move(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={15} />
          </button>
          <span>
            {scenario.step} / {String(scenarios.length).padStart(2, "0")}
          </span>
          <button
            aria-label="Next step"
            disabled={activeIndex === scenarios.length - 1}
            onClick={() => move(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={15} />
          </button>
        </div>
      </footer>
    </div>
  );
}
