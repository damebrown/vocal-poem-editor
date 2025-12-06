export type Command =
  | { type: "replaceWordInLine"; line: number; from: string; to: string }
  | { type: "replaceWordInAllLines"; from: string; to: string }
  | { type: "deleteLine"; line: number }
  | { type: "deleteWordFromLine"; line: number; word: string }
  | { type: "addEmptyLineAfter"; line: number }
  | { type: "addLineAfter"; line: number; text: string }
  | { type: "mergeLines"; line: number }
  | { type: "breakLineAfterWord"; line: number; word: string }
  | { type: "addStanzaBetween"; stanza: number; stanzaText: string }
  | { type: "addPunctuationAfterWord"; line: number; word: string; punctuation: "," | "." }
  | { type: "removePunctuationAfterWord"; line: number; word: string; punctuation: "," | "." }
  | { type: "removePunctuationAtEndOfLine"; line: number; punctuation: "," | "." };

