import { Node, SourceFile } from "ts-morph";

export class ErrorWithContext extends Error {
  constructor(node: Node, message: string);
  constructor(sourceFile: SourceFile, pos: [number, number], message: string);
  constructor(
    sourceFileOrNode: SourceFile | Node,
    posOrMessage: [number, number] | string,
    maybeMessage?: string
  ) {
    const sourceFile =
      sourceFileOrNode instanceof SourceFile
        ? sourceFileOrNode
        : sourceFileOrNode.getSourceFile();
    const fullText = sourceFile.getFullText();
    const pos = Array.isArray(posOrMessage)
      ? posOrMessage
      : [sourceFileOrNode.getStart(), sourceFileOrNode.getEnd()];
    const message =
      typeof posOrMessage === "string" ? posOrMessage : maybeMessage;

    let idx = 0;
    let startLine = 0;

    while (idx < pos[0]) {
      idx = fullText.indexOf("\n", idx + 1);
      startLine++;
    }

    let endLine = startLine;
    do {
      idx = fullText.indexOf("\n", idx + 1);
      endLine++;
    } while (idx < pos[1]);

    const lines = fullText.split("\n");
    const ctxStartLine = Math.max(0, startLine - 3);
    const ctxEndLine = Math.min(lines.length, endLine + 2);
    const numberedContextLines = lines
      .slice(ctxStartLine, ctxEndLine)
      .map((line, lineIdx) => {
        const lineNumber = ctxStartLine + lineIdx + 1;
        return [lineNumber, line] as const;
      });

    const pad = numberedContextLines.reduce(
      (max, [lineNumber]) => Math.max(max, lineNumber.toString().length),
      0
    );
    const formattedContext = numberedContextLines
      .map(([lineNumber, line]) => {
        return `${
          lineNumber >= startLine && lineNumber < endLine
            ? "\x1b[0;31m> \x1b[0m"
            : "  "
        } ${lineNumber.toString().padStart(pad, " ")} | ${line}`;
      })
      .join("\n");

    super(
      `${message} (at ${sourceFile.getFilePath()}:${startLine})\n\n${formattedContext}`
    );
  }
}
