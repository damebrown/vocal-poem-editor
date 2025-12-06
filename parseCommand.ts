import { Command } from "./commandTypes";

// Convert Hebrew number words to digits
function parseHebrewNumber(text: string): number | null {
  const hebrewNumbers: { [key: string]: number } = {
    'אחד': 1, 'אחת': 1, 'אחדה': 1,
    'שניים': 2, 'שתיים': 2, 'שני': 2,
    'שלושה': 3, 'שלוש': 3,
    'ארבעה': 4, 'ארבע': 4,
    'חמישה': 5, 'חמש': 5,
    'שישה': 6, 'שש': 6,
    'שבעה': 7, 'שבע': 7,
    'שמונה': 8,
    'תשעה': 9, 'תשע': 9,
    'עשרה': 10, 'עשר': 10,
    'אחת עשרה': 11, 'אחד עשר': 11,
    'שתים עשרה': 12, 'שנים עשר': 12,
    'שלוש עשרה': 13, 'שלושה עשר': 13,
    'ארבע עשרה': 14, 'ארבעה עשר': 14,
    'חמש עשרה': 15, 'חמישה עשר': 15,
    'שש עשרה': 16, 'שישה עשר': 16,
    'שבע עשרה': 17, 'שבעה עשר': 17,
    'שמונה עשרה': 18, 'שמונה עשר': 18,
    'תשע עשרה': 19, 'תשעה עשר': 19,
    'עשרים': 20,
  };

  // Try to find Hebrew number word (exact match or word boundary)
  const trimmedText = text.trim();
  for (const [hebrew, value] of Object.entries(hebrewNumbers)) {
    // Exact match
    if (trimmedText === hebrew) {
      return value;
    }
    // Word at start
    if (trimmedText.startsWith(hebrew + ' ')) {
      return value;
    }
    // Word at end
    if (trimmedText.endsWith(' ' + hebrew)) {
      return value;
    }
    // Word in middle (with spaces on both sides)
    if (trimmedText.includes(' ' + hebrew + ' ')) {
      return value;
    }
  }

  return null;
}

// Helper to extract number from text (handles both digits and Hebrew words)
function extractNumber(text: string): number | null {
  // First try direct digit match
  const digitMatch = text.match(/\d+/);
  if (digitMatch) {
    return parseInt(digitMatch[0], 10);
  }
  
  // Then try Hebrew number words
  const hebrewNum = parseHebrewNumber(text);
  if (hebrewNum !== null) {
    return hebrewNum;
  }

  return null;
}

