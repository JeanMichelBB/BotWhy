// src/hooks/useSpeechSynthesis.js
import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'voiceRepliesEnabled';

export function useSpeechSynthesis() {
  const [isSupported] = useState(() => 'speechSynthesis' in window);
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  }, [enabled]);

  const speak = useCallback((text) => {
    if (!isSupported || !enabled || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, [isSupported, enabled]);

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported]);

  return { isSupported, enabled, setEnabled, speak, stop };
}
