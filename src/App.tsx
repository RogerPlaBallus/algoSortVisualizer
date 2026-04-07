import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSortGenerator,
  DEFAULT_ELEMENT_COUNT,
  DEFAULT_VELOCITY,
  getOperationsPerSecond,
  MAX_ELEMENT_COUNT,
  MIN_ELEMENT_COUNT,
  SORT_OPTIONS,
  VELOCITY_OPTIONS,
  type SortKey,
  type VelocityKey,
} from "./lib/sortAlgorithms";

type Status = "idle" | "running" | "sorted";

const ALGORITHM_DESCRIPTIONS: Record<SortKey, string> = {
  bubble: "Repeatedly swaps adjacent elements if they are in the wrong order.",
  selection: "Finds the minimum element and places it at the beginning.",
  insertion: "Builds the sorted array one element at a time.",
  gnome: "Moves elements back to their proper place, like a garden gnome.",
  shaker: "Bidirectional Bubble Sort. Sorts in both directions.",
  "odd-even": "Compares all odd/even indexed pairs of adjacent elements.",
  pancake: "Reverses prefixes of the array to sort it.",
};

const createDataset = (count: number): number[] => {
  const dataset = Array.from({ length: count }, (_, index) => index + 1);

  for (let index = dataset.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [dataset[index], dataset[swapIndex]] = [dataset[swapIndex], dataset[index]];
  }

  return dataset;
};

const statusMeta: Record<Status, { label: string; tone: string }> = {
  idle: { label: "Ready", tone: "text-sky-700 bg-sky-100 border-sky-200" },
  running: { label: "Running", tone: "text-fuchsia-700 bg-fuchsia-100 border-fuchsia-200" },
  sorted: { label: "Completed", tone: "text-emerald-700 bg-emerald-100 border-emerald-200" },
};

