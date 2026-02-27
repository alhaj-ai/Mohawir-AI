"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/config";

interface Report {
  overall_score: number;
  summary: string;
  top_strengths: string;
  top_weaknesses: string;
  action_items: string;
  recurring_patterns: string;
}

interface Evaluation {
  question: string;
  answer: string;
  overall_score: number;
  strengths: string;
  weaknesses: string;
  better_answer: string;
}

interface Metrics {
  avg_confidence: number;
  avg_eye_contact: number;
  avg_stress: number;
  dominant_emotion: string;
  total_filler_words: number;
  filler_word_breakdown: Record<string, number>;
  avg_volume: number;
  speaking_time_seconds: number;
  silent_time_seconds: number;
}

const EMOTION_MAP_AR: Record<string, string> = {
  neutral: "متزن وهادئ",
  happy: "واثق ومبتسم",
  sad: "متأمل",
  angry: "مشدود",
  fearful: "قلق / مرتبك",
  disgusted: "متحفظ",
  surprised: "مندهش",
};

function getScoreStyle(score: number, max = 10) {
  const pct = (score / max) * 100;
  if (pct >= 75)
    return {
      text: "text-emerald-400",
      bar: "bg-emerald-500",
      ring: "#34d399",
      badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    };
  if (pct >= 50)
    return {
      text: "text-amber-400",
      bar: "bg-amber-500",
      ring: "#facc15",
      badge: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    };
  return {
    text: "text-rose-400",
    bar: "bg-rose-500",
    ring: "#f87171",
    badge: "bg-rose-500/15 border-rose-500/40 text-rose-300",
  };
}

function ScoreRing({ score, max = 10, size = 96 }: { score: number; max?: number; size?: number }) {
  const pct = score / max;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const style = getScoreStyle(score, max);
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#0a231c" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={style.ring}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-xl font-black leading-none ${style.text}`}>{score}</span>
        <span className="text-[10px] text-slate-400 leading-none mt-0.5">/{max}</span>
      </div>
    </div>
  );
}

function Bulleted({ text, color = "text-slate-200" }: { text: string; color?: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <ul className="space-y-2">
      {lines.map((line, idx) => (
        <li key={idx} className={`flex items-start gap-2 text-sm md:text-base leading-relaxed ${color}`}>
          <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
          <span>{line.replace(/^[-•*]\s*/, "")}</span>
        </li>
      ))}
    </ul>
  );
}

