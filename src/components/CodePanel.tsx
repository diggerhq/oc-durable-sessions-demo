import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import type { CodeViewId, DemoSlide } from "../lib/demo";

interface CodePanelProps {
  slide: DemoSlide;
}

export function CodePanel({ slide }: CodePanelProps) {
  const [viewId, setViewId] = useState<CodeViewId>("concept");
  const view =
    slide.codeViews.find((candidate) => candidate.id === viewId) ??
    slide.codeViews[0];

  return (
    <section className="code-panel" aria-label={`${slide.navLabel} SDK example`}>
      <header className="panel-header code-panel-header">
        <span>{view.filename}</span>
        <div aria-label="Code view" className="code-view-switch">
          {slide.codeViews.map((candidate) => (
            <button
              aria-pressed={candidate.id === view.id}
              className={candidate.id === view.id ? "active" : ""}
              key={candidate.id}
              onClick={() => setViewId(candidate.id)}
              type="button"
            >
              {candidate.label}
            </button>
          ))}
        </div>
      </header>

      <div className="code-scroll" key={view.id} tabIndex={0}>
        <Highlight
          theme={themes.vsDark}
          code={view.code}
          language="tsx"
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} code-block`}
              style={{ ...style, background: "transparent" }}
            >
              {tokens.map((line, index) => {
                const lineNumber = index + 1;
                const emphasized = view.emphasisLines.includes(lineNumber);
                return (
                  <div
                    {...getLineProps({ line })}
                    className={`code-line${emphasized ? " is-emphasized" : ""}`}
                    key={`${slide.id}-${view.id}-${lineNumber}`}
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
