"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSmartTranscription } from "@/hooks/useSmartTranscription";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useVisionAnalysis } from "@/hooks/useVisionAnalysis";
import { useVoiceAnalysis } from "@/hooks/useVoiceAnalysis";
import { API_URL } from "@/lib/config";

interface ChatMessage {
  role: "interviewer" | "candidate";
  content: string;
}

type Phase =
  | "loading"
  | "ai_speaking"
  | "initial_wait"
  | "user_speaking"
  | "silence_wait"
  | "submitting"
  | "complete";

const INITIAL_WAIT_MS = 45_000;
const SILENCE_RESET_MS = 20_000;

const EMOTION_MAP_AR: Record<string, string> = {
  neutral: "متزن وهادئ",
  happy: "واثق ومبتسم",
  sad: "متأمل",
  angry: "مشدود",
  fearful: "قلق / متوتر",
  disgusted: "متحفظ",
  surprised: "مندهش",
};

export default function Interview() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [phase, setPhase] = useState<Phase>("loading");
  const [countdown, setCountdown] = useState(0);

  const transcription = useSmartTranscription(sessionId);
  const synthesis = useSpeechSynthesis();
  const vision = useVisionAnalysis();
  const voice = useVoiceAnalysis();

  const submitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownEndRef = useRef<number>(0);
  const handledMessageIndexRef = useRef(-1);
  const isSubmittingRef = useRef(false);

  const [submitElapsed, setSubmitElapsed] = useState(0);
  const [lastSubmitDuration, setLastSubmitDuration] = useState<number | null>(null);
  const submitStartRef = useRef<number>(0);
  const submitElapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDurationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sessionData = localStorage.getItem("interviewSession");
    if (!sessionData) {
      router.push("/setup");
      return;
    }
    const { sessionId, firstMessage, company } = JSON.parse(sessionData);
    setSessionId(sessionId);
    setCompany(company);
    setMessages([{ role: "interviewer", content: firstMessage }]);

    const startAll = async () => {
      await vision.start();
      await voice.start();
    };
    startAll();

    return () => {
      vision.stop();
      voice.stop();
      clearAllTimers();
      if (submitElapsedTimerRef.current) clearInterval(submitElapsedTimerRef.current);
      if (lastDurationTimerRef.current) clearTimeout(lastDurationTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (phase === "submitting") {
      submitStartRef.current = Date.now();
      setSubmitElapsed(0);
      submitElapsedTimerRef.current = setInterval(() => {
        setSubmitElapsed(Date.now() - submitStartRef.current);
      }, 100);
    } else if (submitElapsedTimerRef.current) {
      clearInterval(submitElapsedTimerRef.current);
      submitElapsedTimerRef.current = null;
      if (submitStartRef.current > 0) {
        const duration = (Date.now() - submitStartRef.current) / 1000;
        submitStartRef.current = 0;
        setLastSubmitDuration(duration);
        if (lastDurationTimerRef.current) clearTimeout(lastDurationTimerRef.current);
        lastDurationTimerRef.current = setTimeout(() => setLastSubmitDuration(null), 5000);
      }
    }
  }, [phase]);

  const clearAllTimers = useCallback(() => {
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(0);
  }, []);

  const startTimer = useCallback(
    (durationMs: number, onExpire: () => void) => {
      clearAllTimers();
      countdownEndRef.current = Date.now() + durationMs;
      setCountdown(Math.ceil(durationMs / 1000));

      countdownTimerRef.current = setInterval(() => {
        const remaining = countdownEndRef.current - Date.now();
        if (remaining <= 0) {
          clearAllTimers();
          onExpire();
        } else {
          setCountdown(Math.ceil(remaining / 1000));
        }
      }, 250);

      submitTimerRef.current = setTimeout(onExpire, durationMs);
    },
    [clearAllTimers]
  );

  const handleSubmit = useCallback(
    async (answer: string) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      clearAllTimers();
      setPhase("submitting");

      const finalAnswer = answer.trim() || "(لم يقدم المرشح إجابة)";
      setMessages((prev) => [...prev, { role: "candidate", content: finalAnswer }]);
      voice.countFillerWords(finalAnswer);

      try {
        const res = await fetch(`${API_URL}/api/interview/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, answer: finalAnswer }),
        });
        if (!res.ok) {
          throw new Error(`خطأ في الخادم ${res.status}`);
        }
        const data = await res.json();
        setQuestionNumber(data.question_number);

        if (data.is_complete) {
          setPhase("complete");
          setMessages((prev) => [
            ...prev,
            { role: "interviewer", content: data.interviewer_message },
          ]);
          await saveFinalMetrics();
        } else {
          isSubmittingRef.current = false;
          setMessages((prev) => [
            ...prev,
            { role: "interviewer", content: data.interviewer_message },
          ]);
        }
      } catch (err) {
        isSubmittingRef.current = false;
        const answersSubmitted = messages.filter((m) => m.role === "candidate").length;
        if (answersSubmitted >= 5) {
          setPhase("complete");
          setMessages((prev) => [
            ...prev,
            {
              role: "interviewer",
              content:
                "اكتملت المقابلة بنجاح! تم حفظ كافة إجاباتك وتقييمها. انقر أدناه للاطلاع على التقرير التفصيلي.",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "interviewer",
              content: "نعتذر، حدثت مشكلة في الاتصال. يمكنك إعادة الإرسال أو الانتقال للسؤال التالي.",
            },
          ]);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, voice, clearAllTimers, messages]
  );

  const saveFinalMetrics = async () => {
    const visionAgg = vision.getAggregated();
    const voiceAgg = voice.getAggregated();
    const payload = {
      avg_confidence: visionAgg.avgConfidence,
      avg_eye_contact: visionAgg.avgEyeContact,
      avg_stress: visionAgg.avgStress,
      dominant_emotion: visionAgg.dominantEmotion,
      total_filler_words: voiceAgg.totalFillerWords,
      filler_word_breakdown: voiceAgg.fillerWordBreakdown,
      avg_volume: voiceAgg.avgVolume,
      speaking_time_seconds: voiceAgg.speakingTimeSeconds,
      silent_time_seconds: voiceAgg.silentTimeSeconds,
    };
    try {
      await fetch(`${API_URL}/api/interview/${sessionId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("فشل حفظ القياسات الحيوية:", err);
    }
  };

  const handleManualSubmit = async () => {
    const final = await transcription.stopRecording();
    handleSubmit(final);
  };

  const handleSkip = async () => {
    await transcription.stopRecording();
    handleSubmit("(اختار المرشح تخطي هذا السؤال)");
  };

  // دورة حياة التحدث والاستماع
  useEffect(() => {
    if (messages.length === 0) return;
    const lastIndex = messages.length - 1;
    const lastMsg = messages[lastIndex];

    if (lastMsg.role !== "interviewer") return;
    if (handledMessageIndexRef.current >= lastIndex) return;
    handledMessageIndexRef.current = lastIndex;

    clearAllTimers();
    setPhase("ai_speaking");

    synthesis.speak(lastMsg.content, async () => {
      if (phase === "complete" || isSubmittingRef.current) return;
      await transcription.startRecording();
      setPhase("initial_wait");

      startTimer(INITIAL_WAIT_MS, async () => {
        const text = await transcription.stopRecording();
        handleSubmit(text);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, synthesis, transcription, handleSubmit, startTimer, clearAllTimers]);

  // مراقبة توقف المستخدم عن التحدث
  useEffect(() => {
    if (phase !== "initial_wait" && phase !== "user_speaking" && phase !== "silence_wait") {
      return;
    }

    if (transcription.isActivelySpeaking) {
      if (phase !== "user_speaking") {
        clearAllTimers();
        setPhase("user_speaking");
      }
    } else if (phase === "user_speaking") {
      setPhase("silence_wait");
      startTimer(SILENCE_RESET_MS, async () => {
        const text = await transcription.stopRecording();
        handleSubmit(text);
      });
    }
  }, [
    transcription.isActivelySpeaking,
    phase,
    startTimer,
    clearAllTimers,
    transcription,
    handleSubmit,
  ]);

  const phaseInfo = {
    loading: { label: "جاري التحضير...", color: "text-slate-400", showTimer: false },
    ai_speaking: { label: "المحاور الذكي يتحدث الآن...", color: "text-sky-400", showTimer: false },
    initial_wait: { label: "استعد للإجابة... نحن بانتظارك", color: "text-slate-300", showTimer: true },
    user_speaking: { label: "الميكروفون يستمع لإجابتك الآن 🎙️", color: "text-emerald-400", showTimer: false },
    silence_wait: { label: "رُصد توقف عن الحديث... هل انتهيت؟", color: "text-amber-400", showTimer: true },
    submitting: { label: "جاري التفريغ الصوتي والتقييم اللحظي ⚡", color: "text-teal-400", showTimer: false },
    complete: { label: "اكتملت المقابلة بنجاح ✅", color: "text-emerald-400", showTimer: false },
  }[phase];

  const isComplete = phase === "complete";
  const isListening =
    phase === "initial_wait" || phase === "user_speaking" || phase === "silence_wait";

  const displayTranscript = transcription.livePreview || "";
  const currentEmotion = EMOTION_MAP_AR[vision.metrics.emotion] || vision.metrics.emotion || "متزن";

  return (
    <main className="h-screen bg-brand-gradient text-white overflow-hidden flex flex-col selection:bg-emerald-500 selection:text-slate-950 text-right">
      {/* الشريط العلوي */}
      <header className="px-6 py-3.5 flex justify-between items-center bg-slate-950/70 backdrop-blur-md border-b border-emerald-500/15 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center">
            مـ
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>{company || "المقابلة الوظيفية"}</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400">السؤال {questionNumber} من 5</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {lastSubmitDuration !== null && phase !== "submitting" && (
            <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              ✓ تم الرد في {lastSubmitDuration.toFixed(1)} ثانية
            </span>
          )}

          {phaseInfo.showTimer && countdown > 0 && (
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-mono font-bold text-sm text-amber-300">{countdown}s</span>
            </div>
          )}

          <span className={`font-bold text-xs ${phaseInfo.color}`}>{phaseInfo.label}</span>
        </div>
      </header>

      {/* المحتوى الرئيسي: تغذية الكاميرا وطبقات المراقبة */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-end">
        <video
          ref={vision.videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
        />

        {/* شاشة تحميل النماذج البصرية */}
        {!vision.isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-10">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm font-bold text-slate-200">جاري تفعيل الكاميرا والذكاء البصري الطرفي...</div>
            </div>
          </div>
        )}

        {/* بطاقة القياسات اللحظية المباشرة (Top-Right) */}
        {vision.isReady && (
          <div className="absolute top-4 right-4 bg-slate-950/75 backdrop-blur-xl rounded-2xl p-4 min-w-[210px] border border-emerald-500/20 shadow-2xl z-10 space-y-2.5">
            <div className="text-[10px] font-black tracking-wider text-emerald-400 uppercase border-b border-slate-800 pb-1.5 flex justify-between items-center">
              <span>التحليل البصري اللحظي</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <MetricBar label="الثقة والتركيز" value={vision.metrics.confidence} color="green" />
            <MetricBar label="التواصل البصري" value={vision.metrics.eyeContact} color="blue" />
            <MetricBar label="الهدوء (مقاومة التوتر)" value={100 - vision.metrics.stressLevel} color="teal" />
            <MetricBar label="نبرة الصوت" value={voice.metrics.volume} color="purple" />
            <div className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-800 flex justify-between">
              <span className="text-slate-400">الحالة:</span>
              <span className="text-emerald-300 font-bold">{currentEmotion}</span>
            </div>
          </div>
        )}

        {/* مؤشر الاستماع الحي (Top-Left) */}
        {transcription.isActivelySpeaking && (
          <div className="absolute top-4 left-4 bg-emerald-500/90 text-slate-950 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black shadow-lg animate-pulse z-10 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-950" />
            <span>نستمع لصوتك الآن</span>
          </div>
        )}

        {/* الشريط السفلي للحوار والأسئلة وأزرار التحكم */}
        <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent pt-12 pb-8 px-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* نص سؤال المحاور الحالي */}
            {messages.length > 0 && messages[messages.length - 1].role === "interviewer" && (
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/20 backdrop-blur-md shadow-2xl text-right">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <span>🎙️</span>
                    <span>المحاور الذكي:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => synthesis.speak(messages[messages.length - 1].content)}
                    className="text-xs text-emerald-300 hover:text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>🔊</span>
                    <span>إعادة الاستماع</span>
                  </button>
                </div>
                <p className="text-base sm:text-lg md:text-xl font-bold text-white leading-relaxed">
                  {messages[messages.length - 1].content}
                </p>
              </div>
            )}

            {/* معاينة تفريغ كلام المرشح المباشر */}
            {displayTranscript && isListening && (
              <div className="bg-slate-900/70 backdrop-blur-md border border-sky-500/30 rounded-2xl px-5 py-3 text-right">
                <div className="text-xs text-sky-300 font-bold mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span>معاينة إجابتك المباشرة:</span>
                </div>
                <div className="text-sm md:text-base text-slate-100 font-medium leading-relaxed">
                  {displayTranscript}
                </div>
              </div>
            )}

            {/* حالة الإرسال والمعالجة */}
            {phase === "submitting" && (
              <div className="flex flex-col items-center justify-center gap-2 py-2">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="font-mono text-emerald-400 font-bold text-sm">
                    {(submitElapsed / 1000).toFixed(1)}s
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-bold">
                  جاري التفريغ الدقيق عبر Whisper وتقييم الإجابة بواسطة الوكلاء...
                </span>
              </div>
            )}

            {/* أزرار الإجراءات والتحكم */}
            {!isComplete && isListening && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleManualSubmit}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black rounded-xl text-sm shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <span>إرسال الإجابة الآن</span>
                  <svg className="w-4 h-4 -rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                <button
                  onClick={handleSkip}
                  className="px-5 py-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl font-bold text-xs text-slate-300 transition-all"
                >
                  تخطي السؤال ⏭️
                </button>
              </div>
            )}

            {/* بطاقة اكتمال المقابلة */}
            {isComplete && (
              <div className="text-center py-4 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm">
                  <span>🎉</span>
                  <span>تهانينا! اكتملت جلسة المقابلة بنجاح</span>
                </div>
                <br />
                <button
                  onClick={() => {
                    const id = sessionId;
                    localStorage.removeItem("interviewSession");
                    router.push(`/report/${id}`);
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 font-black rounded-2xl text-base shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                >
                  <span>استعراض تقرير الأداء والاستشارة التنفيذية</span>
                  <svg className="w-5 h-5 -rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "blue" | "teal" | "purple";
}) {
  const colorMap = {
    green: "from-emerald-400 to-teal-400",
    blue: "from-sky-400 to-cyan-400",
    teal: "from-teal-400 to-emerald-300",
    purple: "from-indigo-400 to-purple-400",
  };
  const displayVal = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="mb-1.5 last:mb-0">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-emerald-400 font-bold">{displayVal}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full bg-gradient-to-r ${colorMap[color]} rounded-full transition-all duration-300`}
          style={{ width: `${displayVal}%` }}
        />
      </div>
    </div>
  );
}
