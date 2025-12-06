import { PoemState, Line, createLineId, recomputeIndices } from './poemModel';

/**
 * Parse plain text into a PoemState
 * Blank lines separate stanzas
 */
export function parsePoemFromText(text: string): PoemState {
  const lines = text.split(/\r?\n/);
  const poemLines: Line[] = [];
  let currentStanzaIndex = 1;
  let lineIndex = 0;

  for (const lineText of lines) {
    lineIndex++;
    const trimmedText = lineText.trim();
    
    if (trimmedText === '') {
      // Blank line - add it and it separates stanzas
      poemLines.push({
        id: createLineId(),
        lineIndex: lineIndex,
        text: '',
        stanzaIndex: currentStanzaIndex,
      });
      // Next non-blank line will start a new stanza
      // (but only if we already have some content)
      if (poemLines.some(l => l.text !== '')) {
        currentStanzaIndex++;
      }
    } else {
      // Non-blank line - add to current stanza
      poemLines.push({
        id: createLineId(),
        lineIndex: lineIndex,
        text: trimmedText,
        stanzaIndex: currentStanzaIndex,
      });
    }
  }

  // If no lines, create a default empty poem
  if (poemLines.length === 0) {
    poemLines.push({
      id: createLineId(),
      lineIndex: 1,
      text: '',
      stanzaIndex: 1,
    });
  }

  // Build stanzas
  const stanzaMap = new Map<number, string[]>();
  poemLines.forEach(line => {
    if (!stanzaMap.has(line.stanzaIndex)) {
      stanzaMap.set(line.stanzaIndex, []);
    }
    stanzaMap.get(line.stanzaIndex)!.push(line.id);
  });

  const stanzas = Array.from(stanzaMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([stanzaIndex, lineIds]) => ({
      stanzaIndex,
      lineIds,
    }));

  const state: PoemState = {
    lines: poemLines,
    stanzas,
  };

  // Recompute indices to ensure they're correct
  return recomputeIndices(state);
}

