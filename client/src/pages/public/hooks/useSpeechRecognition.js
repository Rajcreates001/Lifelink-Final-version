import { useEffect, useRef, useState } from 'react';

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/**
 * useSpeechRecognition — Manages browser SpeechRecognition lifecycle.
 *
 * @returns {{ isRecording: boolean, transcript: string, toggleRecording: () => void, isSupported: boolean }}
 */
export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!recognitionRef.current && SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
    }
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert('Microphone not supported.');
      return;
    }
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }
    setTranscript('');
    recognition.start();
    setIsRecording(true);
    recognition.onresult = (event) => setTranscript(event.results[0][0].transcript);
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
  };

  return {
    isRecording,
    transcript,
    toggleRecording,
    isSupported: !!SpeechRecognitionAPI,
  };
}
