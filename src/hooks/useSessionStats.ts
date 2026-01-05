import { createSignal, Accessor } from "solid-js";

export interface SessionTokens {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface SessionDiff {
  additions: number;
  deletions: number;
  files: number;
}

export interface UseSessionStatsReturn {
  tokens: Accessor<SessionTokens>;
  diff: Accessor<SessionDiff>;
  totalTokens: Accessor<number>;
  addTokens: (tokens: Partial<SessionTokens>) => void;
  setDiff: (diff: SessionDiff) => void;
  reset: () => void;
}

const INITIAL_TOKENS: SessionTokens = {
  input: 0,
  output: 0,
  reasoning: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

const INITIAL_DIFF: SessionDiff = {
  additions: 0,
  deletions: 0,
  files: 0,
};

export function useSessionStats(): UseSessionStatsReturn {
  const [tokens, setTokens] = createSignal<SessionTokens>({ ...INITIAL_TOKENS });
  const [diff, setDiff] = createSignal<SessionDiff>({ ...INITIAL_DIFF });

  const totalTokens = () => {
    const t = tokens();
    return t.input + t.output + t.reasoning;
  };

  function addTokens(newTokens: Partial<SessionTokens>) {
    setTokens((prev) => ({
      input: prev.input + (newTokens.input || 0),
      output: prev.output + (newTokens.output || 0),
      reasoning: prev.reasoning + (newTokens.reasoning || 0),
      cacheRead: prev.cacheRead + (newTokens.cacheRead || 0),
      cacheWrite: prev.cacheWrite + (newTokens.cacheWrite || 0),
    }));
  }

  function reset() {
    setTokens({ ...INITIAL_TOKENS });
    setDiff({ ...INITIAL_DIFF });
  }

  return {
    tokens,
    diff,
    totalTokens,
    addTokens,
    setDiff,
    reset,
  };
}
