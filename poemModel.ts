export type Line = {
  id: string;
  lineIndex: number;      // global index, including blank lines
  text: string;           // may be empty ("") for blank lines
  stanzaIndex: number;    // 1-based stanza index
};

export type Stanza = {
  stanzaIndex: number;
  lineIds: string[];
};

export type PoemState = {
  lines: Line[];
  stanzas: Stanza[];
};

// Helper to create a new line ID
let lineIdCounter = 0;
export function createLineId(): string {
  return `line-${Date.now()}-${++lineIdCounter}`;
}

// Recompute line indices and maintain stanza integrity
export function recomputeIndices(state: PoemState): PoemState {
  const newLines = state.lines.map((line, index) => ({
    ...line,
    lineIndex: index + 1,
  }));

  // Rebuild stanzas based on stanzaIndex
  const stanzaMap = new Map<number, string[]>();
  newLines.forEach(line => {
    if (!stanzaMap.has(line.stanzaIndex)) {
      stanzaMap.set(line.stanzaIndex, []);
    }
    stanzaMap.get(line.stanzaIndex)!.push(line.id);
  });

  // Create new stanzas array, sorted by stanzaIndex
  const newStanzas: Stanza[] = Array.from(stanzaMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([stanzaIndex, lineIds]) => ({
      stanzaIndex,
      lineIds,
    }));

  return {
    lines: newLines,
    stanzas: newStanzas,
  };
}

// Find line by lineIndex (1-based)
export function findLineByIndex(state: PoemState, lineIndex: number): Line | undefined {
  return state.lines.find(line => line.lineIndex === lineIndex);
}

// Find stanza by stanzaIndex (1-based)
export function findStanzaByIndex(state: PoemState, stanzaIndex: number): Stanza | undefined {
  return state.stanzas.find(stanza => stanza.stanzaIndex === stanzaIndex);
}

// Get all lines in a stanza
export function getStanzaLines(state: PoemState, stanzaIndex: number): Line[] {
  const stanza = findStanzaByIndex(state, stanzaIndex);
  if (!stanza) return [];
  return state.lines.filter(line => stanza.lineIds.includes(line.id));
}

// Get the last line index of a stanza
export function getLastLineIndexOfStanza(state: PoemState, stanzaIndex: number): number {
  const lines = getStanzaLines(state, stanzaIndex);
  if (lines.length === 0) return 0;
  return Math.max(...lines.map(l => l.lineIndex));
}

