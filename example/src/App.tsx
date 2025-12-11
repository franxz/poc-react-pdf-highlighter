import React, { useState, useEffect, useCallback, useRef } from "react";

import {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip,
} from "./react-pdf-highlighter";
import type {
  Content,
  IHighlight,
  NewHighlight,
  ScaledPosition,
} from "./react-pdf-highlighter";

import { Sidebar } from "./Sidebar";
import { Spinner } from "./Spinner";
import {
  testHighlights as _testHighlights,
  martinFierroTestHighlights,
} from "./test-highlights";

import "./style/App.css";
import "../../dist/style.css";
import { CLIENT_PDF_URLS } from "./constants";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const HighlightPopup = ({ comment }) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480";
const NEW_PDF_URL =
  "/react-pdf-highlighter/hernandez_jose_-_el_gaucho_martin_fierro.pdf";

export function App() {
  const searchParams = new URLSearchParams(document.location.search);
  const initialUrl = searchParams.get("url") || CLIENT_PDF_URLS[0];

  const [url, setUrl] = useState(initialUrl);
  const [highlights, setHighlights] = useState<Array<IHighlight>>(() => {
    const saved = localStorage.getItem(`highlights:${initialUrl}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return testHighlights[initialUrl] ? [...testHighlights[initialUrl]] : [];
  });

  const resetHighlights = () => {
    setHighlights([]);
    localStorage.removeItem(`highlights:${url}`);
  };

  const toggleDocument = (index: number) => {
    const newUrl = CLIENT_PDF_URLS[index];
    setUrl(newUrl);

    const saved = localStorage.getItem(`highlights:${newUrl}`);
    if (saved) {
      try {
        setHighlights(JSON.parse(saved));
        return;
      } catch {}
    }

    if (
      newUrl ===
      "/react-pdf-highlighter/hernandez_jose_-_el_gaucho_martin_fierro.pdf"
    ) {
      setHighlights(martinFierroTestHighlights);
      return;
    }

    setHighlights(testHighlights[newUrl] ? [...testHighlights[newUrl]] : []);
  };

  const scrollViewerTo = useRef((highlight: IHighlight) => {});

  const scrollToHighlightFromHash = () => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) scrollViewerTo.current(highlight);
  };

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () =>
      window.removeEventListener(
        "hashchange",
        scrollToHighlightFromHash,
        false
      );
  }, [scrollToHighlightFromHash]);

  const getHighlightById = (id: string) =>
    highlights.find((highlight) => highlight.id === id);

  const addHighlight = (highlight: NewHighlight) => {
    setHighlights((prev) => [{ ...highlight, id: getNextId() }, ...prev]);
  };

  const updateHighlight = (highlightId, position, content) => {
    setHighlights((prev) =>
      prev.map((h) => {
        if (h.id !== highlightId) return h;

        return {
          ...h,
          position: { ...h.position, ...position },
          content: { ...h.content, ...content },
        };
      })
    );
  };

  useEffect(() => {
    localStorage.setItem(`highlights:${url}`, JSON.stringify(highlights));
  }, [highlights, url]);

  // 👇 NUEVO: Sentinel + IntersectionObserver + callback
  const sentinelRef = useRef(null);

  const onReachEnd = useCallback(() => {
    console.log("👇 Llegaste al final del PDF");

    // ejemplo simple: saltar al siguiente PDF
    const idx = CLIENT_PDF_URLS.indexOf(url);
    const nextIdx = (idx + 1) % CLIENT_PDF_URLS.length;
    setUrl(CLIENT_PDF_URLS[nextIdx]);

    // podés también concatenar PDFs, cargar más, mostrar loader, etc.
  }, [url]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) onReachEnd();
        });
      },
      {
        root: null,
        threshold: 1,
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onReachEnd]);

  return (
    <div className="App" style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        highlights={highlights}
        resetHighlights={resetHighlights}
        toggleDocument={toggleDocument}
      />

      <div
        style={{
          height: "100vh",
          width: "75vw",
          position: "relative",
          overflowY: "auto",
        }}
      >
        <PdfLoader url={url} beforeLoad={<Spinner />}>
          {(pdfDocument) => (
            <>
              <PdfHighlighter
                pdfDocument={pdfDocument}
                enableAreaSelection={(event) => event.altKey}
                onScrollChange={resetHash}
                scrollRef={(scrollTo, viewerContainer) => {
                  const handleScroll = () => {
                    const isBottom =
                      viewerContainer.scrollTop +
                        viewerContainer.clientHeight >=
                      viewerContainer.scrollHeight - 1;

                    if (isBottom) {
                      onReachEnd();
                    }
                  };

                  viewerContainer.addEventListener("scroll", handleScroll);
                }}
                onSelectionFinished={(
                  position,
                  content,
                  hideTipAndSelection,
                  transformSelection
                ) => (
                  <Tip
                    onOpen={transformSelection}
                    onConfirm={(comment) => {
                      addHighlight({ content, position, comment });
                      hideTipAndSelection();
                    }}
                  />
                )}
                highlightTransform={(
                  highlight,
                  index,
                  setTip,
                  hideTip,
                  viewportToScaled,
                  screenshot,
                  isScrolledTo
                ) => {
                  const isText = !highlight.content?.image;
                  const component = isText ? (
                    <Highlight
                      isScrolledTo={isScrolledTo}
                      position={highlight.position}
                      comment={highlight.comment}
                    />
                  ) : (
                    <AreaHighlight
                      isScrolledTo={isScrolledTo}
                      highlight={highlight}
                      onChange={(boundingRect) => {
                        updateHighlight(
                          highlight.id,
                          { boundingRect: viewportToScaled(boundingRect) },
                          { image: screenshot(boundingRect) }
                        );
                      }}
                    />
                  );

                  return (
                    <Popup
                      popupContent={<HighlightPopup {...highlight} />}
                      onMouseOver={(popupContent) =>
                        setTip(highlight, () => popupContent)
                      }
                      onMouseOut={hideTip}
                      key={index}
                    >
                      {component}
                    </Popup>
                  );
                }}
                highlights={highlights}
              />

              {/* 👇 NUEVO: S I N T I N E L FINAL DEL PDF */}
              <div ref={sentinelRef} style={{ height: 1 }} />
            </>
          )}
        </PdfLoader>
      </div>
    </div>
  );
}
