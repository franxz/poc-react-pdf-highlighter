import type { IHighlight } from "./react-pdf-highlighter";
import { CLIENT_PDF_URLS } from "./constants";

interface Props {
  highlights: Array<IHighlight>;
  resetHighlights: () => void;
  toggleDocument: (index: number) => void;
}

const updateHash = (highlight: IHighlight) => {
  document.location.hash = `highlight-${highlight.id}`;
};

declare const APP_VERSION: string;

export function Sidebar({
  highlights,
  toggleDocument,
  resetHighlights,
}: Props) {
  return (
    <div className="sidebar" style={{ width: "25vw" }}>
      <div
        className="description"
        style={{ padding: "1rem", backgroundColor: "#212121ff" }}
      >
        <h2 style={{ marginBottom: "1rem" }}>
          🧙‍♂️ Arcadia .pdf highlighter POC
          {/* react-pdf-highlighter {APP_VERSION} */}
        </h2>

        {/* <p style={{ fontSize: "0.7rem" }}>
          <a href="https://github.com/agentcooper/react-pdf-highlighter">
            Open in GitHub
          </a>
        </p> */}

        {/* <p>
          <small>
            To create area highlight hold ⌥ Option key (Alt), then click and
            drag.
          </small>
        </p> */}
      </div>
      <div style={{ padding: "1rem" }}>
        {CLIENT_PDF_URLS.map((url, idx) => (
          <button
            key={url}
            type="button"
            onClick={() => toggleDocument(idx)}
            style={{
              display: "block",
              marginBottom: "0.7rem",
              width: "100%",
              padding: "0.7rem 1rem",
              border: "1px solid #e0e4ea",
              borderRadius: "0.45rem",
              background: "#fff",
              color: "#22304a",
              fontWeight: 500,
              fontSize: "1.02rem",
              letterSpacing: "0.01em",
              boxShadow: "0 1px 4px 0 rgba(60,80,180,0.04)",
              cursor: "pointer",
              outline: "none",
              transition:
                "background 0.15s, color 0.15s, border 0.15s, transform 0.09s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#f4f7fb";
              e.currentTarget.style.color = "#174ea6";
              e.currentTarget.style.border = "1px solid #b3c6e0";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "#22304a";
              e.currentTarget.style.border = "1px solid #e0e4ea";
            }}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.98)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span
              style={{
                display: "inline-block",
                background: "#485361ff",
                borderRadius: "100%",
                padding: "0.2em",
                marginRight: "0.5em",
              }}
              aria-label="PDF"
            >
              📄
            </span>
            {url.replace("/react-pdf-highlighter/", "")}
          </button>
        ))}
      </div>
      {highlights.length > 0 ? (
        <div
          style={{
            padding: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.2em",
            borderTop: "1px solid #e0e4ea",
            borderBottom: "1px solid #e0e4ea",
            backgroundColor: "#fff",
            marginTop: "1.8rem",
          }}
        >
          <span
            style={{
              fontSize: "1.2em",
              color: "#485361",
              fontWeight: 600,
              letterSpacing: "0.01em",
            }}
          >
            Notas
          </span>
          <button
            type="button"
            onClick={resetHighlights}
            style={{
              padding: "0.45em 1.1em",
              border: "1px solid #e0e4ea",
              borderRadius: "0.45rem",
              background: "#fff",
              color: "#22304a",
              fontWeight: 500,
              fontSize: "0.98rem",
              cursor: "pointer",
              outline: "none",
              transition:
                "background 0.15s, color 0.15s, border 0.15s, transform 0.09s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#f4f7fb";
              e.currentTarget.style.color = "#174ea6";
              e.currentTarget.style.border = "1px solid #b3c6e0";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "#22304a";
              e.currentTarget.style.border = "1px solid #e0e4ea";
            }}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.98)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Borrar notas
          </button>
        </div>
      ) : null}
      <ul className="sidebar__highlights" style={{ marginTop: "0" }}>
        {highlights.map((highlight, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: This is an example app
            key={index}
            className="sidebar__highlight"
            onClick={() => {
              updateHash(highlight);
            }}
          >
            <div>
              <strong>{highlight.comment.text}</strong>
              {highlight.content.text ? (
                <blockquote style={{ marginTop: "0.5rem" }}>
                  {`${highlight.content.text.slice(0, 90).trim()}…`}
                </blockquote>
              ) : null}
              {highlight.content.image ? (
                <div
                  className="highlight__image"
                  style={{ marginTop: "0.5rem" }}
                >
                  <img src={highlight.content.image} alt={"Screenshot"} />
                </div>
              ) : null}
            </div>
            <div className="highlight__location">
              Page {highlight.position.pageNumber}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
