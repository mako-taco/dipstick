/* eslint-disable no-console */
import { SourceFile } from 'ts-morph';

export interface ILogger {
  log(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  errorWithContext(
    sourceFile: SourceFile,
    lineNumber: number,
    message: string
  ): void;
}

export class Logger implements ILogger {
  constructor(private readonly verbose: boolean) {}

  log(...args: unknown[]) {
    if (this.verbose) {
      console.log(...args);
    }
  }

  debug(...args: unknown[]) {
    if (this.verbose) {
      console.log(...args);
    }
  }

  info(...args: unknown[]) {
    if (this.verbose) {
      console.info(...args);
    }
  }

  warn(...args: unknown[]) {
    console.warn(...args);
  }

  error(...args: unknown[]) {
    console.error(...args);
  }

  errorWithContext(
    sourceFile: SourceFile,
    lineNumber: number,
    message: string
  ) {
    const fullText = sourceFile.getFullText();
    const contextLines: [number, string][] = [];
    let newlineIdx = 0;
    for (let lineNum = 1; lineNum < fullText.length; lineNum++) {
      newlineIdx = fullText.indexOf('\n', newlineIdx);
      if (newlineIdx === -1) {
        break;
      }
      if (lineNum >= lineNumber - 2 && lineNum <= lineNumber + 2) {
        contextLines.push([
          lineNum,
          fullText.substring(newlineIdx, fullText.indexOf('\n', newlineIdx)),
        ]);
      }
      newlineIdx++;
    }

    const maxLineNumStrLength = contextLines.reduce(
      (maxLineNumStrLength, [lineNum]) => {
        return Math.max(maxLineNumStrLength, lineNum.toString().length);
      },
      0
    );

    const contextStr = contextLines
      .map(
        ([lineNum, line]) =>
          `${lineNum.toString().padStart(maxLineNumStrLength)}: ${line}`
      )
      .join('\n');
    console.error(`${message}\n${contextStr}`);
  }
}

export const NoOpLogger: ILogger = {
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  errorWithContext: () => {},
};
