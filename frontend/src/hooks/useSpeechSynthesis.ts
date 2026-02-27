"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { API_URL } from "@/lib/config";

interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  speak: (text: string, onEnd?: () => void) => void;
  cancel: () => void;
  voices: SpeechSynthesisVoice[];
}

const ARABIC_VOICE_PRIORITY = [
  "Microsoft Hamed Online (Natural) - Arabic (Saudi Arabia)",
  "Microsoft Zariyah Online (Natural) - Arabic (Saudi Arabia)",
  "Microsoft Shakir Online (Natural) - Arabic (Egypt)",
  "Microsoft Salma Online (Natural) - Arabic (Egypt)",
  "Microsoft Fatima Online (Natural) - Arabic (UAE)",
  "Google Arabic",
  "Tarek",
  "Maged",
  "Laila",
  "Mariam",
];

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSupported, setIsSupported] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.speechSynthesis) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const pickBestBrowserVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // 1. مطابقة من قائمة أولويات الأصوات العربية
    for (const name of ARABIC_VOICE_PRIORITY) {
      const match = voices.find((v) => v.name.includes(name) || name.includes(v.name));
      if (match) return match;
    }

    // 2. أي صوت عربي طبيعي
    const naturalArabic = voices.find(
      (v) => v.lang.startsWith("ar") && v.name.toLowerCase().includes("natural")
    );
    if (naturalArabic) return naturalArabic;

    // 3. أي صوت عربي مسجل في المتصفح
    const anyArabic = voices.find((v) => v.lang.startsWith("ar"));
    if (anyArabic) return anyArabic;

    // يُمنع اختيار صوت إنجليزي لنطق نصوص عربية
    return null;
  }, [voices]);

  const fallbackBrowserSpeak = useCallback(
    (cleanText: string, onEnd?: () => void) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setIsSpeaking(false);
        onEnd?.();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = pickBestBrowserVoice();

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || "ar-SA";
      } else {
        utterance.lang = "ar-SA";
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [pickBestBrowserVoice]
  );

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      // إيقاف أي صوت سابق
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const cleanText = text.replace(/[*#_~`]/g, "").trim();
      if (!cleanText) {
        onEnd?.();
        return;
      }

      // محاولة التشغيل عبر محرك النطق العربي العصبي الفخم (Edge-TTS Saudi Voice)
      try {
        const audioUrl = `${API_URL}/api/voice/speak?text=${encodeURIComponent(cleanText)}&voice=ar-SA-HamedNeural`;
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          currentAudioRef.current = null;
          onEnd?.();
        };

        audio.onerror = () => {
          console.warn("تنبيه: تعذر تحميل الصوت العصبي، الانتقال للمحرك المحلي...");
          currentAudioRef.current = null;
          fallbackBrowserSpeak(cleanText, onEnd);
        };

        audio.play().catch((err) => {
          console.warn("Autoplay blocked or network error, falling back to browser TTS:", err);
          currentAudioRef.current = null;
          fallbackBrowserSpeak(cleanText, onEnd);
        });
      } catch (err) {
        fallbackBrowserSpeak(cleanText, onEnd);
      }
    },
    [fallbackBrowserSpeak]
  );

  const cancel = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return {
    isSupported,
    isSpeaking,
    speak,
    cancel,
    voices,
  };
}
