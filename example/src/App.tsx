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

  // ref al container que maneja pdf.js (el que tiene scrollTop)
  const pdfScrollRef = useRef<HTMLElement | null>(null);

  // pending scroll: "top" | "bottom" o null -> aplicado cuando el viewer esté listo
  const pendingScrollPositionRef = useRef<"top" | "bottom" | null>(null);

  const fadeDuration = 250;

  const doTransition = (newIndex: number, scrollPosition: "top" | "bottom") => {
    const container = containerRef.current;
    if (!container) return;

    isTransitioningRef.current = true;

    // indicar la intención de scroll al nuevo viewer
    pendingScrollPositionRef.current = scrollPosition;

    // animación visual: fade out
    container.classList.add("pdf-hidden");

    // cambiar documento después de la animación
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setUrl(CLIENT_PDF_URLS[newIndex]);

      // NO intentamos setear el scroll aquí: esperamos a que scrollRef nos entregue el viewerContainer
      // De todas formas como suavizado, sacamos el fade-in cuando el viewer aplique el scroll.
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
                  // Guardamos el scroll container actual
                  pdfScrollRef.current = viewerContainer;
                  scrollViewerTo.current = scrollTo;

                  // si tenemos una intención pendiente (top/bottom), aplicarla ahora que el viewer está disponible
                  if (pendingScrollPositionRef.current && viewerContainer) {
                    const desired = pendingScrollPositionRef.current;
                    // pequeña espera + raf para dejar que pdf.js calcule scrollHeight
                    requestAnimationFrame(() => {
                      // un timeout corto asegura que las páginas hayan renderizado (ajustar si es necesario)
                      setTimeout(() => {
                        if (!viewerContainer) return;

                        if (desired === "top") {
                          viewerContainer.scrollTop = 0;
                        } else {
                          // ir al final del viewer (final del documento)
                          viewerContainer.scrollTop =
                            viewerContainer.scrollHeight -
                            viewerContainer.clientHeight;
                        }

                        // limpiar pending
                        pendingScrollPositionRef.current = null;

                        // fade-in visual: quitar clase y resetear isTransitioning despues del fadeDuration
                        const container = containerRef.current;
                        if (container) {
                          // Forzamos un reflow mínimo para que la transición sea reconocida
                          requestAnimationFrame(() => {
                            container.classList.remove("pdf-hidden");
                            setTimeout(() => {
                              isTransitioningRef.current = false;
                            }, fadeDuration);
                          });
                        }
                      }, 40); // 40ms suele ser suficiente; aumentá si tenés PDFs muy pesados
                    });
                  }

                  // add scroll listener to detect top/bottom
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

                  // remove previous listener if present (avoid duplicates)
                  // Note: to be safe tendrías que guardar la referencia al handler y removerla
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
