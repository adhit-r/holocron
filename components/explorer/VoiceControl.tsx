"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Microphone, MicrophoneSlash, WarningCircle, CheckCircle, ClockCounterClockwise } from "@phosphor-icons/react";
import type { Entity } from "@/lib/schema";
import { useSelection, type ViewMode } from "@/lib/store";
import { runHybridSearch, type SearchHit } from "@/lib/search";
import { STORIES } from "@/lib/data/stories";
import { cn } from "@/lib/utils";

type Props = {
  entities: Entity[];
};

type VoiceStatus =
  | "idle"
  | "listening"
  | "processing"
  | "confirming"
  | "error"
  | "unsupported";

type RecognizedAction =
  | { type: "pivot"; hit: SearchHit; label: string }
  | { type: "route"; origin: SearchHit; destination: SearchHit; label: string }
  | { type: "view"; view: ViewMode; label: string }
  | { type: "crawl"; label: string }
  | { type: "story"; storyId: string; title: string; label: string };

const STORAGE_KEY_MIC_GRANTED = "holocron:voice_mic_granted";
const STORAGE_KEY_HISTORY = "holocron:voice_history";
const MAX_HISTORY = 5;

// Types for SpeechRecognition API
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function VoiceControl({ entities }: Props) {
  const reduceMotion = useReducedMotion();
  const select = useSelection((s) => s.select);
  const setView = useSelection((s) => s.setView);
  const startRoute = useSelection((s) => s.startRoute);
  const pickEndpoint = useSelection((s) => s.pickEndpoint);
  const setCrawlOpen = useSelection((s) => s.setCrawlOpen);
  const playStory = useSelection((s) => s.playStory);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<RecognizedAction | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);

  const recognitionRef = useRef<any>(null);
  const confirmTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, MAX_HISTORY));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const addToHistory = useCallback((cmd: string) => {
    setHistory((prev) => {
      const updated = [cmd, ...prev.filter((h) => h !== cmd)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  // Parse natural language command into an actionable intent
  const parseCommand = useCallback(
    async (rawText: string) => {
      const text = rawText.trim().toLowerCase();
      if (!text) return;

      setStatus("processing");
      addToHistory(rawText);

      // 1. View switching
      // e.g. "switch to timeline", "show galaxy", "view lineage"
      const viewMatch = text.match(
        /(?:switch to|go to|show|view|open)\s+(galaxy|timeline|lineage)/i
      ) || text.match(/(galaxy|timeline|lineage)\s+view/i);

      if (viewMatch && viewMatch[1]) {
        const targetView = viewMatch[1].toLowerCase() as ViewMode;
        setPendingAction({
          type: "view",
          view: targetView,
          label: `Switch to ${targetView} view`
        });
        setStatus("confirming");
        return;
      }

      // 2. Opening Crawl
      // e.g. "play crawl", "opening crawl", "start crawl"
      if (text.includes("crawl")) {
        setPendingAction({
          type: "crawl",
          label: "Play Opening Crawl"
        });
        setStatus("confirming");
        return;
      }

      // 3. Story mode
      // e.g. "play story rise of vader", "start story"
      const storyMatch = text.match(/(?:play|start)\s+story\s*(.*)/i);
      if (storyMatch) {
        const storyQuery = (storyMatch[1] || "").trim();
        const defaultStory = STORIES[0];
        const foundStory =
          (storyQuery
            ? STORIES.find(
                (s) =>
                  s.title.toLowerCase().includes(storyQuery) ||
                  s.id.toLowerCase().includes(storyQuery)
              )
            : null) || defaultStory;

        if (foundStory) {
          setPendingAction({
            type: "story",
            storyId: foundStory.id,
            title: foundStory.title,
            label: `Play story: ${foundStory.title}`
          });
          setStatus("confirming");
          return;
        }
      }

      // 4. Plot Route from A to B
      // e.g. "plot route from Coruscant to Endor", "route from Tatooine to Hoth"
      const routeMatch = text.match(
        /(?:plot\s+route|route|hyperspace\s+route)\s+(?:from\s+)?(.+?)\s+to\s+(.+)/i
      );

      if (routeMatch && routeMatch[1] && routeMatch[2]) {
        const originQuery = routeMatch[1].trim();
        const destQuery = routeMatch[2].trim();

        const [originHits, destHits] = await Promise.all([
          runHybridSearch(entities, originQuery, 4),
          runHybridSearch(entities, destQuery, 4)
        ]);

        const originPlanet = originHits.find((h) => h.type === "planet") || originHits[0];
        const destPlanet = destHits.find((h) => h.type === "planet") || destHits[0];

        if (originPlanet && destPlanet && originPlanet.id !== destPlanet.id) {
          setPendingAction({
            type: "route",
            origin: originPlanet,
            destination: destPlanet,
            label: `Plot route: ${originPlanet.name} → ${destPlanet.name}`
          });
          setStatus("confirming");
          return;
        }
      }

      // 5. Cross-pivot entity search
      // e.g. "show me Tatooine", "pivot to Darth Vader", "who is Luke Skywalker"
      const entityQuery = text
        .replace(/^(?:show me|pivot to|find|search for|go to|navigate to|who is|what is|tell me about)\s+/i, "")
        .trim();

      const hits = await runHybridSearch(entities, entityQuery || text, 4);
      if (hits.length > 0 && hits[0]) {
        const topHit = hits[0];
        setPendingAction({
          type: "pivot",
          hit: topHit,
          label: `Pivot to ${topHit.name} (${topHit.type})`
        });
        setStatus("confirming");
        return;
      }

      // If no command matched or search failed
      setStatus("error");
      setErrorMessage(`Could not resolve command: "${rawText}"`);
    },
    [entities, addToHistory]
  );

  // Execute confirmed action after ~600ms visual confirmation
  useEffect(() => {
    if (status !== "confirming" || !pendingAction) return;

    confirmTimeoutRef.current = setTimeout(() => {
      if (pendingAction.type === "pivot") {
        select(pendingAction.hit.id, pendingAction.hit.type);
      } else if (pendingAction.type === "route") {
        setView("galaxy");
        startRoute();
        pickEndpoint(pendingAction.origin.id);
        pickEndpoint(pendingAction.destination.id);
      } else if (pendingAction.type === "view") {
        setView(pendingAction.view);
      } else if (pendingAction.type === "crawl") {
        setCrawlOpen(true);
      } else if (pendingAction.type === "story") {
        setView("galaxy");
        playStory(pendingAction.storyId);
      }

      setStatus("idle");
      setPendingAction(null);
      setTranscript("");
    }, 650);

    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, [status, pendingAction, select, setView, startRoute, pickEndpoint, setCrawlOpen, playStory]);

  // Start speech recognition
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const win = window as unknown as IWindow;
    const SpeechAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechAPI) {
      setStatus("unsupported");
      setErrorMessage("Speech recognition not supported in this browser.");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setStatus("listening");
        setErrorMessage(null);
        setTranscript("");
        try {
          localStorage.setItem(STORAGE_KEY_MIC_GRANTED, "true");
        } catch {
          // Ignore
        }
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);

        if (event.results[current].isFinal) {
          parseCommand(text);
        }
      };

      recognition.onerror = (event: any) => {
        setStatus("error");
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorMessage("Microphone access denied. Enable mic in browser settings.");
        } else if (event.error === "no-speech") {
          setErrorMessage("No speech detected. Press mic to try again.");
        } else {
          setErrorMessage(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (status === "listening") {
          setStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to start speech recognition");
    }
  }, [status, parseCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setStatus("idle");
    }
  }, []);

  const toggleListening = () => {
    if (status === "listening") {
      stopListening();
    } else {
      startListening();
    }
  };

  // Keyboard shortcut listener: press "V" to toggle voice control (when not typing in form inputs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl && activeEl.getAttribute("contenteditable") === "true");

      if (isInput) return;

      if ((e.key === "v" || e.key === "V") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  return (
    <div className="relative inline-flex items-center">
      {/* Mic Trigger Button */}
      <button
        type="button"
        onClick={toggleListening}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={status === "listening" ? "Stop voice listening" : "Start voice control (V)"}
        aria-pressed={status === "listening"}
        className={cn(
          "relative flex items-center justify-center rounded-md border p-2.5 transition-all",
          status === "listening"
            ? "border-accent bg-accent/20 text-accent shadow-[0_0_12px_rgba(235,160,50,0.3)] ring-1 ring-accent/50"
            : status === "confirming"
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
            : status === "error"
            ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
            : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary"
        )}
      >
        {status === "listening" ? (
          <Microphone size={18} weight="fill" className="animate-pulse text-accent" />
        ) : status === "error" || status === "unsupported" ? (
          <MicrophoneSlash size={18} weight="regular" />
        ) : (
          <Microphone size={18} weight="regular" />
        )}

        {/* Pulse beacon when listening */}
        {status === "listening" && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
        )}
      </button>

      {/* Popover / Waveform / Confirmation Overlay */}
      <AnimatePresence>
        {(status === "listening" ||
          status === "confirming" ||
          status === "processing" ||
          (status === "error" && errorMessage)) && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "fixed z-50 flex items-center gap-3 rounded-lg border bg-bg-panel/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl",
              "bottom-20 left-1/2 -translate-x-1/2 md:bottom-24"
            )}
            role="status"
            aria-live="polite"
          >
            {/* Status Waveform or Icon */}
            {status === "listening" && (
              <div className="flex items-center gap-1">
                {[0.4, 0.9, 0.6, 1.0, 0.5].map((h, i) => (
                  <motion.span
                    key={i}
                    animate={
                      reduceMotion
                        ? {}
                        : {
                            scaleY: [0.3, h, 0.3],
                            transition: {
                              repeat: Infinity,
                              duration: 0.6 + i * 0.1,
                              ease: "easeInOut"
                            }
                          }
                    }
                    className="h-4 w-1 rounded-full bg-accent"
                  />
                ))}
              </div>
            )}

            {status === "confirming" && (
              <CheckCircle size={20} weight="fill" className="text-emerald-400" />
            )}

            {status === "error" && (
              <WarningCircle size={20} weight="fill" className="text-rose-400" />
            )}

            {/* Status Text & Transcript */}
            <div className="flex flex-col">
              <span className="font-mono text-2xs uppercase tracking-wider text-fg-dim">
                {status === "listening"
                  ? "Listening..."
                  : status === "confirming"
                  ? "Confirmed"
                  : status === "processing"
                  ? "Processing intent..."
                  : "Voice Error"}
              </span>
              <span className="font-mono text-sm font-medium text-fg-strong">
                {status === "confirming"
                  ? pendingAction?.label
                  : transcript || (status === "error" ? errorMessage : "Say a command: 'Show me Tatooine'")}
              </span>
            </div>

            {/* Action countdown bar */}
            {status === "confirming" && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.6, ease: "linear" }}
                className="absolute bottom-0 left-0 h-0.5 rounded-b bg-emerald-400"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip & Command History */}
      <AnimatePresence>
        {showTooltip && status === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute z-40 w-64 rounded-lg border border-border-faint bg-bg-panel/95 p-3 shadow-xl backdrop-blur-md",
              // Desktop: place to the right of nav rail
              "md:left-full md:top-0 md:ml-2.5",
              // Mobile: place above
              "max-md:bottom-full max-md:left-0 max-md:mb-2.5"
            )}
          >
            <div className="flex items-center justify-between border-b border-border-faint pb-1.5 font-mono text-2xs">
              <span className="font-semibold uppercase tracking-wider text-fg-strong">
                Voice Control
              </span>
              <kbd className="rounded border border-border-faint px-1 text-fg-dim">V</kbd>
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              Click or press <kbd className="font-mono font-bold">V</kbd> to command the archive by voice.
            </p>

            {/* Sample commands */}
            <div className="mt-2 flex flex-col gap-1 border-t border-border-faint/60 pt-2 font-mono text-[10px] text-fg-dim">
              <span>&bull; &ldquo;Show me Tatooine&rdquo;</span>
              <span>&bull; &ldquo;Plot route from Coruscant to Endor&rdquo;</span>
              <span>&bull; &ldquo;Switch to timeline&rdquo;</span>
              <span>&bull; &ldquo;Play crawl&rdquo;</span>
            </div>

            {/* Recognized History */}
            {history.length > 0 && (
              <div className="mt-2.5 border-t border-border-faint/60 pt-2">
                <div className="flex items-center gap-1 font-mono text-[10px] text-fg-dim">
                  <ClockCounterClockwise size={11} />
                  <span>Recent commands:</span>
                </div>
                <ul className="mt-1 flex flex-col gap-0.5 font-mono text-2xs text-fg-muted">
                  {history.map((cmd, i) => (
                    <li key={i} className="truncate">
                      &ldquo;{cmd}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
