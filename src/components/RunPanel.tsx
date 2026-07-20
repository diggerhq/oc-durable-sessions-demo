import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  Play,
  RotateCcw,
} from "lucide-react";
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
  checking: "Checking wiring",
  live: "Live public call",
  "stand-in": "Live stand-in",
  simulated: "Simulated",
  unavailable: "Needs config",
};

function ModeBadge({
  execution,
}: {
  execution: ExecutionMode;
}) {
  return (
    <span className={`execution-badge execution-${execution}`}>
      <span className="execution-dot" aria-hidden="true" />
      {modeLabel[execution]}
    </span>
  );
}

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
  const unavailable = execution === "unavailable" || Boolean(configError);
  const running = run.state === "running";

  return (
    <section className="run-panel" aria-label="Run session">
      <header className="panel-header run-panel-header">
        <span>Run receipt</span>
        <ModeBadge execution={configError ? "unavailable" : execution} />
      </header>

      <div className="task-editor">
        <label htmlFor="demo-task">Task</label>
        <textarea
          id="demo-task"
          value={input}
          onChange={(event) => onInput(event.target.value)}
          rows={3}
          spellCheck={false}
        />
        <div className="task-actions">
          <span className="runtime-readout">
            runtime / <strong>{scenario.runtime}</strong>
          </span>
          <button
            className="run-button"
            disabled={running || unavailable || !input.trim()}
            onClick={onRun}
            type="button"
          >
            {running ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Creating
              </>
            ) : (
              <>
                <Play aria-hidden="true" fill="currentColor" size={14} />
                Run session
              </>
            )}
          </button>
        </div>
      </div>

      <div className="receipt-area" aria-live="polite">
        {run.state === "idle" && (
          <div className="receipt-empty">
            <div className="empty-mark" aria-hidden="true">
              <span>→</span>
            </div>
            <p>Run the example to create a durable session receipt.</p>
            <small>{configError ?? config?.detail ?? "Reading local configuration…"}</small>
          </div>
        )}

        {run.state === "running" && (
          <div className="receipt-running">
            <div className="orbit" aria-hidden="true">
              <span />
            </div>
            <p>Creating the session</p>
            <small>The agent result continues asynchronously.</small>
          </div>
        )}

        {run.state === "error" && (
          <div className="receipt-error">
            <CircleAlert aria-hidden="true" size={26} strokeWidth={1.6} />
            <div>
              <strong>Session was not created</strong>
              <p>{run.message}</p>
            </div>
            <button className="text-button" onClick={onRun} type="button">
              <RotateCcw aria-hidden="true" size={13} />
              Try again
            </button>
          </div>
        )}

        {run.state === "success" && (
          <div className="receipt-success">
            <div className="receipt-summary">
              <div className="success-icon" aria-hidden="true">
                <Check size={16} strokeWidth={2.4} />
              </div>
              <div>
                <span className="receipt-kicker">Session created</span>
                <strong>{run.receipt.session.id}</strong>
              </div>
              <span className="receipt-status">{run.receipt.session.status}</span>
            </div>

            <div className="receipt-facts">
              <span>
                <Clock3 aria-hidden="true" size={13} />
                {run.receipt.durationMs} ms
              </span>
              <span>{modeLabel[run.receipt.execution]}</span>
              {run.receipt.session.revision !== undefined && (
                <span>revision {run.receipt.session.revision}</span>
              )}
            </div>

            {run.receipt.dashboardUrl ? (
              <a
                className="dashboard-link"
                href={run.receipt.dashboardUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open live session in OpenComputer
                <ArrowUpRight aria-hidden="true" size={16} />
              </a>
            ) : (
              <div className="mock-notice">
                Simulated receipt · dashboard link appears on a live run
              </div>
            )}

            <div className="json-label">
              <span>safe response</span>
              <span>client token redacted</span>
            </div>
            <pre className="response-json">
              {JSON.stringify(run.receipt.response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