export function parseCommand(hebrewText: string): Command | null {
  const text = hebrewText.trim();
  
  if (!text) return null;

  // 1. החלפת מילה בשורה מסוימת
  // "תשנה את המילה א בשורה ב למילה ג" or "תחליף את המילה א בשורה ב ב-ג"
  // Supports both digits and Hebrew number words
  const replaceWordInLineMatch = text.match(/ת(שנה|חליף)\s+את\s+המילה\s+([^\s]+)\s+בשורה\s+([^\s]+(?:\s+[^\s]+)*?)\s+(ל|ב-?)\s*([^\s]+(?:\s+[^\s]+)*)/);
  if (replaceWordInLineMatch) {
    const from = replaceWordInLineMatch[2];
    const lineText = replaceWordInLineMatch[3].trim();
    const line = extractNumber(lineText);
    const to = replaceWordInLineMatch[5].trim();
    if (line && line > 0 && from && to) {
      return { type: "replaceWordInLine", line, from, to };
    }
  }

  // Alternative: "תשנה את המילה א בשורה ב למילה ג"
  // Supports both digits and Hebrew number words
  const replaceWordInLineMatch2 = text.match(/ת(שנה|חליף)\s+את\s+המילה\s+([^\s]+)\s+בשורה\s+([^\s]+(?:\s+[^\s]+)*?)\s+למילה\s+([^\s]+(?:\s+[^\s]+)*)/);
  if (replaceWordInLineMatch2) {
    const from = replaceWordInLineMatch2[2];
    const lineText = replaceWordInLineMatch2[3].trim();
    const line = extractNumber(lineText);
    const to = replaceWordInLineMatch2[4].trim();
    if (line && line > 0 && from && to) {
      return { type: "replaceWordInLine", line, from, to };
    }
  }

  // 2. החלפת מילה בכל השורות
  // "תשנה את המילה א בכל השורות למילה ג" or "תעשה שבכל השורות א יהיה ג"
  const replaceWordInAllLinesMatch = text.match(/ת(שנה|עשה)\s+(?:את\s+)?המילה\s+([^\s]+)\s+בכל\s+השורות\s+למילה\s+([^\s]+(?:\s+[^\s]+)*)/);
  if (replaceWordInAllLinesMatch) {
    const from = replaceWordInAllLinesMatch[2];
    const to = replaceWordInAllLinesMatch[3].trim();
    if (from && to) {
      return { type: "replaceWordInAllLines", from, to };
    }
  }

  // Alternative: "תעשה שבכל השורות א יהיה ג"
  const replaceWordInAllLinesMatch2 = text.match(/תעשה\s+שבכל\s+השורות\s+([^\s]+)\s+יהיה\s+([^\s]+(?:\s+[^\s]+)*)/);
  if (replaceWordInAllLinesMatch2) {
    const from = replaceWordInAllLinesMatch2[1];
    const to = replaceWordInAllLinesMatch2[2].trim();
    if (from && to) {
      return { type: "replaceWordInAllLines", from, to };
    }
  }

  // 3. מחיקת שורה
  // "תמחק את שורה א" or "תסיר את שורה א"
  // Supports both digits and Hebrew number words
  const deleteLineMatch = text.match(/ת(מחק|סיר)\s+את\s+שורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (deleteLineMatch) {
    const lineText = deleteLineMatch[2].trim();
    const line = extractNumber(lineText);
    if (line && line > 0) {
      return { type: "deleteLine", line };
    }
  }

  // 3.5. מחיקת מילה משורה
  // "תמחק את המילה א משורה מספר ב" or "תמחק את המילה א משורה ב" or "תמחק את המילה א בשורה ב"
  // Supports both digits and Hebrew number words
  const deleteWordFromLineMatch = text.match(/תמחק\s+את\s+המילה\s+([^\s]+(?:\s+[^\s]+)*)\s+מ(?:שורה|בית)\s+(?:מספר\s+)?([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (deleteWordFromLineMatch) {
    const word = deleteWordFromLineMatch[1].trim();
    const lineText = deleteWordFromLineMatch[2].trim();
    const line = extractNumber(lineText);
    if (line && line > 0 && word) {
      return { type: "deleteWordFromLine", line, word };
    }
  }

  // Alternative: "תמחק את המילה א משורה ב"
  const deleteWordFromLineMatch2 = text.match(/תמחק\s+את\s+המילה\s+([^\s]+(?:\s+[^\s]+)*)\s+בשורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (deleteWordFromLineMatch2) {
    const word = deleteWordFromLineMatch2[1].trim();
    const lineText = deleteWordFromLineMatch2[2].trim();
    const line = extractNumber(lineText);
    if (line && line > 0 && word) {
      return { type: "deleteWordFromLine", line, word };
    }
  }

  // 4. הוספת שורה ריקה אחרי שורה א
  // "תוסיף שורה ריקה אחרי שורה א" or "תכניס שורה רווח אחרי שורה א"
  // Supports both digits and Hebrew number words
  const addEmptyLineMatch = text.match(/ת(וסיף|כניס)\s+שורה\s+(ריקה|רווח)\s+אחרי\s+שורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (addEmptyLineMatch) {
    const lineText = addEmptyLineMatch[3].trim();
    const line = extractNumber(lineText);
    if (line && line > 0) {
      return { type: "addEmptyLineAfter", line };
    }
  }

  // 5. הוספת שורה עם טקסט אחרי שורה א
  // "תוסיף את השורה הבאה אחרי שורה א: ...טקסט..." or "תוסיף שורה אחרי א: ...טקסט..."
  // Supports both digits and Hebrew number words
  const addLineMatch = text.match(/תוסיף\s+(?:את\s+)?(?:השורה\s+הבאה\s+)?שורה\s+(?:אחרי\s+)?שורה\s+([^\s]+(?:\s+[^\s]+)*?)\s*:\s*(.+)/);
  if (addLineMatch) {
    const lineText = addLineMatch[1].trim();
    const line = extractNumber(lineText);
    const text = addLineMatch[2].trim();
    if (line && line > 0 && text) {
      return { type: "addLineAfter", line, text };
    }
  }

  // Alternative: "תוסיף שורה אחרי א: ...טקסט..."
  // Supports both digits and Hebrew number words
  const addLineMatch2 = text.match(/תוסיף\s+שורה\s+אחרי\s+([^\s]+(?:\s+[^\s]+)*?)\s*:\s*(.+)/);
  if (addLineMatch2) {
    const lineText = addLineMatch2[1].trim();
    const line = extractNumber(lineText);
    const text = addLineMatch2[2].trim();
    if (line && line > 0 && text) {
      return { type: "addLineAfter", line, text };
    }
  }

  // 6. איחוד שורה א ושורה א+1
  // "תאחד את שורות א ו-א ועוד אחת" or "תחבר שורה א עם השורה שאחריה"
  // Supports both digits and Hebrew number words
  const mergeLinesMatch = text.match(/ת(אחד|חבר)\s+(?:את\s+)?שורות?\s+([^\s]+(?:\s+[^\s]+)*?)\s+(?:ו-?[^\s]+\s+ועוד\s+אחת|עם\s+השורה\s+שאחריה)/);
  if (mergeLinesMatch) {
    const lineText = mergeLinesMatch[2].trim();
    const line = extractNumber(lineText);
    if (line && line > 0) {
      return { type: "mergeLines", line };
    }
  }

  // Alternative: "תחבר את שורה א עם השורה שאחריה" or "תחבר שורה א עם השורה שאחריה"
  // Supports both digits and Hebrew number words
  const mergeLinesMatch2 = text.match(/תחבר\s+(?:את\s+)?שורה\s+([^\s]+(?:\s+[^\s]+)*?)\s+עם\s+השורה\s+שאחריה/);
  if (mergeLinesMatch2) {
    const lineText = mergeLinesMatch2[1].trim();
    const line = extractNumber(lineText);
    if (line && line > 0) {
      return { type: "mergeLines", line };
    }
  }

  // 7. שבירת שורה א לשתי שורות אחרי המילה ב
  // "תשבור את שורה א אחרי המילה ב" or "תחלק את שורה א לשתי שורות אחרי ב"
  // Supports both digits and Hebrew number words
  const breakLineMatch = text.match(/ת(שבור|חלק)\s+את\s+שורה\s+([^\s]+(?:\s+[^\s]+)*?)\s+(?:לשתי\s+שורות\s+)?אחרי\s+(?:המילה\s+)?([^\s]+(?:\s+[^\s]+)*)/);
  if (breakLineMatch) {
    const lineText = breakLineMatch[2].trim();
    const line = extractNumber(lineText);
    const word = breakLineMatch[3].trim();
    if (line && line > 0 && word) {
      return { type: "breakLineAfterWord", line, word };
    }
  }

  // 8. הוספת בית (סטנזה) חדש בין בית א לבית א+1
  // "תוסיף את הבית הבא בין בית 2 לבית 3: שורה א | שורה ב | שורה ג"
  // Supports both digits and Hebrew number words
  const addStanzaMatch = text.match(/תוסיף\s+(?:את\s+)?(?:הבית\s+הבא\s+)?בית\s+חדש\s+בין\s+בית\s+([^\s]+(?:\s+[^\s]+)*?)\s+ל(?:-?בית\s+)?([^\s]+(?:\s+[^\s]+)*?)\s*:\s*(.+)/);
  if (addStanzaMatch) {
    const stanzaText1 = addStanzaMatch[1].trim();
    const stanza = extractNumber(stanzaText1);
    const stanzaText = addStanzaMatch[3].trim();
    if (stanza && stanza > 0 && stanzaText) {
      return { type: "addStanzaBetween", stanza, stanzaText };
    }
  }

  // Alternative: "תוסיף בית חדש בין בית א ל-א ועוד אחד: ...טקסט..."
  // Supports both digits and Hebrew number words
  const addStanzaMatch2 = text.match(/תוסיף\s+(?:את\s+)?(?:הבית\s+הבא\s+)?בית\s+חדש\s+בין\s+בית\s+([^\s]+(?:\s+[^\s]+)*?)\s+ל(?:-[^\s]+\s+)?ועוד\s+אחד\s*:\s*(.+)/);
  if (addStanzaMatch2) {
    const stanzaText1 = addStanzaMatch2[1].trim();
    const stanza = extractNumber(stanzaText1);
    const stanzaText = addStanzaMatch2[2].trim();
    if (stanza && stanza > 0 && stanzaText) {
      return { type: "addStanzaBetween", stanza, stanzaText };
    }
  }

  // 9. הוספת פסיק או נקודה אחרי מילה בשורה
  // "תוסיף פסיק אחרי המילה א בשורה ב" or "תוסיף נקודה אחרי המילה א בשורה ב"
  // Supports both digits and Hebrew number words
  const addPunctuationMatch = text.match(/תוסיף\s+(?:את\s+)?(פסיק|נקודה)\s+אחרי\s+המילה\s+([^\s]+(?:\s+[^\s]+)*)\s+בשורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (addPunctuationMatch) {
    const punctuationType = addPunctuationMatch[1];
    const word = addPunctuationMatch[2].trim();
    const lineText = addPunctuationMatch[3].trim();
    const line = extractNumber(lineText);
    const punctuation = punctuationType === 'פסיק' ? ',' : '.';
    if (line && line > 0 && word) {
      return { type: "addPunctuationAfterWord", line, word, punctuation };
    }
  }

  // Alternative: "תוסיף פסיק אחרי המילה א בשורה ב"
  const addPunctuationMatch2 = text.match(/תוסיף\s+(פסיק|נקודה)\s+אחרי\s+([^\s]+(?:\s+[^\s]+)*)\s+בשורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (addPunctuationMatch2) {
    const punctuationType = addPunctuationMatch2[1];
    const word = addPunctuationMatch2[2].trim();
    const lineText = addPunctuationMatch2[3].trim();
    const line = extractNumber(lineText);
    const punctuation = punctuationType === 'פסיק' ? ',' : '.';
    if (line && line > 0 && word) {
      return { type: "addPunctuationAfterWord", line, word, punctuation };
    }
  }

  // 10. מחיקת פסיק או נקודה אחרי מילה בשורה
  // "תמחק פסיק אחרי המילה א בשורה ב" or "תמחק נקודה אחרי המילה א בשורה ב"
  // Supports both digits and Hebrew number words
  const removePunctuationMatch = text.match(/תמחק\s+(?:את\s+)?(פסיק|נקודה)\s+אחרי\s+המילה\s+([^\s]+(?:\s+[^\s]+)*)\s+בשורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (removePunctuationMatch) {
    const punctuationType = removePunctuationMatch[1];
    const word = removePunctuationMatch[2].trim();
    const lineText = removePunctuationMatch[3].trim();
    const line = extractNumber(lineText);
    const punctuation = punctuationType === 'פסיק' ? ',' : '.';
    if (line && line > 0 && word) {
      return { type: "removePunctuationAfterWord", line, word, punctuation };
    }
  }

  // Alternative: "תמחק פסיק אחרי המילה א בשורה ב"
  const removePunctuationMatch2 = text.match(/תמחק\s+(פסיק|נקודה)\s+אחרי\s+([^\s]+(?:\s+[^\s]+)*)\s+בשורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (removePunctuationMatch2) {
    const punctuationType = removePunctuationMatch2[1];
    const word = removePunctuationMatch2[2].trim();
    const lineText = removePunctuationMatch2[3].trim();
    const line = extractNumber(lineText);
    const punctuation = punctuationType === 'פסיק' ? ',' : '.';
    if (line && line > 0 && word) {
      return { type: "removePunctuationAfterWord", line, word, punctuation };
    }
  }

  // 11. מחיקת פסיק או נקודה בסוף שורה
  // "תמחק את הנקודה בסוף שורה א" or "תמחק את הפסיק בסוף שורה א"
  // Supports both digits and Hebrew number words
  const removePunctuationAtEndMatch = text.match(/תמחק\s+(?:את\s+)?(?:ה)?(פסיק|נקודה)\s+בסוף\s+שורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (removePunctuationAtEndMatch) {
    const punctuationType = removePunctuationAtEndMatch[1];
    const lineText = removePunctuationAtEndMatch[2].trim();
    const line = extractNumber(lineText);
    const punctuation = punctuationType === 'פסיק' ? ',' : '.';
    if (line && line > 0) {
      return { type: "removePunctuationAtEndOfLine", line, punctuation };
    }
  }

  // Alternative: "תמחק נקודה בסוף שורה א"
  const removePunctuationAtEndMatch2 = text.match(/תמחק\s+(פסיק|נקודה)\s+בסוף\s+שורה\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/);
  if (removePunctuationAtEndMatch2) {
    const punctuationType = removePunctuationAtEndMatch2[1];
    const lineText = removePunctuationAtEndMatch2[2].trim();
    const line = extractNumber(lineText);
    const punctuation = punctuationType === 'פסיק' ? ',' : '.';
    if (line && line > 0) {
      return { type: "removePunctuationAtEndOfLine", line, punctuation };
    }
  }

  return null;
}

export function getCommandDescription(command: Command | null): string {
  if (!command) return "";
  
  switch (command.type) {
    case "replaceWordInLine":
      return `החלפת המילה "${command.from}" במילה "${command.to}" בשורה ${command.line}`;
    case "replaceWordInAllLines":
      return `החלפת המילה "${command.from}" במילה "${command.to}" בכל השורות`;
    case "deleteLine":
      return `מחיקת שורה ${command.line}`;
    case "deleteWordFromLine":
      return `מחיקת המילה "${command.word}" משורה ${command.line}`;
    case "addEmptyLineAfter":
      return `הוספת שורה ריקה אחרי שורה ${command.line}`;
    case "addLineAfter":
      return `הוספת שורה אחרי שורה ${command.line}: "${command.text}"`;
    case "mergeLines":
      return `איחוד שורה ${command.line} עם השורה שאחריה`;
    case "breakLineAfterWord":
      return `שבירת שורה ${command.line} אחרי המילה "${command.word}"`;
    case "addStanzaBetween":
      return `הוספת בית חדש בין בית ${command.stanza} לבית ${command.stanza + 1}`;
    case "addPunctuationAfterWord":
      const punctName = command.punctuation === ',' ? 'פסיק' : 'נקודה';
      return `הוספת ${punctName} אחרי המילה "${command.word}" בשורה ${command.line}`;
    case "removePunctuationAfterWord":
      const punctName2 = command.punctuation === ',' ? 'פסיק' : 'נקודה';
      return `מחיקת ${punctName2} אחרי המילה "${command.word}" בשורה ${command.line}`;
    case "removePunctuationAtEndOfLine":
      const punctName3 = command.punctuation === ',' ? 'פסיק' : 'נקודה';
      return `מחיקת ${punctName3} בסוף שורה ${command.line}`;
    default:
      return "";
  }
}

