"use client";

import { VisionMetrics } from "@/hooks/useVisionAnalysis";
import { VoiceMetrics } from "@/hooks/useVoiceAnalysis";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  visionMetrics: VisionMetrics;
  voiceMetrics: VoiceMetrics;
  fillerWordCount: number;
  isReady: boolean;
}

const EMOTION_LABELS_AR: Record<string, string> = {
  neutral: "متزن وهادئ",
  happy: "مبتسم وواثق",
  sad: "متأمل",
  angry: "مشدود",
  fearful: "قلق / مرتبك",
  disgusted: "متحفظ",
  surprised: "مندهش",
};

const PACE_LABELS_AR: Record<string, string> = {
  normal: "متزن وطبيعي",
  fast: "سريع",
  slow: "متأنٍ وهادئ",
};

export function WebcamPanel({
  videoRef,
  visionMetrics,
  voiceMetrics,
  fillerWordCount,
  isReady,
}: Props) {
  const currentEmotion = EMOTION_LABELS_AR[visionMetrics.emotion] || visionMetrics.emotion || "متزن";
  const currentPace = PACE_LABELS_AR[voiceMetrics.pace] || voiceMetrics.pace;

  return (
    <div className="bg-slate-900/90 border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* نافذة تغذية الفيديو */}
      <div className="relative aspect-video bg-black/80 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-300/80 text-sm gap-2 bg-slate-950/70 backdrop-blur-xs">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>جاري تهيئة الكاميرا والذكاء البصري...</span>
          </div>
        )}

        {/* مؤشر البث المباشر والحالة العاطفية */}
        {isReady && visionMetrics.faceDetected && (
          <div className="absolute top-3 right-3 bg-slate-950/80 border border-emerald-500/30 backdrop-blur-md px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-bold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300">مباشر • {currentEmotion}</span>
          </div>
        )}

        {/* مؤشر الصوت والتحدث */}
        {voiceMetrics.isSpeaking && (
          <div className="absolute bottom-3 left-3 bg-emerald-500/90 text-slate-950 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
            <span>🎙️</span>
            <span>يتحدث الآن</span>
          </div>
        )}
      </div>

      {/* لوحة القياسات الحيوية اللحظية */}
      <div className="p-4 space-y-3 bg-gradient-to-b from-slate-900/50 to-slate-950/80">
        <Metric label="الثقة والاتزان" value={visionMetrics.confidence} color="green" />
        <Metric label="التواصل البصري" value={visionMetrics.eyeContact} color="blue" />
        <Metric label="مؤشر الهدوء (عكس التوتر)" value={100 - visionMetrics.stressLevel} color="teal" />
        <Metric label="نبرة وشدة الصوت" value={voiceMetrics.volume} color="purple" />

        {/* إحصائيات سريعة أسفل اللوحة */}
        <div className="flex justify-between items-center text-xs text-slate-300 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">كلمات التردد:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded ${fillerWordCount > 4 ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
              {fillerWordCount}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">سرعة الإلقاء:</span>
            <span className="font-bold text-slate-100">{currentPace}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "blue" | "teal" | "purple";
}) {
  const colorMap = {
    green: "from-emerald-500 to-teal-400",
    blue: "from-sky-500 to-cyan-400",
    teal: "from-teal-500 to-emerald-300",
    purple: "from-indigo-500 to-purple-400",
  };

  const displayValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-emerald-400 font-bold">{displayValue}%</span>
      </div>
      <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
        <div
          className={`h-full bg-gradient-to-r ${colorMap[color]} rounded-full transition-all duration-500`}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  );
}
