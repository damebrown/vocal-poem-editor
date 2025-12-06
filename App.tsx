import { useState, useEffect, useRef, useCallback } from 'react';
import { PoemState, createLineId } from './poemModel';
import { parseCommand, getCommandDescription } from './parseCommand';
import { applyCommand } from './applyCommand';
import { parsePoemFromText } from './parsePoem';
import './App.css';

// Initial poem state with a sample poem
function createInitialPoemState(): PoemState {
  const lines = [
    { id: createLineId(), lineIndex: 1, text: "שורה ראשונה של הבית הראשון", stanzaIndex: 1 },
    { id: createLineId(), lineIndex: 2, text: "שורה שנייה של הבית הראשון", stanzaIndex: 1 },
    { id: createLineId(), lineIndex: 3, text: "", stanzaIndex: 1 },
    { id: createLineId(), lineIndex: 4, text: "שורה ראשונה של הבית השני", stanzaIndex: 2 },
    { id: createLineId(), lineIndex: 5, text: "שורה שנייה של הבית השני", stanzaIndex: 2 },
  ];

  return {
    lines,
    stanzas: [
      { stanzaIndex: 1, lineIds: lines.filter(l => l.stanzaIndex === 1).map(l => l.id) },
      { stanzaIndex: 2, lineIds: lines.filter(l => l.stanzaIndex === 2).map(l => l.id) },
    ],
  };
}

const initialPoemState = createInitialPoemState();

