// src/hooks/useSpeechRecognition.js
import { useState, useRef, useCallback } from 'react';

const getRecognitionConstructor = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export function useSpeechRecognition({ onResult, onError }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => !!getRecognitionConstructor());
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    if (!isSupported || isListening) return;
    const Recognition = getRecognitionConstructor();
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      if (onError) onError(event.error);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setIsListening(false);
    }
  }, [isSupported, isListening, onResult, onError]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isSupported, isListening, start, stop };
}
