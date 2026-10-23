export interface BeeTranscriptEvent {
  utteranceId: string;
  timestamp: string;
  speaker: string;
  transcript: string;
}

export interface PRDiffFile {
  filePath: string;
  changedSymbols: string[];
  rawPatch: string;
}

export interface BeePRConstraintMatch {
  utteranceId: string;
  matchedFile: string;
  matchedSymbol: string;
  developerNote: string;
  blockingWarning: string;
  confidence: number;
}

/**
 * Matches spoken architectural reminders from Bee Wearable AI against active GitHub PR AST diffs.
 */
export function correlateBeeTranscriptsWithPR(
  transcripts: BeeTranscriptEvent[],
  prFiles: PRDiffFile[]
): BeePRConstraintMatch[] {
  const matches: BeePRConstraintMatch[] = [];

  for (const event of transcripts) {
    const normalizedText = event.transcript.toLowerCase();

    for (const file of prFiles) {
      for (const symbol of file.changedSymbols) {
        const cleanSymbol = symbol.toLowerCase();
        const fileBase = file.filePath.split('/').pop()?.replace(/\.[jt]sx?$/, '').toLowerCase() ?? '';

        if (
          (cleanSymbol.length > 2 && normalizedText.includes(cleanSymbol)) ||
          (fileBase.length > 2 && normalizedText.includes(fileBase))
        ) {
          matches.push({
            utteranceId: event.utteranceId,
            matchedFile: file.filePath,
            matchedSymbol: symbol,
            developerNote: event.transcript,
            blockingWarning: `[Bee Wearable Memory Alert] Spoken constraint captured at ${event.timestamp} references \`${symbol}\` in \`${file.filePath}\`: "${event.transcript}"`,
            confidence: normalizedText.includes(cleanSymbol) ? 0.94 : 0.78,
          });
        }
      }
    }
  }

  return matches;
}
