// src/hooks/useSpeechSynthesis.js
import { useState, useCallback } from 'react';

export function useSpeechSynthesis() {
  const [isSupported] = useState(() => 'speechSynthesis' in window);

  const speak = useCallback((text) => {
    if (!isSupported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported]);

  return { isSupported, speak, stop };
}
