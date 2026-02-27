"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Meyda from "meyda";

export interface VoiceMetrics {
  volume: number;
  pitch: number;
  pace: string;
  fillerWordCount: number;
  isSpeaking: boolean;
}

export interface AggregatedVoiceMetrics {
  avgVolume: number;
  speakingTimeSeconds: number;
  silentTimeSeconds: number;
  totalFillerWords: number;
  fillerWordBreakdown: Record<string, number>;
}

// قائمة كلمات التردد والحشو المزدوجة (العربية والإنجليزية الشائعة)
const FILLER_WORDS = [
  "يعني", "اممم", "ااه", "طيب", "كذا", "صراحة", "بصراحة", "زي ما تقول",
  "فاهم علي", "يعني مثلا", "تقريبا", "اهه", "ايوا",
  "um", "uh", "umm", "uhh", "like", "you know", "basically",
  "actually", "literally", "sort of", "kind of", "right", "okay so",
];

export function useVoiceAnalysis() {
  const [metrics, setMetrics] = useState<VoiceMetrics>({
    volume: 0,
    pitch: 0,
    pace: "normal",
    fillerWordCount: 0,
    isSpeaking: false,
  });
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const volumeSamplesRef = useRef<number[]>([]);
  const speakingFramesRef = useRef(0);
  const silentFramesRef = useRef(0);
  const fillerBreakdownRef = useRef<Record<string, number>>({});

  const countFillerWords = useCallback((text: string): number => {
    const lower = " " + text.toLowerCase() + " ";
    let total = 0;
    FILLER_WORDS.forEach((word) => {
      const regex = new RegExp(`(^|\\s)${word}(\\s|$)`, "gi");
      const matches = lower.match(regex);
      const count = matches?.length || 0;
      if (count > 0) {
        fillerBreakdownRef.current[word] =
          (fillerBreakdownRef.current[word] || 0) + count;
        total += count;
      }
    });
    return total;
  }, []);

  const getAggregated = useCallback((): AggregatedVoiceMetrics => {
    const samples = volumeSamplesRef.current;
    const avgVolume =
      samples.length > 0
        ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
        : 0;

    const speakingSeconds = Math.round(speakingFramesRef.current / 10);
    const silentSeconds = Math.round(silentFramesRef.current / 10);

    const totalFillers = Object.values(fillerBreakdownRef.current).reduce(
      (a, b) => a + b,
      0
    );

    return {
      avgVolume,
      speakingTimeSeconds: speakingSeconds,
      silentTimeSeconds: silentSeconds,
      totalFillerWords: totalFillers,
      fillerWordBreakdown: { ...fillerBreakdownRef.current },
    };
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      const analyzer = Meyda.createMeydaAnalyzer({
        audioContext,
        source,
        bufferSize: 512,
        featureExtractors: ["rms", "spectralCentroid", "energy"],
        callback: (features: any) => {
          if (!features) return;

          const rawRms = features.rms || 0;
          const volume = Math.min(100, Math.round(rawRms * 400));
          const isSpeaking = volume > 15;

          if (isSpeaking) {
            speakingFramesRef.current += 1;
            volumeSamplesRef.current.push(volume);
          } else {
            silentFramesRef.current += 1;
          }

          const pitch = Math.min(100, Math.round((features.spectralCentroid || 0) / 50));

          setMetrics((prev) => ({
            ...prev,
            volume,
            pitch,
            isSpeaking,
          }));
        },
      });

      analyzer.start();
      analyzerRef.current = analyzer;
    } catch (err: any) {
      setError(err?.message || "تعذر الوصول للميكروفون");
    }
  }, []);

  const stop = useCallback(() => {
    if (analyzerRef.current) {
      try {
        analyzerRef.current.stop();
      } catch (e) {}
      analyzerRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  return {
    metrics,
    error,
    start,
    stop,
    countFillerWords,
    getAggregated,
  };
}
