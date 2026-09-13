/**
 * AST & Symbol Slicer for Language-Agnostic Context Chunking
 * Copyright (c) 2026 MRLDHANWINN. Apache-2.0 Licensed.
 */

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'export' | 'import';
  startLine: number;
  endLine: number;
}

export class ASTParser {
  /**
   * Extract high-level symbol boundaries from TypeScript/JavaScript/Python source.
   */
  public static extractSymbols(sourceCode: string, filename: string): CodeSymbol[] {
    const lines = sourceCode.split(/\r?\n/);
    const symbols: CodeSymbol[] = [];

    const isPython = filename.endsWith('.py');
    const isTSorJS = filename.endsWith('.ts') || filename.endsWith('.js') || filename.endsWith('.tsx') || filename.endsWith('.jsx');

    if (isPython) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const funcMatch = line.match(/^(\s*)def\s+([a-zA-Z0-9_]+)\s*\(/);
        const classMatch = line.match(/^(\s*)class\s+([a-zA-Z0-9_]+)/);

        if (funcMatch) {
          symbols.push({
            name: funcMatch[2],
            kind: 'function',
            startLine: i + 1,
            endLine: i + 1 // placeholder estimated boundary
          });
        } else if (classMatch) {
          symbols.push({
            name: classMatch[2],
            kind: 'class',
            startLine: i + 1,
            endLine: i + 1
          });
        }
      }
    } else if (isTSorJS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Match functions
        const fnMatch = line.match(/(?:async\s+)?function\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
        // Match classes / interfaces
        const classMatch = line.match(/(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/);
        const ifaceMatch = line.match(/(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/);

        if (fnMatch) {
          symbols.push({
            name: fnMatch[1] || fnMatch[2],
            kind: 'function',
            startLine: i + 1,
            endLine: i + 1
          });
        } else if (classMatch) {
          symbols.push({
            name: classMatch[1],
            kind: 'class',
            startLine: i + 1,
            endLine: i + 1
          });
        } else if (ifaceMatch) {
          symbols.push({
            name: ifaceMatch[1],
            kind: 'interface',
            startLine: i + 1,
            endLine: i + 1
          });
        }
      }
    }

    return symbols;
  }

  /**
   * Find enclosing symbol for a given line number.
   */
  public static findEnclosingSymbol(symbols: CodeSymbol[], line: number): CodeSymbol | undefined {
    return symbols.find(s => line >= s.startLine && line <= s.endLine) ||
           symbols.find(s => s.startLine <= line);
  }
}
