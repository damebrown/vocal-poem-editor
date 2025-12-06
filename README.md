# עורך שירה בקול - Hebrew Voice-Controlled Poem Editor

A React + TypeScript single-page web application that allows editing poems entirely by voice in Hebrew, using Chrome's SpeechRecognition API.

## Features

- **Voice Editing**: Edit poems using Hebrew voice commands
- **Keyboard Editing**: Click on the poem area to edit text directly
- **RTL Support**: Full right-to-left layout for Hebrew text
- **Line Numbering**: Visual line numbers (including blank lines) displayed on the right
- **Undo/Redo**: Full history navigation for all changes
- **8 Command Types**: Support for various poem editing operations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open the app in Chrome (SpeechRecognition API requires Chrome/Edge)

## Usage

### Voice Commands

Hold the **spacebar** to start recording, release to stop. The app recognizes Hebrew commands:

1. **החלפת מילה בשורה מסוימת**: "תשנה את המילה X בשורה Y למילה Z"
2. **החלפת מילה בכל השורות**: "תשנה את המילה X בכל השורות למילה Z"
3. **מחיקת שורה**: "תמחק את שורה X"
4. **הוספת שורה ריקה**: "תוסיף שורה ריקה אחרי שורה X"
5. **הוספת שורה עם טקסט**: "תוסיף שורה אחרי X: ...טקסט..."
6. **איחוד שורות**: "תחבר שורה X עם השורה שאחריה"
7. **שבירת שורה**: "תשבור את שורה X אחרי המילה Y"
8. **הוספת בית**: "תוסיף בית חדש בין בית X ל-X ועוד אחד: שורה א | שורה ב"

### Keyboard Editing

Click anywhere on the poem display area to enter edit mode. All lines become editable text inputs. Press **Escape** or click outside to exit edit mode.

### Undo/Redo

Use the "בטל" (Undo) and "חזור" (Redo) buttons in the header to navigate through the edit history.

## Technical Details

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Speech Recognition**: Chrome SpeechRecognition/webkitSpeechRecognition API
- **Language**: Hebrew (he-IL)
- **Layout**: RTL (Right-to-Left)

## Browser Requirements

- Chrome or Edge (for SpeechRecognition API support)
- Microphone permissions required

## Project Structure

```
src/
  ├── App.tsx           # Main application component
  ├── App.css           # Styling
  ├── poemModel.ts      # Data model and helpers
  ├── commandTypes.ts   # Command type definitions
  ├── parseCommand.ts   # Hebrew command parser
  ├── applyCommand.ts   # Command execution logic
  ├── main.tsx          # Entry point
  └── index.css         # Global styles
```