function StatBar({
  label,
  value,
  max = 100,
  color = "bg-emerald-500",
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  const displayVal = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-emerald-400 font-bold">{displayVal}%</span>
      </div>
      <div className="h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${(displayVal / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [report, setReport] = useState<Report | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | "overview">("overview");

  useEffect(() => {
    fetch(`${API_URL}/api/interview/${sessionId}/report`)
      .then((res) => res.json())
      .then((data) => {
        setReport(data.report);
        setEvaluations(data.evaluations || []);
        setMetrics(data.metrics || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="h-screen bg-brand-gradient flex flex-col items-center justify-center text-white gap-4 text-right">
        <div className="w-12 h-12 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-bold text-slate-200">
          جاري استخلاص التقرير الاستشاري وتجميع مؤشرات الذكاء الاصطناعي...
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-screen bg-brand-gradient flex flex-col items-center justify-center text-white gap-4 p-6 text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-2xl font-black">تعذر العثور على التقرير</h1>
        <p className="text-slate-400 text-sm max-w-md">
          قد تكون الجلسة غير مكتملة بعد أو تم حذفها، يمكنك بدء جلسة تدريبية جديدة.
        </p>
        <Link
          href="/setup"
          className="mt-4 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
        >
          بدء مقابلة جديدة
        </Link>
      </div>
    );
  }

  const overallStyle = getScoreStyle(report.overall_score, 100);
  const totalSpeaking = (metrics?.speaking_time_seconds || 0) + (metrics?.silent_time_seconds || 0);
  const speakingPct = totalSpeaking > 0 ? Math.round(((metrics?.speaking_time_seconds || 0) / totalSpeaking) * 100) : 0;

  return (
    <div className="min-h-screen bg-brand-gradient text-white flex flex-col selection:bg-emerald-500 selection:text-slate-950 text-right print:bg-white print:text-black">
      {/* الشريط العلوي */}
      <header className="px-6 py-4 flex justify-between items-center bg-slate-950/70 backdrop-blur-md border-b border-emerald-500/15 sticky top-0 z-30 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center group-hover:scale-105 transition-transform">
              مـ
            </div>
            <span className="font-black text-base text-white">مُحاوِر AI</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-bold text-emerald-400">التقرير الاستشاري والتقييم النهائي</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-all"
          >
            <span>🖨️</span>
            <span>طباعة أو حفظ PDF</span>
          </button>

          <Link
            href="/setup"
            className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
          >
            بدء مقابلة جديدة
          </Link>
        </div>
      </header>

      {/* لوحة العرض الرئيسية */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ── القائمة الجانبية (درجات الأسئلة والملخص) ── */}
        <aside className="w-full lg:w-80 bg-slate-950/60 border-b lg:border-b-0 lg:border-l border-emerald-500/15 flex flex-col shrink-0 print:hidden">
          {/* كرت الدرجة الكلية */}
          <div className="p-6 border-b border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-950/80">
            <div className="flex items-center gap-4">
              <ScoreRing score={report.overall_score} max={100} size={84} />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                  التقييم الإجمالي
                </p>
                <p className="text-xs text-slate-300 font-medium">
                  تمت الإجابة على {evaluations.length} أسئلة
                </p>
                <div className={`mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-block ${overallStyle.badge}`}>
                  {report.overall_score >= 75
                    ? "أداء متميز واستثنائي"
                    : report.overall_score >= 50
                    ? "أداء جيد مع فرص تطوير"
                    : "يحتاج لمزيد من التدريب"}
                </div>
              </div>
            </div>
          </div>

          {/* زر الملخص الشامل */}
          <div className="p-3">
            <button
              onClick={() => setSelected("overview")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black transition-all ${
                selected === "overview"
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-lg shadow-emerald-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>📊</span>
                <span>الملخص والتحليلات الشاملة</span>
              </div>
              <span className="text-xs opacity-60">←</span>
            </button>
          </div>

          {/* قائمة الأسئلة */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider px-2 pt-2">
              تفاصيل الأسئلة ({evaluations.length})
            </p>
            {evaluations.map((ev, idx) => {
              const s = getScoreStyle(ev.overall_score, 10);
              const active = selected === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelected(idx)}
                  className={`w-full text-right p-3.5 rounded-xl border transition-all text-xs group ${
                    active
                      ? "bg-slate-900 border-emerald-400/50 shadow-md shadow-emerald-500/10"
                      : "border-transparent bg-slate-950/40 hover:bg-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold ${active ? "text-emerald-300" : "text-slate-300"}`}>
                      السؤال {idx + 1}
                    </span>
                    <span className={`font-black ${s.text}`}>{ev.overall_score}/10</span>
                  </div>
                  <p className="text-slate-400 line-clamp-2 leading-relaxed group-hover:text-slate-200 transition-colors">
                    {ev.question}
                  </p>
                  <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${ev.overall_score * 10}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── لوحة العرض الرئيسية (اليمين والوسط) ── */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          {selected === "overview" ? (
            <OverviewPanel report={report} metrics={metrics} speakingPct={speakingPct} />
          ) : (
            <QuestionDetail evaluation={evaluations[selected as number]} idx={selected as number} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   لوحة التحليلات الشاملة (OVERVIEW PANEL)
   ============================================================ */
function OverviewPanel({
  report,
  metrics,
  speakingPct,
}: {
  report: Report;
  metrics: Metrics | null;
  speakingPct: number;
}) {
  const dominantEmotionAr = metrics?.dominant_emotion ? (EMOTION_MAP_AR[metrics.dominant_emotion] || metrics.dominant_emotion) : "متزن وهادئ";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
          التقرير الاستشاري والتحليل التنفيذي
        </h1>
        <p className="text-slate-400 text-sm">
          مراجعة تفصيلية لجلسة المقابلة، القياسات الحيوية للغة الجسد، وتوصيات تحسين الأداء.
        </p>
      </div>

      {/* لوحة المؤشرات البصرية والصوتية */}
      {metrics && (
        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 mb-6 flex items-center gap-2">
            <span>📷</span>
            <span>مؤشرات لغة الجسد ونبرة الصوت (Edge AI Analysis)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-8">
            <StatBar label="الثقة والاتزان العام" value={metrics.avg_confidence} color="bg-emerald-400" />
            <StatBar label="التواصل البصري مع الكاميرا" value={metrics.avg_eye_contact} color="bg-sky-400" />
            <StatBar label="مؤشر الهدوء (مقاومة التوتر)" value={100 - metrics.avg_stress} color="bg-teal-400" />
            <StatBar label="نسبة زمن التحدث الفعلي" value={speakingPct} color="bg-indigo-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xl font-black text-emerald-300">{dominantEmotionAr}</div>
              <div className="text-xs text-slate-400 mt-1">الحالة المزاجية السائدة</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xl font-black text-amber-300">{metrics.total_filler_words}</div>
              <div className="text-xs text-slate-400 mt-1">كلمات التردد والحشو (يعني، امم)</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xl font-black text-sky-300">{metrics.avg_volume}/100</div>
              <div className="text-xs text-slate-400 mt-1">متوسط شدة الصوت ووضوحه</div>
            </div>
          </div>

          {/* تفصيل كلمات التردد */}
          {metrics.filler_word_breakdown && Object.keys(metrics.filler_word_breakdown).length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-xs font-bold text-slate-400 mb-3">تفصيل كلمات التردد المسجلة:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(metrics.filler_word_breakdown).map(([word, count]) => (
                  <span
                    key={word}
                    className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold text-amber-300"
                  >
                    "{word}" × {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* الملخص التنفيذي */}
      <div className="bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
          <span>📝</span>
          <span>الملخص التنفيذي للأداء</span>
        </h2>
        <p className="text-slate-200 leading-relaxed text-base font-medium">{report.summary}</p>
      </div>

      {/* نقاط القوة وفرص التطوير */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
            <span>✅</span>
            <span>أبرز نقاط القوة</span>
          </h2>
          <Bulleted text={report.top_strengths} color="text-slate-200" />
        </div>

        <div className="bg-slate-900/60 border border-amber-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            <span>فرص التحسين وتفادي الأخطاء</span>
          </h2>
          <Bulleted text={report.top_weaknesses} color="text-slate-200" />
        </div>
      </div>

      {/* خطة العمل والتوصيات العملية */}
      <div className="bg-slate-900/60 border border-teal-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <h2 className="text-sm font-black uppercase tracking-wider text-teal-400 mb-4 flex items-center gap-2">
          <span>🎯</span>
          <span>خطة العمل والتوصيات العملية (Action Items)</span>
        </h2>
        <Bulleted text={report.action_items} color="text-slate-200" />
      </div>

      {/* الأنماط السابقة المتكررة */}
      {report.recurring_patterns && report.recurring_patterns !== "No prior data" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <span>🔁</span>
            <span>ملاحظات الذاكرة طويلة المدى</span>
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">{report.recurring_patterns}</p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   لوحة تفاصيل السؤال (QUESTION DETAIL PANEL)
   ============================================================ */
function QuestionDetail({ evaluation, idx }: { evaluation: Evaluation; idx: number }) {
  const s = getScoreStyle(evaluation.overall_score, 10);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* رأس السؤال والدرجة */}
      <div className="flex items-start justify-between gap-6 p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
        <div className="flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
            السؤال رقم {idx + 1}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
            {evaluation.question}
          </h2>
        </div>
        <ScoreRing score={evaluation.overall_score} max={10} size={84} />
      </div>

      {/* إجابة المرشح */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <span>🎙️</span>
          <span>إجابتك المسجلة خلال المقابلة:</span>
        </h3>
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
          "{evaluation.answer}"
        </p>
      </div>

      {/* نقاط القوة والضعف في الإجابة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
            <span>✓</span>
            <span>نقاط القوة في الإجابة</span>
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed">{evaluation.strengths}</p>
        </div>

        <div className="bg-slate-900/60 border border-amber-500/20 rounded-3xl p-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
            <span>!</span>
            <span>فرص التحسين</span>
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed">{evaluation.weaknesses}</p>
        </div>
      </div>

      {/* الإجابة النموذجية المثالية المقترحة */}
      <div className="bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-slate-950/80 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <h3 className="text-sm font-black uppercase tracking-wider text-emerald-300 mb-3 flex items-center gap-2">
          <span>💡</span>
          <span>الإجابة النموذجية المثالية البديلة (Model Answer)</span>
        </h3>
        <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-medium">
          {evaluation.better_answer}
        </p>
      </div>
    </div>
  );
}
