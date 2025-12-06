import { PoemState, Line, createLineId, recomputeIndices, findLineByIndex, findStanzaByIndex, getLastLineIndexOfStanza } from "./poemModel";
import { Command } from "./commandTypes";

export function applyCommand(state: PoemState, command: Command): { state: PoemState; error?: string } {
  try {
    let newState: PoemState;

    switch (command.type) {
      case "replaceWordInLine": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        if (!line.text.includes(command.from)) {
          return { state, error: `המילה "${command.from}" לא נמצאה בשורה ${command.line}` };
        }
        const newText = line.text.replace(command.from, command.to);
        newState = {
          ...state,
          lines: state.lines.map(l => l.id === line.id ? { ...l, text: newText } : l),
        };
        break;
      }

      case "replaceWordInAllLines": {
        newState = {
          ...state,
          lines: state.lines.map(line => ({
            ...line,
            text: line.text.replace(new RegExp(command.from, 'g'), command.to),
          })),
        };
        break;
      }

      case "deleteWordFromLine": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        if (!line.text.includes(command.word)) {
          return { state, error: `המילה "${command.word}" לא נמצאה בשורה ${command.line}` };
        }
        
        // Escape special regex characters in the word
        const escapedWord = command.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Try to match the word as a whole word first (with word boundaries for Hebrew)
        // For Hebrew, we need to handle spaces around the word
        // Pattern: optional space before, the word, optional space after
        const wordPattern = `(?:^|\\s)${escapedWord}(?:\\s|$)`;
        let newText = line.text.replace(new RegExp(wordPattern, 'g'), (match) => {
          // If match starts with space, keep one space; if it ends with space, keep one space
          if (match.startsWith(' ') && match.endsWith(' ')) {
            return ' '; // Replace with single space
          }
          return ''; // Remove completely if at start/end
        });
        
        // If the word wasn't removed (maybe it's part of another word), try simple replace
        if (newText === line.text) {
          newText = line.text.replace(command.word, '');
        }
        
        // Clean up multiple spaces and trim
        newText = newText.replace(/\s+/g, ' ').trim();
        
        newState = {
          ...state,
          lines: state.lines.map(l => l.id === line.id ? { ...l, text: newText } : l),
        };
        break;
      }

      case "deleteLine": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        const newLines = state.lines.filter(l => l.id !== line.id);
        
        // Update stanza to remove the line ID
        const newStanzas = state.stanzas.map(stanza => ({
          ...stanza,
          lineIds: stanza.lineIds.filter(id => id !== line.id),
        })).filter(stanza => stanza.lineIds.length > 0); // Remove empty stanzas

        // Renumber stanzas
        const renumberedStanzas = newStanzas.map((stanza, index) => ({
          ...stanza,
          stanzaIndex: index + 1,
        }));

        // Update stanza indices in lines
        const stanzaMap = new Map<number, number>();
        renumberedStanzas.forEach((stanza, index) => {
          stanza.lineIds.forEach(lineId => {
            const oldStanza = state.stanzas.find(s => s.lineIds.includes(lineId));
            if (oldStanza) {
              stanzaMap.set(oldStanza.stanzaIndex, index + 1);
            }
          });
        });

        const updatedLines = newLines.map(line => {
          const oldStanza = state.stanzas.find(s => s.lineIds.includes(line.id));
          if (oldStanza) {
            const newStanzaIndex = stanzaMap.get(oldStanza.stanzaIndex) || line.stanzaIndex;
            return { ...line, stanzaIndex: newStanzaIndex };
          }
          return line;
        });

        newState = {
          lines: updatedLines,
          stanzas: renumberedStanzas,
        };
        break;
      }

      case "addEmptyLineAfter": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        const insertIndex = state.lines.findIndex(l => l.id === line.id);
        const newLine: Line = {
          id: createLineId(),
          lineIndex: 0, // Will be recomputed
          text: "",
          stanzaIndex: line.stanzaIndex,
        };
        const newLines = [
          ...state.lines.slice(0, insertIndex + 1),
          newLine,
          ...state.lines.slice(insertIndex + 1),
        ];
        
        // Update stanza to include new line
        const newStanzas = state.stanzas.map(stanza =>
          stanza.stanzaIndex === line.stanzaIndex
            ? { ...stanza, lineIds: [...stanza.lineIds, newLine.id] }
            : stanza
        );

        newState = { lines: newLines, stanzas: newStanzas };
        break;
      }

      case "addLineAfter": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        const insertIndex = state.lines.findIndex(l => l.id === line.id);
        const newLine: Line = {
          id: createLineId(),
          lineIndex: 0, // Will be recomputed
          text: command.text,
          stanzaIndex: line.stanzaIndex,
        };
        const newLines = [
          ...state.lines.slice(0, insertIndex + 1),
          newLine,
          ...state.lines.slice(insertIndex + 1),
        ];
        
        // Update stanza to include new line
        const newStanzas = state.stanzas.map(stanza =>
          stanza.stanzaIndex === line.stanzaIndex
            ? { ...stanza, lineIds: [...stanza.lineIds, newLine.id] }
            : stanza
        );

        newState = { lines: newLines, stanzas: newStanzas };
        break;
      }

      case "mergeLines": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        const lineIndex = state.lines.findIndex(l => l.id === line.id);
        if (lineIndex === state.lines.length - 1) {
          return { state, error: `אין שורה אחרי שורה ${command.line}` };
        }
        const nextLine = state.lines[lineIndex + 1];
        const mergedText = `${line.text} ${nextLine.text}`.trim();
        
        const newLines = state.lines
          .map((l) => {
            if (l.id === line.id) {
              return { ...l, text: mergedText };
            }
            return l;
          })
          .filter(l => l.id !== nextLine.id);

        // Update stanza to remove next line
        const newStanzas = state.stanzas.map(stanza => ({
          ...stanza,
          lineIds: stanza.lineIds.filter(id => id !== nextLine.id),
        })).filter(stanza => stanza.lineIds.length > 0);

        // Renumber stanzas if needed
        const renumberedStanzas = newStanzas.map((stanza, index) => ({
          ...stanza,
          stanzaIndex: index + 1,
        }));

        // Update stanza indices in lines
        const updatedLines = newLines.map(l => {
          const oldStanza = state.stanzas.find(s => s.lineIds.includes(l.id));
          if (oldStanza) {
            const newStanza = renumberedStanzas.find(s => s.lineIds.includes(l.id));
            return { ...l, stanzaIndex: newStanza?.stanzaIndex || l.stanzaIndex };
          }
          return l;
        });

        newState = { lines: updatedLines, stanzas: renumberedStanzas };
        break;
      }

      case "breakLineAfterWord": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        if (!line.text.includes(command.word)) {
          return { state, error: `המילה "${command.word}" לא נמצאה בשורה ${command.line}` };
        }
        const wordIndex = line.text.indexOf(command.word);
        const afterWordIndex = wordIndex + command.word.length;
        const firstPart = line.text.substring(0, afterWordIndex).trim();
        const secondPart = line.text.substring(afterWordIndex).trim();
        
        const lineIndex = state.lines.findIndex(l => l.id === line.id);
        const newLine: Line = {
          id: createLineId(),
          lineIndex: 0, // Will be recomputed
          text: secondPart,
          stanzaIndex: line.stanzaIndex,
        };
        
        const newLines = [
          ...state.lines.slice(0, lineIndex),
          { ...line, text: firstPart },
          newLine,
          ...state.lines.slice(lineIndex + 1),
        ];

        // Update stanza to include new line
        const newStanzas = state.stanzas.map(stanza =>
          stanza.stanzaIndex === line.stanzaIndex
            ? { ...stanza, lineIds: [...stanza.lineIds, newLine.id] }
            : stanza
        );

        newState = { lines: newLines, stanzas: newStanzas };
        break;
      }

      case "addStanzaBetween": {
        const stanza = findStanzaByIndex(state, command.stanza);
        if (!stanza) {
          return { state, error: `בית ${command.stanza} לא נמצא` };
        }
        
        // Parse stanza text (lines separated by |)
        const stanzaLines = command.stanzaText.split('|').map(s => s.trim()).filter(s => s);
        if (stanzaLines.length === 0) {
          return { state, error: "טקסט הבית ריק" };
        }

        // Find the last line of the current stanza
        const lastLineIndex = getLastLineIndexOfStanza(state, command.stanza);
        const lastLine = findLineByIndex(state, lastLineIndex);
        if (!lastLine) {
          return { state, error: `לא נמצאה השורה האחרונה של בית ${command.stanza}` };
        }

        const insertIndex = state.lines.findIndex(l => l.id === lastLine.id);
        const newStanzaIndex = command.stanza + 1;

        // Shift existing stanzas
        const newStanzas = state.stanzas.map(s => ({
          ...s,
          stanzaIndex: s.stanzaIndex >= newStanzaIndex ? s.stanzaIndex + 1 : s.stanzaIndex,
        }));

        // Create new lines for the new stanza
        const newStanzaLines: Line[] = stanzaLines.map((text) => ({
          id: createLineId(),
          lineIndex: 0, // Will be recomputed
          text,
          stanzaIndex: newStanzaIndex,
        }));

        // Update stanza indices for lines after insertion point
        const updatedLines = state.lines.map(l => {
          const oldStanza = state.stanzas.find(s => s.lineIds.includes(l.id));
          if (oldStanza && oldStanza.stanzaIndex >= newStanzaIndex) {
            return { ...l, stanzaIndex: oldStanza.stanzaIndex + 1 };
          }
          return l;
        });

        const newLines = [
          ...updatedLines.slice(0, insertIndex + 1),
          ...newStanzaLines,
          ...updatedLines.slice(insertIndex + 1),
        ];

        // Add new stanza
        newStanzas.push({
          stanzaIndex: newStanzaIndex,
          lineIds: newStanzaLines.map(l => l.id),
        });

        // Sort stanzas by index
        newStanzas.sort((a, b) => a.stanzaIndex - b.stanzaIndex);

        newState = { lines: newLines, stanzas: newStanzas };
        break;
      }

      case "addPunctuationAfterWord": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        if (!line.text.includes(command.word)) {
          return { state, error: `המילה "${command.word}" לא נמצאה בשורה ${command.line}` };
        }
        
        // Find the word and add punctuation after it (only if not already there)
        const wordIndex = line.text.indexOf(command.word);
        if (wordIndex === -1) {
          return { state, error: `המילה "${command.word}" לא נמצאה בשורה ${command.line}` };
        }
        
        const afterWordIndex = wordIndex + command.word.length;
        const charAfterWord = line.text[afterWordIndex];
        
        // If punctuation already exists, don't add it again
        if (charAfterWord === command.punctuation) {
          return { state, error: `${command.punctuation === ',' ? 'פסיק' : 'נקודה'} כבר קיים אחרי המילה "${command.word}" בשורה ${command.line}` };
        }
        
        // Insert punctuation after the word
        const newText = line.text.substring(0, afterWordIndex) + command.punctuation + line.text.substring(afterWordIndex);
        newState = {
          ...state,
          lines: state.lines.map(l => l.id === line.id ? { ...l, text: newText } : l),
        };
        break;
      }

      case "removePunctuationAfterWord": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        if (!line.text.includes(command.word)) {
          return { state, error: `המילה "${command.word}" לא נמצאה בשורה ${command.line}` };
        }
        
        // Find the word and remove punctuation after it
        const wordIndex = line.text.indexOf(command.word);
        if (wordIndex === -1) {
          return { state, error: `המילה "${command.word}" לא נמצאה בשורה ${command.line}` };
        }
        
        const afterWordIndex = wordIndex + command.word.length;
        const charAfterWord = line.text[afterWordIndex];
        
        // If punctuation doesn't exist, return error
        if (charAfterWord !== command.punctuation) {
          return { state, error: `${command.punctuation === ',' ? 'פסיק' : 'נקודה'} לא נמצא אחרי המילה "${command.word}" בשורה ${command.line}` };
        }
        
        // Remove punctuation after the word
        const newText = line.text.substring(0, afterWordIndex) + line.text.substring(afterWordIndex + 1);
        newState = {
          ...state,
          lines: state.lines.map(l => l.id === line.id ? { ...l, text: newText } : l),
        };
        break;
      }

      case "removePunctuationAtEndOfLine": {
        const line = findLineByIndex(state, command.line);
        if (!line) {
          return { state, error: `שורה ${command.line} לא נמצאה` };
        }
        
        // Check if line ends with the specified punctuation
        const trimmedText = line.text.trim();
        if (trimmedText.length === 0) {
          return { state, error: `שורה ${command.line} ריקה` };
        }
        
        const lastChar = trimmedText[trimmedText.length - 1];
        if (lastChar !== command.punctuation) {
          return { state, error: `${command.punctuation === ',' ? 'פסיק' : 'נקודה'} לא נמצא בסוף שורה ${command.line}` };
        }
        
        // Remove punctuation from the end (preserve original spacing)
        const newText = line.text.trimEnd().slice(0, -1) + (line.text.endsWith(' ') ? ' ' : '');
        newState = {
          ...state,
          lines: state.lines.map(l => l.id === line.id ? { ...l, text: newText } : l),
        };
        break;
      }

      default:
        return { state, error: "פקודה לא מוכרת" };
    }

    // Always recompute indices after any change
    return { state: recomputeIndices(newState) };
  } catch (error) {
    return { state, error: `שגיאה: ${error instanceof Error ? error.message : String(error)}` };
  }
}

