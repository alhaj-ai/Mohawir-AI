"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  isActivelySpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  lastSpeechTime: number;
}

const SPEAKING_END_DELAY_MS = 1500;

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isActivelySpeaking, setIsActivelySpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldRestartRef = useRef(false);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    ) as ((new () => SpeechRecognitionInstance) | undefined);

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // دعم اللغة العربية للتعرف الصوتي المباشر
    recognition.lang = "ar-SA";

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (final || interim.trim()) {
        const now = Date.now();
        setLastSpeechTime(now);
        setIsActivelySpeaking(true);

        if (speakingTimerRef.current) {
          clearTimeout(speakingTimerRef.current);
        }

        speakingTimerRef.current = setTimeout(() => {
          setIsActivelySpeaking(false);
        }, SPEAKING_END_DELAY_MS);
      }

      if (final) {
        setTranscript((prev) => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") return;
      if (event.error === "aborted") return;
      console.warn("خطأ في التعرف على الصوت:", event.error);
      setError(event.error);
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // متجاهل عند إعادة التهيئة السريعة
        }
      } else {
        setIsListening(false);
        setIsActivelySpeaking(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      try {
        recognition.abort();
      } catch (e) {}
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      shouldRestartRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    } catch (e) {
      // قد يكون مشتغلاً بالفعل
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
      setIsActivelySpeaking(false);
    } catch (e) {}
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    isActivelySpeaking,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    lastSpeechTime,
  };
}
