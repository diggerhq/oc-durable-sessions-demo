import type {
  ExecutionMode,
  ScenarioConfig,
  SessionReceipt,
} from "../lib/api";
import type { DemoScenario } from "../lib/scenarios";

export type RunViewState =
  | { state: "idle" }
  | { state: "running" }
  | { state: "success"; receipt: SessionReceipt }
  | { state: "error"; message: string };

interface RunPanelProps {
  scenario: DemoScenario;
  config: ScenarioConfig | null;
  configError?: string;
  input: string;
  run: RunViewState;
  onInput: (value: string) => void;
  onRun: () => void;
}

const modeLabel: Record<ExecutionMode, string> = {
  checking: "Checking",
  live: "Live",
  "stand-in": "Live stand-in",
  simulated: "Mock",
  unavailable: "Not configured",
};

export function RunPanel({
  scenario,
  config,
  configError,
  input,
  run,
  onInput,
  onRun,
}: RunPanelProps) {
  const execution: ExecutionMode = config?.execution ?? "checking";
  const shownExecution = configError ? "unavailable" : execution;
  const unavailable = shownExecution === "unavailable";
  const running = run.state === "running";

  return (
    <section className="run-panel" aria-label="Run session">
      <header className="panel-header run-panel-header">
        <span>Result</span>
        <span
          className={`execution-badge execution-${shownExecution}`}
          title={configError ?? config?.detail}
        >
          <i aria-hidden="true" />
          {modeLabel[shownExecution]}
        </span>
      </header>

      <div className="task-editor">
        <label htmlFor="demo-task">Input</label>
        <textarea
          id="demo-task"
          value={input}
          onChange={(event) => onInput(event.target.value)}
          rows={3}
          spellCheck={false}
        />
        <div className="task-actions">
          <span>{scenario.runtime}</span>
          <button
            className="run-button"
            disabled={running || unavailable || !input.trim()}
            onClick={onRun}
            type="button"
          >
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      <div className="receipt-area" aria-live="polite">
        {run.state === "idle" && (
          <div className="receipt-empty">
            {configError ?? (unavailable ? config?.detail : "No result")}
          </div>
        )}

        {run.state === "running" && (
          <div className="receipt-empty receipt-running">
            <span className="button-spinner" aria-hidden="true" />
            Creating session…
          </div>
        )}

        {run.state === "error" && (
          <div className="receipt-error">
            <strong>Error</strong>
            <p>{run.message}</p>
            <button className="text-button" onClick={onRun} type="button">
              Retry
            </button>
          </div>
        )}

        {run.state === "success" && (
          <div className="receipt-success">
            <div className="receipt-summary">
              <div>
                <span>Session</span>
                <strong>{run.receipt.session.id}</strong>
              </div>
              <span className="receipt-status">{run.receipt.session.status}</span>
            </div>

            <div className="receipt-facts">
              <span>{run.receipt.durationMs} ms</span>
              <span>{modeLabel[run.receipt.execution]}</span>
              {run.receipt.session.revision !== undefined && (
                <span>revision {run.receipt.session.revision}</span>
              )}
            </div>

            {run.receipt.dashboardUrl && (
              <a
                className="dashboard-link"
                href={run.receipt.dashboardUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open session ↗
              </a>
            )}

            <pre className="response-json">
              {JSON.stringify(run.receipt.response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}
