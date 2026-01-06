import { createSignal, createMemo, onCleanup } from "solid-js";

/**
 * Internal state for tracking iteration timing
 */
interface LoopStatsState {
  iterationStartTime: number | null;
  pauseStartTime: number | null;
  accumulatedPauseTime: number;
  history: number[]; // Active times for completed iterations
}

/**
 * Return type for the useLoopStats hook
 */
export interface UseLoopStatsReturn {
  // Methods
  startIteration: () => void;
  pause: () => void;
  resume: () => void;
  endIteration: () => number; // Returns active duration in ms
  getHistory: () => number[];

  // Computed values (reactive)
  elapsedTime: () => number; // Current iteration elapsed time in ms
  averageTime: () => number | null; // Average iteration time in ms, null if no history
  totalActiveTime: () => number; // Sum of all active time including current iteration
  estimatedTotal: (remaining: number) => number | null; // Estimated time for remaining iterations
}

/**
 * Format a duration in milliseconds to a human-readable string
 * @param ms Duration in milliseconds
 * @returns Formatted string like "1m 23s", "45s", "2h 15m"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0s".padStart(7, " ");

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`.padStart(7, " ");
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`.padStart(7, " ");
  }
  return `${seconds}s`.padStart(7, " ");
}

/**
 * Hook to track iteration timing statistics with pause awareness.
 *
 * Tracks active time per iteration (excluding paused time), maintains
 * history of completed iterations, and provides computed statistics
 * like averages and estimates.
 *
 * @example
 * ```tsx
 * const stats = useLoopStats()
 *
 * // When iteration starts
 * stats.startIteration()
 *
 * // When pausing
 * stats.pause()
 *
 * // When resuming
 * stats.resume()
 *
 * // When iteration completes
 * const duration = stats.endIteration()
 *
 * // Access computed values
 * console.log("Elapsed:", formatDuration(stats.elapsedTime()))
 * console.log("Average:", stats.averageTime() ? formatDuration(stats.averageTime()!) : "N/A")
 * ```
 */
export function useLoopStats(): UseLoopStatsReturn {
  const [state, setState] = createSignal<LoopStatsState>({
    iterationStartTime: null,
    pauseStartTime: null,
    accumulatedPauseTime: 0,
    history: [],
  });

  // Timer for updating elapsed time every second
  const [tick, setTick] = createSignal(0);
  const interval = setInterval(() => setTick((t) => t + 1), 1000);
  onCleanup(() => clearInterval(interval));

  /**
   * Start timing a new iteration
   */
  function startIteration(): void {
    setState({
      iterationStartTime: Date.now(),
      pauseStartTime: null,
      accumulatedPauseTime: 0,
      history: state().history,
    });
  }

  /**
   * Pause timing (records when pause started)
   */
  function pause(): void {
    const s = state();
    if (s.pauseStartTime !== null) {
      // Already paused
      return;
    }
    setState({
      ...s,
      pauseStartTime: Date.now(),
    });
  }

  /**
   * Resume timing (adds paused duration to accumulated pause time)
   */
  function resume(): void {
    const s = state();
    if (s.pauseStartTime === null) {
      // Not paused
      return;
    }
    const pausedDuration = Date.now() - s.pauseStartTime;
    setState({
      ...s,
      pauseStartTime: null,
      accumulatedPauseTime: s.accumulatedPauseTime + pausedDuration,
    });
  }

  /**
   * End the current iteration, record active time to history
   * @returns Active duration in milliseconds
   */
  function endIteration(): number {
    const s = state();
    if (s.iterationStartTime === null) {
      return 0;
    }

    const now = Date.now();
    let totalElapsed = now - s.iterationStartTime;

    // If currently paused, include the current pause time
    let pauseTime = s.accumulatedPauseTime;
    if (s.pauseStartTime !== null) {
      pauseTime += now - s.pauseStartTime;
    }

    const activeTime = Math.max(0, totalElapsed - pauseTime);

    setState({
      iterationStartTime: null,
      pauseStartTime: null,
      accumulatedPauseTime: 0,
      history: [...s.history, activeTime],
    });

    return activeTime;
  }

  /**
   * Get the current history array
   */
  function getHistory(): number[] {
    return state().history;
  }

  /**
   * Current iteration elapsed time (active time only, excluding pauses)
   * Updates every second via the tick signal
   */
  const elapsedTime = createMemo(() => {
    // Subscribe to tick for reactive updates
    tick();

    const s = state();
    if (s.iterationStartTime === null) {
      return 0;
    }

    const now = Date.now();
    let totalElapsed = now - s.iterationStartTime;

    // Subtract accumulated pause time
    let pauseTime = s.accumulatedPauseTime;

    // If currently paused, include current pause duration
    if (s.pauseStartTime !== null) {
      pauseTime += now - s.pauseStartTime;
    }

    return Math.max(0, totalElapsed - pauseTime);
  });

  /**
   * Average time per iteration based on history
   * Returns null if no history available
   */
  const averageTime = createMemo(() => {
    const history = state().history;
    if (history.length === 0) {
      return null;
    }
    const sum = history.reduce((acc, val) => acc + val, 0);
    return sum / history.length;
  });

  /**
   * Total active time (sum of history + current iteration active time)
   */
  const totalActiveTime = createMemo(() => {
    const history = state().history;
    const historySum = history.reduce((acc, val) => acc + val, 0);
    return historySum + elapsedTime();
  });

  /**
   * Estimated total time for remaining iterations
   * Returns null if no average available
   */
  function estimatedTotal(remaining: number): number | null {
    const avg = averageTime();
    if (avg === null || remaining <= 0) {
      return null;
    }
    return avg * remaining;
  }

  return {
    startIteration,
    pause,
    resume,
    endIteration,
    getHistory,
    elapsedTime,
    averageTime,
    totalActiveTime,
    estimatedTotal,
  };
}
