import type { DemoConfig, DemoRun } from "../lib/api";

interface RunPanelProps {
  config: DemoConfig | null;
  configError?: string;
  message: string;
  run: DemoRun | null;
  runError?: string;
  outputView: "progress" | "messages";
  slideLabel: string;
  starting: boolean;
  onMessage: (value: string) => void;
  onRun: () => void;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1_000) return `${milliseconds} ms`;
  return `${(milliseconds / 1_000).toFixed(milliseconds < 10_000 ? 1 : 0)} s`;
}

export function RunPanel({
  config,
  configError,
  message,
  run,
  runError,
  outputView,
  slideLabel,
  starting,
  onMessage,
  onRun,
}: RunPanelProps) {
  const configured = config?.execution === "live" && !configError;
  const running = starting || run?.state === "running";
  const buttonLabel = running ? "Running…" : run ? "Run again" : "Run";

  return (
    <section className="run-panel" aria-label={`Run ${slideLabel} example`}>
      <header className="panel-header run-panel-header">
        <span>Run</span>
        <span
          className={`execution-badge execution-${configured ? "live" : "unavailable"}`}
          title={configError ?? config?.missing.join(", ")}
        >
          <i aria-hidden="true" />
          {configured ? "Live" : "Not configured"}
        </span>
      </header>

      <div className="task-editor">
        <label htmlFor="slack-message">Slack message</label>
        <textarea
          disabled={running}
          id="slack-message"
          value={message}
          onChange={(event) => onMessage(event.target.value)}
          rows={5}
          spellCheck={false}
        />
        <div className="task-actions">
          <span>{config?.targetRepo ?? "—"}</span>
          <button
            className="run-button"
            disabled={running || !configured || !message.trim()}
            onClick={onRun}
            type="button"
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      <div className="receipt-area" aria-live="polite">
        {!run && !starting && !runError && (
          <div className="receipt-empty">
            {configError ??
              (config?.execution === "unavailable"
                ? `Missing ${config.missing.join(", ")}`
                : "No run")}
          </div>
        )}

        {starting && !run && (
          <div className="receipt-empty receipt-running">
            <span className="button-spinner" aria-hidden="true" />
            Starting…
          </div>
        )}

        {runError && !run && (
          <div className="receipt-error">
            <strong>Error</strong>
            <p>{runError}</p>
            <button className="text-button" onClick={onRun} type="button">
              Retry
            </button>
          </div>
        )}

        {run && (
          <div className="receipt-success">
            {run.sandbox && (
              <div className="receipt-summary">
                <div>
                  <span>Sandbox</span>
                  <strong>{run.sandbox.id}</strong>
                </div>
                <span className={`receipt-status status-${run.state}`}>
                  {run.state}
                </span>
              </div>
            )}

            {outputView === "progress" ? (
              <ol className="progress-list">
                {run.progress.map((item, index) => {
                  const current =
                    run.state === "running" &&
                    index === run.progress.length - 1;
                  return (
                    <li
                      className={current ? "current" : ""}
                      key={`${item.at}-${item.stage}`}
                    >
                      <span aria-hidden="true" />
                      <div>
                        <strong>{item.label}</strong>
                        <time dateTime={item.at}>
                          {new Date(item.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="message-stream">
                {run.messages.length === 0 ? (
                  <div className="message-stream-empty">
                    {run.state === "running" && (
                      <span className="button-spinner" aria-hidden="true" />
                    )}
                    {run.state === "running"
                      ? "Waiting for sandbox stdout…"
                      : "No assistant messages received."}
                  </div>
                ) : (
                  run.messages.map((item) => (
                    <article className="sandbox-message" key={item.id}>
                      <header>
                        <strong>Agent</strong>
                        <time dateTime={item.at}>
                          {new Date(item.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </time>
                      </header>
                      <pre>
                        {item.text}
                        {item.state === "streaming" && (
                          <span className="message-cursor" aria-hidden="true">
                            ▌
                          </span>
                        )}
                      </pre>
                    </article>
                  ))
                )}
              </div>
            )}

            <div className="receipt-facts">
              <span>{formatDuration(run.durationMs)}</span>
              {outputView === "messages" && (
                <span>
                  {run.messages.length} message
                  {run.messages.length === 1 ? "" : "s"}
                </span>
              )}
              {run.branch && <span>{run.branch}</span>}
              {run.claudeSessionId && <span>claude {run.claudeSessionId}</span>}
            </div>

            <div className="result-links">
              {run.sandbox && (
                <a
                  href={run.sandbox.dashboardUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open sandbox ↗
                </a>
              )}
              {run.pullRequestUrl && (
                <a href={run.pullRequestUrl} rel="noreferrer" target="_blank">
                  Open pull request ↗
                </a>
              )}
            </div>

            {run.error && (
              <pre className="run-output output-error">{run.error}</pre>
            )}
            {run.result && outputView === "progress" && (
              <pre className="run-output">{run.result}</pre>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
