export type LlmEditAction =
  | { action: "replace_word_in_line"; line: number; from: string; to: string }
  | { action: "replace_word_in_all_lines"; from: string; to: string }
  | { action: "delete_line"; line: number }
  | { action: "delete_word_from_line"; line: number; word: string }
  | { action: "add_empty_line_after"; line: number }
  | { action: "add_line_after"; line: number; text: string }
  | { action: "merge_lines"; line: number }
  | { action: "break_line_after_word"; line: number; word: string }
  | { action: "add_stanza_between"; stanza: number; stanzaText: string }
  | { action: "add_punctuation_after_word"; line: number; word: string; punctuation: "," | "." }
  | { action: "remove_punctuation_after_word"; line: number; word: string; punctuation: "," | "." }
  | { action: "remove_punctuation_at_end_of_line"; line: number; punctuation: "," | "." }
  | { action: "rewrite_poem"; poem: string }
  | { action: "error"; message: string };

export type LlmEditResponse =
  | { action: "batch"; edits: LlmEditAction[] }
  | LlmEditAction;

