import { PoemState, recomputeIndices } from './poemModel';
import { LlmEditResponse, LlmEditAction } from './llmTypes';
import { applyCommand } from './applyCommand';
import { Command } from './commandTypes';
import { parsePoemFromText } from './parsePoem';

/**
 * Converts LLM edit action to the old Command format for reuse of existing logic
 */
function llmActionToCommand(action: LlmEditAction): Command | null {
  switch (action.action) {
    case 'replace_word_in_line':
      return { type: 'replaceWordInLine', line: action.line, from: action.from, to: action.to };
    case 'replace_word_in_all_lines':
      return { type: 'replaceWordInAllLines', from: action.from, to: action.to };
    case 'delete_line':
      return { type: 'deleteLine', line: action.line };
    case 'delete_word_from_line':
      return { type: 'deleteWordFromLine', line: action.line, word: action.word };
    case 'add_empty_line_after':
      return { type: 'addEmptyLineAfter', line: action.line };
    case 'add_line_after':
      return { type: 'addLineAfter', line: action.line, text: action.text };
    case 'merge_lines':
      return { type: 'mergeLines', line: action.line };
    case 'break_line_after_word':
      return { type: 'breakLineAfterWord', line: action.line, word: action.word };
    case 'add_stanza_between':
      return { type: 'addStanzaBetween', stanza: action.stanza, stanzaText: action.stanzaText };
    case 'add_punctuation_after_word':
      return { type: 'addPunctuationAfterWord', line: action.line, word: action.word, punctuation: action.punctuation };
    case 'remove_punctuation_after_word':
      return { type: 'removePunctuationAfterWord', line: action.line, word: action.word, punctuation: action.punctuation };
    case 'remove_punctuation_at_end_of_line':
      return { type: 'removePunctuationAtEndOfLine', line: action.line, punctuation: action.punctuation };
    case 'rewrite_poem':
      // This is handled separately
      return null;
    case 'error':
      // This is handled separately
      return null;
    default:
      return null;
  }
}

/**
 * Applies LLM edit response to poem state
 * Reuses existing applyCommand logic for individual actions
 */
export function applyLlmEdits(
  state: PoemState,
  response: LlmEditResponse
): { state: PoemState; error?: string } {
  try {
    // Handle error response
    if ('action' in response && response.action === 'error') {
      return { state, error: response.message };
    }

    // Handle rewrite_poem action
    if ('action' in response && response.action === 'rewrite_poem') {
      try {
        const newState = parsePoemFromText(response.poem);
        return { state: recomputeIndices(newState) };
      } catch (error) {
        return { state, error: `שגיאה בניתוח השיר החדש: ${error instanceof Error ? error.message : String(error)}` };
      }
    }

    // Handle batch actions
    let actions: LlmEditAction[];
    if ('action' in response && response.action === 'batch') {
      actions = response.edits;
    } else {
      // Single action
      actions = [response as LlmEditAction];
    }

    // Apply each action sequentially
    let currentState = state;
    for (const action of actions) {
      // Handle rewrite_poem in batch
      if (action.action === 'rewrite_poem') {
        try {
          currentState = parsePoemFromText(action.poem);
          currentState = recomputeIndices(currentState);
          continue;
        } catch (error) {
          return { state, error: `שגיאה בניתוח השיר החדש: ${error instanceof Error ? error.message : String(error)}` };
        }
      }

      // Handle error in batch
      if (action.action === 'error') {
        return { state: currentState, error: action.message };
      }

      // Convert LLM action to Command and apply using existing logic
      const command = llmActionToCommand(action);
      if (!command) {
        console.warn('[applyLlmEdits] Unknown action type:', action);
        continue;
      }

      const result = applyCommand(currentState, command);
      if (result.error) {
        return { state: currentState, error: result.error };
      }
      currentState = result.state;
    }

    return { state: recomputeIndices(currentState) };
  } catch (error) {
    return { state, error: `שגיאה: ${error instanceof Error ? error.message : String(error)}` };
  }
}