function App() {
  const [poemState, setPoemState] = useState<PoemState>(initialPoemState);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecognizedText, setLastRecognizedText] = useState("");
  const [lastCommandDescription, setLastCommandDescription] = useState("");
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState<PoemState[]>([initialPoemState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteText, setPasteText] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const spacebarPressedRef = useRef(false);
  const poemContainerRef = useRef<HTMLDivElement>(null);
  const historyIndexRef = useRef(0);
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Initialize speech recognition
  useEffect(() => {
    console.log('[SpeechRecognition] Initializing...');
    console.log('[SpeechRecognition] Environment:', {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      isHTTPS: window.location.protocol === 'https:',
      online: navigator.onLine
    });
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('[SpeechRecognition] Not supported in this browser');
      setError("דפדפן זה אינו תומך בזיהוי דיבור");
      return;
    }

    console.log('[SpeechRecognition] Creating recognition instance');
    const recognition = new SpeechRecognition();
    recognition.lang = "he-IL";
    recognition.continuous = false;
    recognition.interimResults = false;
    
    // Add maxAlternatives to potentially help with recognition
    if ('maxAlternatives' in recognition) {
      (recognition as any).maxAlternatives = 1;
    }

    console.log('[SpeechRecognition] Configuration:', {
      lang: recognition.lang,
      continuous: recognition.continuous,
      interimResults: recognition.interimResults,
      maxAlternatives: (recognition as any).maxAlternatives
    });

    recognition.onstart = () => {
      console.log('[SpeechRecognition] Started listening');
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      console.log('[SpeechRecognition] Result received:', event);
      // Reset retry count on successful recognition
      retryCountRef.current = 0;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      const transcript = event.results[0][0].transcript;
      console.log('[SpeechRecognition] Transcript:', transcript);
      setLastRecognizedText(transcript);
      
      const command = parseCommand(transcript);
      if (command) {
        console.log('[SpeechRecognition] Parsed command:', command);
        setLastCommandDescription(getCommandDescription(command));
        setError("");
        
        setPoemState(prevState => {
          const result = applyCommand(prevState, command);
          if (result.error) {
            console.error('[SpeechRecognition] Command error:', result.error);
            setError(result.error);
            return prevState;
          }
          
          console.log('[SpeechRecognition] Command applied successfully');
          // Add to history - update both atomically using functional updates
          setHistory(prevHistory => {
            const currentIndex = historyIndexRef.current;
            const newHistory = prevHistory.slice(0, currentIndex + 1);
            newHistory.push(result.state);
            setHistoryIndex(newHistory.length - 1);
            historyIndexRef.current = newHistory.length - 1;
            return newHistory;
          });
          
          return result.state;
        });
      } else {
        console.warn('[SpeechRecognition] Could not parse command from transcript:', transcript);
        setError("לא הצלחתי להבין את הפקודה");
        setLastCommandDescription("");
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error occurred:', {
        error: event.error,
        message: event.message,
        type: event.type,
        timeStamp: event.timeStamp,
        fullEvent: event
      });
      
      // Log network-specific details
      if (event.error === 'network') {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        console.error('[SpeechRecognition] Network error details:', {
          online: navigator.onLine,
          protocol: protocol,
          hostname: hostname,
          isLocalhost: hostname === 'localhost' || hostname === '127.0.0.1',
          isHTTPS: protocol === 'https:',
          connection: connection ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          } : 'not available',
          userAgent: navigator.userAgent,
          retryCount: retryCountRef.current
        });
        
        // Auto-retry for network errors (up to 2 retries)
        if (retryCountRef.current < 2) {
          retryCountRef.current++;
          const retryDelay = retryCountRef.current * 1000; // 1s, 2s
          console.log(`[SpeechRecognition] Retrying in ${retryDelay}ms (attempt ${retryCountRef.current}/2)...`);
          
          setError(`שגיאת רשת - מנסה שוב... (ניסיון ${retryCountRef.current}/2)`);
          
          // Clear any existing timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          // Retry after delay
          retryTimeoutRef.current = setTimeout(() => {
            console.log('[SpeechRecognition] Retrying recognition...');
            if (recognitionRef.current) {
              try {
                // Check if already recording to avoid conflicts
                if (isRecording) {
                  console.log('[SpeechRecognition] Already recording, skipping retry');
                  retryCountRef.current = 0;
                  return;
                }
                recognitionRef.current.start();
                console.log('[SpeechRecognition] Retry start() called');
              } catch (retryErr) {
                console.error('[SpeechRecognition] Retry start failed:', retryErr);
                setError('שגיאה בנסיון חוזר - נסה שוב מאוחר יותר');
                setIsRecording(false);
                retryCountRef.current = 0;
              }
            } else {
              console.error('[SpeechRecognition] Recognition instance not available for retry');
              setError('מערכת זיהוי הדיבור לא זמינה');
              setIsRecording(false);
              retryCountRef.current = 0;
            }
          }, retryDelay);
          
          // Don't set isRecording to false yet - let retry handle it
          return;
        }
        
        // Max retries reached
        retryCountRef.current = 0;
        
        // Provide more helpful error message
        let errorMsg = `שגיאת רשת בזיהוי דיבור`;
        if (!navigator.onLine) {
          errorMsg += ' - אין חיבור לאינטרנט';
        } else if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          errorMsg += ' - Speech Recognition דורש HTTPS (או localhost)';
        } else if (connection && connection.effectiveType === 'slow-2g') {
          errorMsg += ' - החיבור איטי מדי';
        } else {
          errorMsg += ' - ייתכן שהשרות של Google לא זמין או חסום. בדוק:';
          errorMsg += '\n• חומת אש/פרוקסי חוסמים את Google';
          errorMsg += '\n• נסה להשתמש ב-HTTPS במקום HTTP';
          errorMsg += '\n• בדוק הרשאות מיקרופון בדפדפן';
        }
        setError(errorMsg);
      } else {
        // Map other error types to Hebrew
        const errorMessages: { [key: string]: string } = {
          'no-speech': 'לא זוהה דיבור - נסה לדבר יותר חזק או קרוב יותר למיקרופון',
          'aborted': 'ההקלטה בוטלה',
          'audio-capture': 'שגיאה בגישה למיקרופון - בדוק הרשאות',
          'not-allowed': 'אין הרשאה לשימוש במיקרופון - בדוק הגדרות הדפדפן',
          'service-not-allowed': 'השירות לא מאושר - בדוק הגדרות הדפדפן'
        };
        
        setError(errorMessages[event.error] || `שגיאה בזיהוי דיבור: ${event.error}`);
        retryCountRef.current = 0;
      }
      
      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log('[SpeechRecognition] Recognition ended');
      setIsRecording(false);
      // Reset retry count if recognition ended normally (not due to error)
      // Note: This will be reset by onerror if there was an error
    };

    recognition.onnomatch = () => {
      console.warn('[SpeechRecognition] No speech was detected');
    };

    recognition.onspeechstart = () => {
      console.log('[SpeechRecognition] Speech detected, started processing');
    };

    recognition.onspeechend = () => {
      console.log('[SpeechRecognition] Speech ended');
    };

    recognition.onaudiostart = () => {
      console.log('[SpeechRecognition] Audio capture started');
    };

    recognition.onaudioend = () => {
      console.log('[SpeechRecognition] Audio capture ended');
    };

    recognition.onsoundstart = () => {
      console.log('[SpeechRecognition] Sound detected');
    };

    recognition.onsoundend = () => {
      console.log('[SpeechRecognition] Sound ended');
    };

    recognitionRef.current = recognition;
    console.log('[SpeechRecognition] Initialization complete');
    
    // Cleanup function
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      retryCountRef.current = 0;
    };
  }, [historyIndex]);

  // Handle spacebar for recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input/textarea first - allow normal spacebar behavior there
      const target = e.target as HTMLElement;
      const isInInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      
      // Always prevent default spacebar behavior to avoid scrolling (except in input fields)
      if ((e.code === 'Space' || e.key === ' ' || e.keyCode === 32) && !isInInput) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // If we're in an input field, don't handle recording
      if (isInInput) {
        return;
      }
      
      if (e.code === 'Space' && !spacebarPressedRef.current && !isRecording && !isEditing) {
        spacebarPressedRef.current = true;
        if (recognitionRef.current) {
          console.log('[SpeechRecognition] Spacebar pressed, starting recognition...');
          console.log('[SpeechRecognition] Recognition state before start:', {
            isRecording,
            recognitionExists: !!recognitionRef.current,
            lang: recognitionRef.current.lang
          });
          
          // Check if recognition is already running
          const recognition = recognitionRef.current;
          if (!recognition) {
            console.error('[SpeechRecognition] Recognition instance is null');
            setError("מערכת זיהוי הדיבור לא מוכנה");
            spacebarPressedRef.current = false;
            return;
          }
          
          // Check network connectivity
          if (!navigator.onLine) {
            console.error('[SpeechRecognition] Device is offline');
            setError("אין חיבור לאינטרנט - Speech Recognition דורש חיבור פעיל");
            spacebarPressedRef.current = false;
            return;
          }
          
          setError("");
          console.log('[SpeechRecognition] Attempting to start recognition...');
          console.log('[SpeechRecognition] Network status:', {
            online: navigator.onLine,
            protocol: window.location.protocol,
            hostname: window.location.hostname
          });
          
          try {
            // Reset retry count when starting fresh
            retryCountRef.current = 0;
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = null;
            }
            
            recognition.start();
            console.log('[SpeechRecognition] start() called successfully');
            // Note: isRecording will be set to true in onstart handler
          } catch (err: any) {
            console.error('[SpeechRecognition] Error calling start():', err);
            const errorMsg = err?.message || String(err);
            
            // Handle specific error cases
            if (errorMsg.includes('already started') || errorMsg.includes('started')) {
              console.warn('[SpeechRecognition] Recognition already started, stopping first...');
              try {
                recognition.stop();
                // Wait a bit and retry
                setTimeout(() => {
                  try {
                    recognition.start();
                    console.log('[SpeechRecognition] Retry start() successful');
                  } catch (retryErr) {
                    console.error('[SpeechRecognition] Retry start() failed:', retryErr);
                    setError(`שגיאה בהתחלת הקלטה: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`);
                    setIsRecording(false);
                    spacebarPressedRef.current = false;
                  }
                }, 100);
              } catch (stopErr) {
                console.error('[SpeechRecognition] Error stopping before retry:', stopErr);
                setError(`שגיאה בהתחלת הקלטה: ${errorMsg}`);
                setIsRecording(false);
                spacebarPressedRef.current = false;
              }
            } else {
              setError(`שגיאה בהתחלת הקלטה: ${errorMsg}`);
              setIsRecording(false);
              spacebarPressedRef.current = false;
            }
          }
        } else {
          console.error('[SpeechRecognition] Recognition instance not available');
          setError("מערכת זיהוי הדיבור לא מוכנה");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Always prevent default spacebar behavior to avoid scrolling
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
      }
      
      if (e.code === 'Space' && spacebarPressedRef.current) {
        spacebarPressedRef.current = false;
        if (recognitionRef.current && isRecording) {
          console.log('[SpeechRecognition] Spacebar released, stopping recognition...');
          try {
            recognitionRef.current.stop();
            console.log('[SpeechRecognition] stop() called successfully');
          } catch (err) {
            console.error('[SpeechRecognition] Error calling stop():', err);
          }
        }
      }
    };

    // Use capture phase to catch events early and prevent default scrolling
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isRecording, isEditing]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      setPoemState(history[newIndex]);
      setError("");
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      historyIndexRef.current = newIndex;
      setPoemState(history[newIndex]);
      setError("");
    }
  }, [historyIndex, history]);

  const handlePoemClick = () => {
    setIsEditing(true);
  };

  const handlePoemBlur = (e: React.FocusEvent) => {
    // Only blur if focus is moving outside the container
    if (!poemContainerRef.current?.contains(e.relatedTarget as Node)) {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isEditing) {
      setIsEditing(false);
    }
    // Handle Ctrl+V / Cmd+V for paste dialog
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditing && !showPasteDialog) {
      e.preventDefault();
      setShowPasteDialog(true);
      setPasteText("");
    }
  };

  const handlePastePoem = () => {
    if (!pasteText.trim()) {
      setError("אנא הדבק טקסט");
      return;
    }

    try {
      const newPoemState = parsePoemFromText(pasteText);
      setPoemState(newPoemState);
      setHistory([newPoemState]);
      setHistoryIndex(0);
      historyIndexRef.current = 0;
      setShowPasteDialog(false);
      setPasteText("");
      setError("");
      setLastRecognizedText("");
      setLastCommandDescription("");
    } catch (err) {
      setError(`שגיאה בניתוח השיר: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCancelPaste = () => {
    setShowPasteDialog(false);
    setPasteText("");
    setError("");
  };

  // Handle global paste shortcut
  useEffect(() => {
    const handleGlobalPaste = (e: KeyboardEvent) => {
      // Only trigger if not in an input/textarea and not recording
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditing && !isRecording) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowPasteDialog(true);
          setPasteText("");
        }
      }
    };

    window.addEventListener('keydown', handleGlobalPaste);
    return () => window.removeEventListener('keydown', handleGlobalPaste);
  }, [isEditing, isRecording]);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (showPasteDialog && pasteTextareaRef.current) {
      pasteTextareaRef.current.focus();
      // Try to paste from clipboard
      navigator.clipboard.readText().then(text => {
        setPasteText(text);
      }).catch(() => {
        // Clipboard API not available or permission denied
      });
    }
  }, [showPasteDialog]);

  const handleLineChange = (lineId: string, newText: string) => {
    const newState = {
      ...poemState,
      lines: poemState.lines.map(line =>
        line.id === lineId ? { ...line, text: newText } : line
      ),
    };
    
    setPoemState(newState);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="app" dir="rtl">
      <div className="header">
        <h1>עורך שירה בקול</h1>
        <div className="controls">
          <button
            onClick={() => setShowPasteDialog(true)}
            className="paste-button"
            title="הדבק שיר חדש (Ctrl+V / Cmd+V)"
          >
            הדבק שיר
          </button>
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="undo-redo-button"
          >
            בטל
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="undo-redo-button"
          >
            חזור
          </button>
        </div>
      </div>

      <div className="status-panel">
        <div className="status-item">
          <strong>טקסט מזוהה:</strong> {lastRecognizedText || "—"}
        </div>
        <div className="status-item">
          <strong>פקודה:</strong> {lastCommandDescription || "—"}
        </div>
        {error && (
          <div className="status-item error">
            <strong>שגיאה:</strong> {error}
          </div>
        )}
        {isRecording && (
          <div className="status-item recording">
            <strong>מקליט...</strong> (שחרר את הרווח כדי לעצור)
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="content-left">
          <div
            ref={poemContainerRef}
            className={`poem-container ${isEditing ? 'editing' : ''}`}
            onClick={handlePoemClick}
            onBlur={handlePoemBlur}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {poemState.lines.map((line) => (
              <div key={line.id} className="poem-line">
                {isEditing ? (
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => handleLineChange(line.id, e.target.value)}
                    className="line-input"
                    dir="rtl"
                    autoFocus={line.id === poemState.lines[0]?.id}
                  />
                ) : (
                  <span className="line-text">{line.text || "\u00A0"}</span>
                )}
                <span className="line-number">{line.lineIndex}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="instructions">
          <p>לחץ והחזק את <strong>רווח</strong> כדי להתחיל הקלטה. שחרר כדי לעצור.</p>
          <p>לחץ על השיר כדי לערוך אותו במקלדת.</p>
          <p>לחץ על <strong>"הדבק שיר"</strong> או <strong>Ctrl+V / Cmd+V</strong> כדי להדביק שיר חדש.</p>
        </div>
      </div>

      {showPasteDialog && (
        <div className="paste-dialog-overlay" onClick={handleCancelPaste}>
          <div className="paste-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>הדבק שיר חדש</h2>
            <p className="paste-instructions">
              הדבק את הטקסט של השיר כאן. שורות ריקות יפרידו בין בתים.
            </p>
            <textarea
              ref={pasteTextareaRef}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="paste-textarea"
              dir="rtl"
              placeholder="הדבק את השיר כאן..."
              rows={10}
            />
            <div className="paste-dialog-buttons">
              <button onClick={handlePastePoem} className="paste-confirm-button">
                טען שיר
              </button>
              <button onClick={handleCancelPaste} className="paste-cancel-button">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

