import { PoemState } from './poemModel';
import { LlmEditResponse } from './llmTypes';

// TODO: Set your OpenAI API key in an environment variable
// For development, you can create a .env file with: VITE_OPENAI_API_KEY=your_key_here
// For production, set it in your deployment environment
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

if (!OPENAI_API_KEY) {
  console.warn('[LLM] OPENAI_API_KEY not found. Please set VITE_OPENAI_API_KEY in your .env file');
}

/**
 * Converts PoemState to a plain text representation for the LLM
 */
function poemStateToText(poemState: PoemState): string {
  const lines: string[] = [];
  poemState.lines.forEach(line => {
    lines.push(line.text || '');
  });
  return lines.join('\n');
}

/**
 * System prompt in Hebrew that instructs the LLM to return only JSON
 */
const SYSTEM_PROMPT = `אתה מנוע עריכת שירה.

אתה מקבל מצב נוכחי של שיר (בפורמט טקסט) והוראה בעברית.

המטרה שלך היא להחזיר אך ורק JSON שמתאר את הפעולות שיש לבצע על השיר כדי ליישם את ההוראה.

אסור לך להחזיר טקסט חופשי, הסברים, או שום דבר שאינו JSON תקין.

המבנה של ה-JSON חייב להיות אחד מהבאים:

1. פעולה בודדת:
{
  "action": "replace_word_in_line",
  "line": 3,
  "from": "שקט",
  "to": "דממה"
}

2. מספר פעולות (batch):
{
  "action": "batch",
  "edits": [
    { "action": "replace_word_in_line", "line": 3, "from": "שקט", "to": "דממה" },
    { "action": "delete_line", "line": 5 }
  ]
}

3. שגיאה (אם ההוראה אינה ברורה):
{
  "action": "error",
  "message": "ההוראה אינה ברורה"
}

סוגי הפעולות הזמינות:
- "replace_word_in_line": החלפת מילה בשורה מסוימת (line, from, to)
- "replace_word_in_all_lines": החלפת מילה בכל השורות (from, to)
- "delete_line": מחיקת שורה (line)
- "delete_word_from_line": מחיקת מילה משורה (line, word)
- "add_empty_line_after": הוספת שורה ריקה אחרי שורה (line)
- "add_line_after": הוספת שורה עם טקסט אחרי שורה (line, text)
- "merge_lines": איחוד שורה עם השורה שאחריה (line)
- "break_line_after_word": שבירת שורה אחרי מילה (line, word)
- "add_stanza_between": הוספת בית חדש בין בתים (stanza, stanzaText - טקסט מופרד ב-|)
- "add_punctuation_after_word": הוספת פסיק או נקודה אחרי מילה (line, word, punctuation: "," או ".")
- "remove_punctuation_after_word": מחיקת פסיק או נקודה אחרי מילה (line, word, punctuation)
- "remove_punctuation_at_end_of_line": מחיקת פסיק או נקודה בסוף שורה (line, punctuation)
- "rewrite_poem": כתיבה מחדש של כל השיר (poem - טקסט עם שורות מופרדות ב-\\n)

חשוב: השורות ממוספרות מ-1, כולל שורות ריקות.`;

/**
 * Calls OpenAI API to get poem edits based on user command
 */
export async function getPoemEditsFromLLM(
  poemState: PoemState,
  userCommand: string
): Promise<LlmEditResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file');
  }

  const poemText = poemStateToText(poemState);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: JSON.stringify({
            poem: poemText,
            command: userCommand,
          }, null, 2),
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;
    const errorCode = errorData.error?.code || '';
    
    // Provide user-friendly error messages in Hebrew
    if (response.status === 429) {
      if (errorCode === 'insufficient_quota') {
        throw new Error('חסך ה-API שלך אזל. אנא בדוק את התוכנית והחיוב שלך ב-OpenAI. למידע נוסף: https://platform.openai.com/account/billing');
      } else {
        throw new Error('יותר מדי בקשות. אנא נסה שוב בעוד כמה רגעים.');
      }
    } else if (response.status === 401) {
      throw new Error('מפתח API לא תקין. אנא בדוק את ה-VITE_OPENAI_API_KEY ב-.env');
    } else if (response.status === 403) {
      throw new Error('אין הרשאה לגשת ל-API. בדוק את ההגדרות של מפתח ה-API שלך.');
    } else {
      throw new Error(`שגיאת API: ${errorMessage} (קוד: ${response.status})`);
    }
  }

  const data = await response.json();
  const rawContent = data.choices[0]?.message?.content;

  if (!rawContent) {
    throw new Error('No content in LLM response');
  }

  try {
    const jsonResponse = JSON.parse(rawContent) as LlmEditResponse;
    return jsonResponse;
  } catch (parseError) {
    console.error('[LLM] Failed to parse JSON response:', rawContent);
    throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }
}

/**
 * Generates a human-readable description of the LLM edit response
 */
export function getLlmEditDescription(response: LlmEditResponse): string {
  if ('action' in response && response.action === 'error') {
    return `שגיאה: ${response.message}`;
  }

  if ('action' in response && response.action === 'batch') {
    return `בוצעו ${response.edits.length} פעולות`;
  }

  if ('action' in response) {
    const action = response;
    switch (action.action) {
      case 'replace_word_in_line':
        return `החלפת המילה "${action.from}" במילה "${action.to}" בשורה ${action.line}`;
      case 'replace_word_in_all_lines':
        return `החלפת המילה "${action.from}" במילה "${action.to}" בכל השורות`;
      case 'delete_line':
        return `מחיקת שורה ${action.line}`;
      case 'delete_word_from_line':
        return `מחיקת המילה "${action.word}" משורה ${action.line}`;
      case 'add_empty_line_after':
        return `הוספת שורה ריקה אחרי שורה ${action.line}`;
      case 'add_line_after':
        return `הוספת שורה אחרי שורה ${action.line}: "${action.text}"`;
      case 'merge_lines':
        return `איחוד שורה ${action.line} עם השורה שאחריה`;
      case 'break_line_after_word':
        return `שבירת שורה ${action.line} אחרי המילה "${action.word}"`;
      case 'add_stanza_between':
        return `הוספת בית חדש בין בית ${action.stanza} לבית ${action.stanza + 1}`;
      case 'add_punctuation_after_word':
        const punctName1 = action.punctuation === ',' ? 'פסיק' : 'נקודה';
        return `הוספת ${punctName1} אחרי המילה "${action.word}" בשורה ${action.line}`;
      case 'remove_punctuation_after_word':
        const punctName2 = action.punctuation === ',' ? 'פסיק' : 'נקודה';
        return `מחיקת ${punctName2} אחרי המילה "${action.word}" בשורה ${action.line}`;
      case 'remove_punctuation_at_end_of_line':
        const punctName3 = action.punctuation === ',' ? 'פסיק' : 'נקודה';
        return `מחיקת ${punctName3} בסוף שורה ${action.line}`;
      case 'rewrite_poem':
        return 'כתיבה מחדש של השיר';
      default:
        return 'פעולה לא מוכרת';
    }
  }

  return 'תגובה לא מוכרת';
}

