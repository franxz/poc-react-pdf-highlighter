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
  const [currentIndex, setCurrentIndex] = useState(
    CLIENT_PDF_URLS.indexOf(initialUrl) >= 0
      ? CLIENT_PDF_URLS.indexOf(initialUrl)
      : 0
  );

  const [highlights, setHighlights] = useState<Array<IHighlight>>(() => {
    const saved = localStorage.getItem(`highlights:${initialUrl}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return testHighlights[initialUrl] ? [...testHighlights[initialUrl]] : [];
  });

  const isTransitioningRef = useRef(false);

  const resetHighlights = () => {
    setHighlights([]);
    localStorage.removeItem(`highlights:${url}`);
  };

  const toggleDocument = (index: number) => {
    const newUrl = CLIENT_PDF_URLS[index];
    setCurrentIndex(index);
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

  const sentinelRef = useRef(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const onReachEnd = useCallback(() => {
    console.log("👇 Llegaste al final del PDF");

    if (isTransitioningRef.current) return;

    if (currentIndex < CLIENT_PDF_URLS.length - 1) {
      isTransitioningRef.current = true;
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setUrl(CLIENT_PDF_URLS[nextIdx]);

      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
        isTransitioningRef.current = false;
      }, 100);
    }
  }, [currentIndex]);

  const onReachStart = useCallback(() => {
    console.log("👆 Llegaste al inicio del PDF");

    if (isTransitioningRef.current) return;

    if (currentIndex > 0) {
      isTransitioningRef.current = true;
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setUrl(CLIENT_PDF_URLS[prevIdx]);

      setTimeout(() => {
        if (containerRef.current) {
          // Scroll al final del documento anterior
          containerRef.current.scrollTop =
            containerRef.current.scrollHeight -
            containerRef.current.clientHeight;
        }
        isTransitioningRef.current = false;
      }, 100);
    }
  }, [currentIndex]);

  // 👇 Sentinel + IntersectionObserver para bottom
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
        ref={containerRef}
        style={{
          height: "100vh",
          width: "75vw",
          position: "relative",
          overflowY: "auto",
          scrollBehavior: "smooth",
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
                  scrollViewerTo.current = scrollTo;

                  const handleScroll = () => {
                    // Detectar scroll hacia abajo
                    const isBottom =
                      viewerContainer.scrollTop +
                        viewerContainer.clientHeight >=
                      viewerContainer.scrollHeight - 1;

                    if (isBottom) {
                      onReachEnd();
                    }

                    // Detectar scroll hacia arriba
                    const isTop = viewerContainer.scrollTop === 0;
                    if (isTop) {
                      onReachStart();
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

              {/* 👇 SENTINEL FINAL DEL PDF */}
              <div ref={sentinelRef} style={{ height: 1 }} />
            </>
          )}
        </PdfLoader>
      </div>
    </div>
  );
}
