# עורך שירה בקול - Hebrew Voice-Controlled Poem Editor

A React + TypeScript single-page web application that allows editing poems entirely by voice in Hebrew, using Chrome's SpeechRecognition API and OpenAI's GPT models for intelligent command interpretation.

## Features

- **Voice Editing**: Edit poems using Hebrew voice commands interpreted by LLM
- **Keyboard Editing**: Click on the poem area to edit text directly
- **RTL Support**: Full right-to-left layout for Hebrew text
- **Line Numbering**: Visual line numbers (including blank lines) displayed on the right
- **Undo/Redo**: Full history navigation for all changes
- **LLM-Powered**: Uses OpenAI GPT to understand natural Hebrew commands
- **Multiple Command Types**: Support for various poem editing operations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your OpenAI API key:
   - Create a `.env` file in the project root
   - Add: `VITE_OPENAI_API_KEY=your_openai_api_key_here`
   - Get your API key from: https://platform.openai.com/api-keys

3. Start the development server:
```bash
npm run dev
```

4. Open the app in Chrome (SpeechRecognition API requires Chrome/Edge)

## Usage

### Voice Commands

Hold the **spacebar** to start recording, release to stop. The app uses an LLM to understand natural Hebrew commands. Examples:

1. **החלפת מילה בשורה מסוימת**: "תשנה את המילה X בשורה Y למילה Z"
2. **החלפת מילה בכל השורות**: "תשנה את המילה X בכל השורות למילה Z"
3. **מחיקת שורה**: "תמחק את שורה X"
4. **מחיקת מילה**: "תמחק את המילה X משורה Y"
5. **הוספת שורה ריקה**: "תוסיף שורה ריקה אחרי שורה X"
6. **הוספת שורה עם טקסט**: "תוסיף שורה אחרי X: ...טקסט..."
7. **איחוד שורות**: "תחבר שורה X עם השורה שאחריה"
8. **שבירת שורה**: "תשבור את שורה X אחרי המילה Y"
9. **הוספת בית**: "תוסיף בית חדש בין בית X ל-X ועוד אחד: שורה א | שורה ב"
10. **הוספת/מחיקת פיסוק**: "תוסיף פסיק אחרי המילה X בשורה Y" / "תמחק נקודה בסוף שורה X"

The LLM can understand variations and natural language, so you don't need to use exact phrases.

### Keyboard Editing

Click anywhere on the poem display area to enter edit mode. All lines become editable text inputs. Press **Escape** or click outside to exit edit mode.

### Undo/Redo

Use the "בטל" (Undo) and "חזור" (Redo) buttons in the header to navigate through the edit history.

## Technical Details

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Speech Recognition**: Chrome SpeechRecognition/webkitSpeechRecognition API
- **LLM Integration**: OpenAI GPT-4o-mini via Chat Completions API
- **Language**: Hebrew (he-IL)
- **Layout**: RTL (Right-to-Left)
- **Command Processing**: LLM-based natural language understanding (replaces regex parsing)

## Browser Requirements

- Chrome or Edge (for SpeechRecognition API support)
- Microphone permissions required

## Project Structure

```
src/
  ├── App.tsx           # Main application component
  ├── App.css           # Styling
  ├── poemModel.ts      # Data model and helpers
  ├── commandTypes.ts   # Legacy command type definitions (used internally)
  ├── llmTypes.ts       # LLM edit action type definitions
  ├── llmService.ts      # OpenAI API integration
  ├── applyLlmEdits.ts  # LLM edit execution logic
  ├── applyCommand.ts   # Command execution logic (reused by LLM)
  ├── parseCommand.ts   # Legacy regex parser (deprecated, kept for reference)
  ├── parsePoem.ts      # Poem text parsing utilities
  ├── main.tsx          # Entry point
  └── index.css         # Global styles
```

