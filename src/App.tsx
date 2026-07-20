import { useCallback, useEffect, useState } from "react";
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

  return (
    <div className="app-shell">
      <nav className="example-tabs" aria-label="Examples">
        {scenarios.map((item, index) => (
          <button
            aria-current={index === activeIndex ? "page" : undefined}
            className={index === activeIndex ? "active" : ""}
            key={item.id}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            {item.navLabel}
          </button>
        ))}
      </nav>

      <main className="workbench">
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
      </main>
    </div>
  );
}
