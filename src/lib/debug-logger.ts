import fs from 'node:fs';
import path from 'node:path';

const LOG_FILE = '.loop.log';
const OLD_LOG_FILE = '.loop.log.old';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class DebugLogger {
  private logFile: string;
  private enabled: boolean = true;

  constructor() {
    this.logFile = path.resolve(process.cwd(), LOG_FILE);
  }

  sessionStart(opts: { debug: boolean; cwd: string; model?: string }) {
    // Rotate logs
    if (fs.existsSync(this.logFile)) {
      const oldLogPath = path.resolve(process.cwd(), OLD_LOG_FILE);
      try {
        fs.renameSync(this.logFile, oldLogPath);
      } catch (err) {
        // If rename fails (e.g. file open), just ignore and append/overwrite
        // or maybe we should try to copy and truncate?
        // For simplicity, we'll just try to rename.
      }
    }

    // Start fresh log file
    const header = [
      '================================================================================',
      `OCLOOP SESSION: ${new Date().toISOString()}`,
      `Working Directory: ${opts.cwd}`,
      `Debug Mode: ${opts.debug}`,
      `Model: ${opts.model || 'default'}`,
      '================================================================================',
      ''
    ].join('\n');

    try {
      fs.writeFileSync(this.logFile, header);
    } catch (err) {
      console.error('Failed to initialize debug log:', err);
      this.enabled = false;
    }
  }

  iterationStart(n: number) {
    this.writeRaw(`--- ITERATION ${n} ---\n`);
  }

  iterationEnd(n: number) {
    this.writeRaw(`--- ITERATION ${n} END ---\n`);
  }

  debug(context: string, message: string, data?: unknown) {
    this.entry('DEBUG', context, message, data);
  }

  info(context: string, message: string, data?: unknown) {
    this.entry('INFO', context, message, data);
  }

  warn(context: string, message: string, data?: unknown) {
    this.entry('WARN', context, message, data);
  }

  error(context: string, message: string, error?: unknown) {
    this.entry('ERROR', context, message, error);
  }

  private entry(level: LogLevel, context: string, message: string, data?: unknown) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
    let line = `[${timestamp}] [${level}] [${context}] ${message}`;
    
    if (data !== undefined) {
      try {
        if (data instanceof Error) {
           line += ` { name: "${data.name}", message: "${data.message}", stack: ${JSON.stringify(data.stack)} }`;
        } else {
           line += ` ${JSON.stringify(data)}`;
        }
      } catch (e) {
        line += ` [Circular or Non-Serializable Data]`;
      }
    }
    
    this.writeRaw(line + '\n');
  }

  private writeRaw(content: string) {
    if (!this.enabled) return;
    try {
      fs.appendFileSync(this.logFile, content);
    } catch (err) {
      // If we can't write to log, suppress error to avoid crashing app
      // console.error('Failed to write to debug log:', err);
    }
  }
}

export const log = new DebugLogger();
