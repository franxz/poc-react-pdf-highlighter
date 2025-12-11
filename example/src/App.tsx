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

  const containerRef = useRef<HTMLDivElement>(null);

  const fadeDuration = 250;

  const doTransition = (newIndex: number, scrollPosition: "top" | "bottom") => {
    const container = containerRef.current;
    if (!container) return;

    isTransitioningRef.current = true;
    container.classList.add("pdf-hidden");

    setTimeout(() => {
      setCurrentIndex(newIndex);
      setUrl(CLIENT_PDF_URLS[newIndex]);

      requestAnimationFrame(() => {
        if (scrollPosition === "top") {
          container.scrollTop = 0;
        } else {
          container.scrollTop = container.scrollHeight - container.clientHeight;
        }

        // esperar 1 frame para asegurar que el DOM re-renderizó
        requestAnimationFrame(() => {
          container.classList.remove("pdf-hidden");

          setTimeout(() => {
            isTransitioningRef.current = false;
          }, fadeDuration);
        });
      });
    }, fadeDuration);
  };

  const onReachEnd = useCallback(() => {
    if (
      !isTransitioningRef.current &&
      currentIndex < CLIENT_PDF_URLS.length - 1
    ) {
      doTransition(currentIndex + 1, "top");
    }
  }, [currentIndex]);

  const onReachStart = useCallback(() => {
    if (!isTransitioningRef.current && currentIndex > 0) {
      doTransition(currentIndex - 1, "bottom");
    }
  }, [currentIndex]);

  return (
    <div className="App" style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        highlights={highlights}
        resetHighlights={resetHighlights}
        toggleDocument={toggleDocument}
      />

      <div
        ref={containerRef}
        className="pdf-transition"
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
                    const isBottom =
                      viewerContainer.scrollTop +
                        viewerContainer.clientHeight >=
                      viewerContainer.scrollHeight - 1;

                    if (isBottom) {
                      onReachEnd();
                    }

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
            </>
          )}
        </PdfLoader>
      </div>
    </div>
  );
}
