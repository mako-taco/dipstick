import { Node } from 'ts-morph';

export class CodegenError extends Error {
  constructor(node: Node, message: string) {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();
    const pos = [node.getStart(), node.getEnd()];

    let idx = 0;
    let startLine = 0;

    while (idx < pos[0]) {
      idx = fullText.indexOf('\n', idx + 1);
      startLine++;
    }

    let endLine = startLine;
    do {
      idx = fullText.indexOf('\n', idx + 1);
      endLine++;
    } while (idx < pos[1]);

    const lines = fullText.split('\n');
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
            ? '\x1b[0;31m> \x1b[0m'
            : '  '
        } ${lineNumber.toString().padStart(pad, ' ')} | ${line}`;
      })
      .join('\n');

    super(
      `${message} (at ${sourceFile.getFilePath()}:${startLine})\n\n${formattedContext}`
    );
  }
}
