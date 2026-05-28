import { useMemo, useState } from "react";
import { GenogramSvg } from "./components/GenogramSvg";
import { computeDiagramLayout } from "./diagram/layout";
import { parseMarkdownGenogram } from "./domain/parse";
import { sampleMarkdown } from "./sample";

const STORAGE_KEY = "genogram-studio-markdown";
const MARKUP_REFERENCE_URL = "https://github.com/capttwinky/genogram-studio/blob/main/docs/gstu-markup-reference.md";

function readInitialMarkdown() {
  return localStorage.getItem(STORAGE_KEY) ?? sampleMarkdown;
}

export function App() {
  const [markdown, setMarkdown] = useState(readInitialMarkdown);
  const [editorOpen, setEditorOpen] = useState(true);
  const result = useMemo(() => parseMarkdownGenogram(markdown), [markdown]);
  const layout = useMemo(() => (result.ok ? computeDiagramLayout(result.graph) : undefined), [result]);

  function updateMarkdown(next: string) {
    setMarkdown(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  function resetSample() {
    updateMarkdown(sampleMarkdown);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Genogram Studio</h1>
          <p>Markdown JSON to interactive family and system diagrams</p>
        </div>
        <div className="toolbar" aria-label="Diagram actions">
          <a className="toolbar-link" href={MARKUP_REFERENCE_URL} target="_blank" rel="noreferrer">Markup reference</a>
          <button type="button" onClick={() => setEditorOpen((value) => !value)}>{editorOpen ? "Hide editor" : "Show editor"}</button>
          <button type="button" onClick={resetSample}>Reset sample</button>
        </div>
      </header>

      <section className={`workspace ${editorOpen ? "with-editor" : "viewer-only"}`}>
        {editorOpen && (
          <aside className="editor-pane" aria-label="Markdown input">
            <div className="pane-header">
              <h2>Markdown</h2>
              <span>{markdown.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={markdown}
              onChange={(event) => updateMarkdown(event.target.value)}
              spellCheck={false}
              aria-label="Markdown containing a genogram-json fenced block"
            />
          </aside>
        )}

        <section className="diagram-pane" aria-label="Rendered genogram">
          <div className="status-row">
            {result.warning && <span className="status warning">{result.warning}</span>}
            {result.ok ? (
              <>
                <span className="status ok">{result.graph.people.length} people · {result.graph.unions.length} unions · {result.graph.emotionalRelationships.length} emotional links</span>
                {layout?.warnings.map((warning) => (
                  <span key={warning.code} className="status warning">{warning.message}</span>
                ))}
              </>
            ) : (
              <span className="status error">{result.issues.length} validation issue{result.issues.length === 1 ? "" : "s"}</span>
            )}
          </div>

          <div className="canvas-frame">
            {!result.ok ? (
              <div className="empty-state">
                <h2>Diagram cannot render</h2>
                <ul>
                  {result.issues.map((issue, index) => (
                    <li key={`${issue.path}-${index}`}>
                      {issue.path && <strong>{issue.path}: </strong>}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              layout && <GenogramSvg layout={layout} />
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
