import { readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { log } from "./debug-logger";

const GITIGNORE_FILE = ".gitignore";

/**
 * Ensure .loop* files are in .gitignore
 * Creates .gitignore if it doesn't exist
 */
export async function ensureGitignore(): Promise<void> {
  const gitignorePath = join(process.cwd(), GITIGNORE_FILE);
  const entry = ".loop*";

  let exists = false;
  try {
    await access(gitignorePath);
    exists = true;
  } catch {
    exists = false;
  }

  if (!exists) {
    // Create .gitignore with our entry
    await writeFile(gitignorePath, `${entry}\n`, "utf-8");
    log.info("git", "Created .gitignore", { entry });
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
  log.info("git", "Updated .gitignore", { entry });
}