export default function App() {
  const [algorithm, setAlgorithm] = useState<SortKey>("bubble");
  const [velocity, setVelocity] = useState<VelocityKey>(DEFAULT_VELOCITY);
  const [elementCount, setElementCount] = useState<number>(DEFAULT_ELEMENT_COUNT);
  const [values, setValues] = useState<number[]>(() => createDataset(DEFAULT_ELEMENT_COUNT));
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  const valuesRef = useRef<number[]>(values);
  const frameRef = useRef<number | null>(null);
  const runningRef = useRef<boolean>(false);
  const statusRef = useRef<Status>(status);

  const stopAnimation = useCallback(() => {
    runningRef.current = false;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const resetWithCount = useCallback(
    (count: number) => {
      stopAnimation();
      const nextValues = createDataset(count);
      valuesRef.current = nextValues;
      setValues(nextValues);
      setActiveIndices([]);
      setStatus("idle");
    },
    [stopAnimation]
  );

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  const maxValue = useMemo(() => Math.max(...values, 1), [values]);
  const selectedLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === algorithm)?.label ?? "Bubble",
    [algorithm]
  );
  const selectedVelocityLabel = useMemo(
    () => VELOCITY_OPTIONS.find((option) => option.value === velocity)?.label ?? "Slow",
    [velocity]
  );

  // Keeping hot-path lookups constant-time helps the chart stay responsive with hundreds of bars.
  const activeIndexSet = useMemo(() => new Set(activeIndices), [activeIndices]);

  const handleElementCountChange = (nextCount: number) => {
    setElementCount(nextCount);
    resetWithCount(nextCount);
  };

  const handleRestart = () => {
    resetWithCount(elementCount);
  };

  const handleAlgorithmChange = (nextAlgorithm: SortKey) => {
    setAlgorithm(nextAlgorithm);
    setActiveIndices([]);

    // Restarting after completion avoids a misleading already-sorted view when the user wants to compare a different algorithm.
    if (statusRef.current === "sorted") {
      resetWithCount(elementCount);
      return;
    }

    setStatus("idle");
  };

  const handlePlay = () => {
    if (runningRef.current) {
      return;
    }

    stopAnimation();

    const workingValues = [...valuesRef.current];
    const generator = createSortGenerator(algorithm, workingValues);
    const operationsPerSecond = getOperationsPerSecond(elementCount, velocity);
    const operationsPerFrame = Math.max(1, Math.floor(operationsPerSecond / 60));

    runningRef.current = true;
    setStatus("running");

    // Advancing several operations per frame preserves visual continuity without making dense datasets feel sluggish.
    const runFrame = () => {
      if (!runningRef.current) {
        return;
      }

      let lastActive: number[] = [];
      let completed = false;

      for (let step = 0; step < operationsPerFrame; step += 1) {
        const result = generator.next();

        if (result.done) {
          completed = true;
          break;
        }

        lastActive = result.value.active;
      }

      valuesRef.current = [...workingValues];
      setValues(valuesRef.current);
      setActiveIndices(lastActive);

      if (completed) {
        runningRef.current = false;
        frameRef.current = null;
        setActiveIndices([]);
        setStatus("sorted");
        return;
      }

      frameRef.current = requestAnimationFrame(runFrame);
    };

    frameRef.current = requestAnimationFrame(runFrame);
  };

  return (
    <div className="h-screen overflow-hidden bg-transparent text-slate-900">
      <div className="mx-auto flex h-full max-w-[1680px] flex-col px-2 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3">
        <header className="mb-1.5 grid flex-none gap-1.5 rounded-2xl border border-white/70 bg-white/80 px-3 py-1.5 shadow-[0_16px_50px_rgba(59,130,246,0.10)] backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-600">Sorting Visualizer</p>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusMeta[status].tone}`}
              >
                {statusMeta[status].label}
              </span>
            </div>
            <h1 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
              Bright, focused algorithm sorting workspace
            </h1>
          </div>
          <div className="hidden sm:flex items-center justify-end">
            <p className="max-w-md text-right text-[11px] text-slate-500">
              Compare classic sorting strategies with a centered chart-first layout designed to stay fully visible at any supported dataset size.
            </p>
          </div>
        </header>

        <section className="mb-1.5 grid flex-none gap-2 rounded-2xl border border-white/70 bg-white/80 px-3 py-2 shadow-[0_16px_45px_rgba(14,165,233,0.10)] backdrop-blur lg:grid-cols-[160px_180px_130px_minmax(0,1fr)_auto] lg:items-center lg:gap-3 sm:px-4">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Algorithm</span>
            <select
              value={algorithm}
              onChange={(event) => handleAlgorithmChange(event.target.value as SortKey)}
              disabled={status === "running"}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} Sort
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Elements</span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                {elementCount}
              </span>
            </div>
            <input
              type="range"
              min={MIN_ELEMENT_COUNT}
              max={MAX_ELEMENT_COUNT}
              step={1}
              value={elementCount}
              onChange={(event) => handleElementCountChange(Number(event.target.value))}
              disabled={status === "running"}
              className="slider-accent h-8 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Velocity</span>
            <select
              value={velocity}
              onChange={(event) => setVelocity(event.target.value as VelocityKey)}
              disabled={status === "running"}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {VELOCITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="hidden lg:flex min-w-0 flex-col gap-1 pl-4 border-l border-slate-200/60 ml-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Method</span>
            <div className="flex h-8 items-center">
              <p className="truncate text-xs font-medium text-slate-600 w-full" title={ALGORITHM_DESCRIPTIONS[algorithm]}>
                {ALGORITHM_DESCRIPTIONS[algorithm]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={handlePlay}
              disabled={status === "running"}
              className="h-8 w-24 rounded-lg bg-[linear-gradient(135deg,#2563eb,#7c3aed)] px-3 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(79,70,229,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Play
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
            >
              Restart
            </button>
          </div>
        </section>

        <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <section className="grid h-full min-h-0 w-full place-items-center rounded-2xl border border-white/70 bg-white/75 p-1.5 shadow-[0_22px_60px_rgba(56,189,248,0.12)] backdrop-blur sm:p-2 lg:p-2.5">
            <div className="flex h-full min-h-0 w-full max-w-[1600px] flex-col rounded-xl border border-sky-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(250,245,255,0.96)_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-3 lg:p-3.5">
              <div className="mb-2 flex flex-none items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 sm:text-base">{selectedLabel} Sort</h2>
                  <p className="text-[11px] text-slate-600 sm:text-xs">
                    High-contrast highlights make swaps and comparisons easy to follow.
                  </p>
                </div>
                <div className="hidden rounded-full border border-sky-200 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-sky-700 md:block">
                  {values.length} bars · {selectedVelocityLabel}
                </div>
              </div>

              <div className="relative flex-1 overflow-hidden rounded-lg border border-sky-100 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(237,233,254,0.72))] px-1 pb-1 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-2 sm:pb-2 lg:px-2.5 lg:pb-2.5">
                <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-sky-300/70 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.03),transparent_12%,transparent_88%,rgba(124,58,237,0.03))]" />
                <div className="relative flex h-full w-full items-end gap-px overflow-hidden">
                  {values.map((value, index) => {
                    const isActive = activeIndexSet.has(index);
                    const isSorted = status === "sorted";

                    return (
                      <div
                        key={`${index}-${value}`}
                        className="min-w-0 flex-1 rounded-t-[3px] transition-[height,background-color,opacity,transform] duration-75 ease-out"
                        style={{
                          height: `${(value / maxValue) * 100}%`,
                          backgroundColor: isSorted
                            ? "rgb(16 185 129)"
                            : isActive
                              ? "rgb(236 72 153)"
                              : "rgb(37 99 235)",
                          opacity: isActive || isSorted ? 1 : 0.9,
                          transform: isActive ? "translateY(-1px)" : "translateY(0)",
                          boxShadow: isActive ? "0 0 0 1px rgba(255,255,255,0.35)" : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-2 flex flex-none items-center justify-between gap-3 rounded-[20px] border border-white/70 bg-white/80 px-4 py-2 text-[11px] text-slate-600 shadow-[0_10px_28px_rgba(56,189,248,0.08)] backdrop-blur sm:px-5">
          <span>Made with React, Vite, TypeScript and Tailwind CSS</span>
          <span className="hidden sm:inline">Centered, single-screen sorting visualizer</span>
        </footer>
      </div>
    </div>
  );
}
