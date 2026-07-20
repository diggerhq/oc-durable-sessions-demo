import { Highlight, themes } from "prism-react-renderer";
import type { DemoScenario } from "../lib/scenarios";

interface CodePanelProps {
  scenario: DemoScenario;
}

export function CodePanel({ scenario }: CodePanelProps) {
  return (
    <section className="code-panel" aria-label={`${scenario.navLabel} SDK example`}>
      <header className="panel-header code-panel-header">
        <span>start-session.ts</span>
        <span className={`contract-tag contract-${scenario.contractKind}`}>
          {scenario.contractLabel}
        </span>
      </header>

      <div className="code-scroll" tabIndex={0}>
        <Highlight
          theme={themes.vsDark}
          code={scenario.code}
          language="tsx"
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} code-block`}
              style={{ ...style, background: "transparent" }}
            >
              {tokens.map((line, index) => {
                const lineNumber = index + 1;
                const emphasized = scenario.emphasisLines.includes(lineNumber);
                return (
                  <div
                    {...getLineProps({ line })}
                    className={`code-line${emphasized ? " is-emphasized" : ""}`}
                    key={`${scenario.id}-${lineNumber}`}
                  >
                    <span className="line-number" aria-hidden="true">
                      {String(lineNumber).padStart(2, "0")}
                    </span>
                    <span className="line-source">
                      {line.map((token, tokenIndex) => (
                        <span
                          {...getTokenProps({ token })}
                          key={`${lineNumber}-${tokenIndex}`}
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </section>
  );
}
