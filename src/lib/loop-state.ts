import { readFile, writeFile, unlink, access } from "node:fs/promises";
import { join } from "node:path";

const LOOP_STATE_FILE = ".loop-state.json";
const GITIGNORE_FILE = ".gitignore";

export interface LoopStateFile {
  version: 1;
  iteration: number;
  iterationHistory: number[]; // Active times in ms
  createdAt: number;
  updatedAt: number;
}

/**
 * Load loop state from .loop-state.json in current working directory
 * Returns null if file doesn't exist or is invalid
 */
export async function loadLoopState(): Promise<LoopStateFile | null> {
  const filePath = join(process.cwd(), LOOP_STATE_FILE);
  try {
    const content = await readFile(filePath, "utf-8");
    const data = JSON.parse(content) as unknown;

    // Basic validation
    if (
      typeof data === "object" &&
      data !== null &&
      "version" in data &&
      data.version === 1 &&
      "iteration" in data &&
      typeof data.iteration === "number" &&
      "iterationHistory" in data &&
      Array.isArray(data.iterationHistory) &&
      "createdAt" in data &&
      typeof data.createdAt === "number" &&
      "updatedAt" in data &&
      typeof data.updatedAt === "number"
    ) {
      return data as LoopStateFile;
    }
    return null;
  } catch {
    // File not found or parse error
    return null;
  }
}

/**
 * Save loop state to .loop-state.json in current working directory
 */
export async function saveLoopState(state: LoopStateFile): Promise<void> {
  const filePath = join(process.cwd(), LOOP_STATE_FILE);
  const content = JSON.stringify(
    {
      ...state,
      updatedAt: Date.now(),
    },
    null,
    2
  );
  await writeFile(filePath, content, "utf-8");
}

/**
 * Create a new loop state file
 */
export function createLoopState(): LoopStateFile {
  const now = Date.now();
  return {
    version: 1,
    iteration: 1,
    iterationHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Delete .loop-state.json on completion
 */
export async function deleteLoopState(): Promise<void> {
  const filePath = join(process.cwd(), LOOP_STATE_FILE);
  try {
    await unlink(filePath);
  } catch {
    // File might not exist, ignore error
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure .loop-state.json is in .gitignore
 * Creates .gitignore if it doesn't exist
 */
export async function ensureGitignore(): Promise<void> {
  const gitignorePath = join(process.cwd(), GITIGNORE_FILE);
  const entry = LOOP_STATE_FILE;

  const exists = await fileExists(gitignorePath);

  if (!exists) {
    // Create .gitignore with our entry
    await writeFile(gitignorePath, `${entry}\n`, "utf-8");
    return;
  }

  // Check if entry already exists
  const content = await readFile(gitignorePath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim());

  if (lines.includes(entry)) {
    // Already listed
    return;
  }

  // Append entry - ensure we start on a new line if file doesn't end with one
  const suffix = content.endsWith("\n") ? "" : "\n";
  await writeFile(gitignorePath, `${content}${suffix}${entry}\n`, "utf-8");
}
