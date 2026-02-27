"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/config";

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
      <polyline points="16 18 22 12 16 6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="8 6 2 12 8 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconNodes() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
      <rect x="2" y="2" width="6" height="5" rx="1" />
      <rect x="16" y="2" width="6" height="5" rx="1" />
      <rect x="9" y="17" width="6" height="5" rx="1" />
      <path d="M5 7v3.5h14V7M12 10.5V17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const INTERVIEW_TYPES = [
  {
    value: "behavioral",
    label: "مقابلة سلوكية (STAR)",
    Icon: IconChat,
    desc: "المواقف والتحديات والنتائج",
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/30",
    ring: "ring-emerald-400",
  },
  {
    value: "screening",
    label: "فرز أولي واستكشاف",
    Icon: IconSearch,
    desc: "التعرف على الخلفية والدافع",
    gradient: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-500/30",
    ring: "ring-sky-400",
  },
  {
    value: "technical_coding",
    label: "مقابلة تقنية وبرمجية",
    Icon: IconCode,
    desc: "الخوارزميات وحل المشكلات",
    gradient: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/30",
    ring: "ring-violet-400",
  },
  {
    value: "system_design",
    label: "تصميم النظم والمعمارية",
    Icon: IconNodes,
    desc: "التوسع السحابي والمقايضات",
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/30",
    ring: "ring-amber-400",
  },
  {
    value: "hr",
    label: "موارد بشرية وملاءمة",
    Icon: IconHeart,
    desc: "القيم وثقافة المنشأة",
    gradient: "from-rose-500 to-pink-600",
    shadow: "shadow-rose-500/30",
    ring: "ring-rose-400",
  },
];

const PERSONAS = [
  {
    value: "neutral",
    label: "محايد ومهني",
    emoji: "⚖️",
    desc: "موضوعي، عادل، ومباشر",
    activeBg: "from-emerald-500/20 to-teal-500/20",
    activeBorder: "border-emerald-400",
    activeShadow: "shadow-emerald-500/20",
  },
  {
    value: "friendly",
    label: "ودود وداعم",
    emoji: "🤝",
    desc: "مرحب، إيجابي، ويزيل التوتر",
    activeBg: "from-sky-500/20 to-teal-500/20",
    activeBorder: "border-sky-400",
    activeShadow: "shadow-sky-500/20",
  },
  {
    value: "adversarial",
    label: "صارم ومتحدٍ",
    emoji: "🎯",
    desc: "يدقق بالأرقام ويختبر تحت الضغط",
    activeBg: "from-red-500/20 to-orange-500/20",
    activeBorder: "border-red-400",
    activeShadow: "shadow-red-500/20",
  },
];

export default function Setup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [parsingPdf, setParsingPdf] = useState(false);
  const [startElapsed, setStartElapsed] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    company: "",
    job_description: "",
    resume: "",
    interview_type: "behavioral",
    persona: "neutral",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
    setParsingPdf(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API_URL}/api/resume/parse`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.text) {
        setFormData((prev) => ({ ...prev, resume: data.text }));
      } else {
        setError("تعذر استخراج النصوص من هذا الملف. يرجى تجربة ملف PDF آخر أو لصق النص يدوياً.");
        setResumeFileName("");
      }
    } catch {
      setError("فشل رفع الملف. يرجى التأكد من تشغيل الخادم والمحاولة مجدداً.");
      setResumeFileName("");
    } finally {
      setParsingPdf(false);
    }
  };

  const handleQuickFill = () => {
    setFormData({
      company: "أرامكو السعودية",
      job_description: "مهندس ذكاء اصطناعي ونظم متقدمة - تصميم وتطوير النماذج اللغوية الضخمة LLMs وهندسة حلول RAG والأنظمة متعددة الوكلاء السحابية.",
      resume: "مهندس ذكاء اصطناعي بخبرة عملية في بناء ونشر النماذج اللغوية، وإدارة واجهات برمجة التطبيقات عبر FastAPI، وهندسة المعماريات الموزعة، ومنهجية أجايل.",
      interview_type: "behavioral",
      persona: "neutral",
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim()) {
      setError("يرجى كتابة اسم المنشأة أو الشركة المستهدفة.");
      return;
    }
    if (!formData.job_description.trim()) {
      setError("يرجى كتابة أو لصق الوصف الوظيفي (Job Description).");
      return;
    }
    if (!formData.resume.trim()) {
      setError("يرجى رفع ملف السيرة الذاتية (PDF) أو كتابة تفاصيل خبراتك.");
      return;
    }

    const t0 = Date.now();
    setStartElapsed(0);
    setLoading(true);
    setError("");

    startTimerRef.current = setInterval(() => {
      setStartElapsed(Math.round((Date.now() - t0) / 100) / 10);
    }, 100);

    try {
      const res = await fetch(`${API_URL}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        let errMessage = "تعذر بدء جلسة المقابلة";
        try {
          const errData = await res.json();
          if (errData.detail) {
            if (typeof errData.detail === "string") {
              errMessage = errData.detail;
            } else if (Array.isArray(errData.detail)) {
              errMessage = errData.detail.map((d: any) => d.msg || d.loc?.join(" ")).join("، ");
            }
          }
        } catch {}
        throw new Error(errMessage);
      }

      const data = await res.json();
      localStorage.setItem(
        "interviewSession",
        JSON.stringify({
          sessionId: data.session_id,
          firstMessage: data.interviewer_message,
          company: formData.company,
        })
      );

      if (startTimerRef.current) clearInterval(startTimerRef.current);
      router.push("/interview");
    } catch (err: any) {
      if (startTimerRef.current) clearInterval(startTimerRef.current);
      setError(err?.message || "حدث خطأ أثناء التواصل مع الخادم، يرجى المحاولة مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-gradient text-white py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950 text-right">
      <div className="max-w-4xl mx-auto">
        {/* العودة للرئيسية */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span>العودة للرئيسية</span>
          </Link>
        </div>

        {/* ترويسة النموذج */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 flex items-center justify-center font-black text-slate-950 text-2xl mx-auto mb-4 shadow-xl shadow-emerald-500/20">
            مـ
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
            إعداد وتخصيص جلسة المقابلة
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            أدخل متطلبات الوظيفة وسيرتك الذاتية ليقوم الوكلاء الأذكياء بتخصيص أسئلة تحاكي مقابلة العمل الحقيقية بدقة.
          </p>
        </div>

        {/* زر التعبئة السريعة للتجربة الفورية */}
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={handleQuickFill}
            className="px-5 py-2.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <span>⚡</span>
            <span>تعبئة سريعة بنموذج تجريبي (أرامكو السعودية • مهندس ذكاء اصطناعي)</span>
          </button>
        </div>

        {/* رسائل التنبيه والخطأ */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-bold flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* بيانات الشركة والوصف الوظيفي */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <span>🏢</span>
              <span>1. بيانات المنشأة والدور الوظيفي</span>
            </h2>

            {/* اسم الشركة */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">
                اسم الشركة أو المنشأة المستهدفة: <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="مثال: أرامكو السعودية، نيوم، STC، طيران الإمارات، أو شركة تقنية ناشئة..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-white text-sm transition-all placeholder:text-slate-600 font-medium"
              />
            </div>

            {/* الوصف الوظيفي */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">
                الوصف الوظيفي ومتطلبات الدور (Job Description): <span className="text-emerald-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.job_description}
                onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                placeholder="الصق هنا المسؤوليات الأساسية، المهارات المطلوبة، وسنوات الخبرة للوظيفة..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-white text-sm transition-all placeholder:text-slate-600 font-medium leading-relaxed"
              />
            </div>
          </div>

          {/* السيرة الذاتية */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <span>📄</span>
              <span>2. السيرة الذاتية للمرشح (CV / Resume)</span>
            </h2>

            {/* منطقة سحب وإفلات PDF */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-400/70 bg-slate-950/50 hover:bg-slate-950/80 rounded-2xl p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                📂
              </div>
              <p className="text-sm font-bold text-slate-200 mb-1">
                {parsingPdf ? "جاري استخراج وقراءة نصوص السيرة الذاتية..." : resumeFileName ? `تم اختيار الملف: ${resumeFileName}` : "انقر لاختيار ملف السيرة الذاتية (PDF) أو اسحبه إلى هنا"}
              </p>
              <p className="text-xs text-slate-500">يدعم ملفات PDF والنصوص الرقمية باللغتين العربية والإنجليزية</p>
            </div>

            {/* أو لصق النص مباشرة */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-300">
                  أو راجع النص المستخرج / الصق سيرتك الذاتية يدوياً:
                </label>
                {formData.resume && (
                  <span className="text-[11px] text-emerald-400 font-medium">
                    ({formData.resume.length} حرف تم التعرف عليها)
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={formData.resume}
                onChange={(e) => setFormData({ ...formData, resume: e.target.value })}
                placeholder="ملخص خبراتك، مشاريعك التقنية السابقة، والمهارات الرئيسية..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none text-white text-xs transition-all placeholder:text-slate-600 leading-relaxed font-mono"
              />
            </div>
          </div>

          {/* نوع المقابلة */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <span>🎯</span>
              <span>3. نوع ونمط المقابلة</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {INTERVIEW_TYPES.map((type) => {
                const isSelected = formData.interview_type === type.value;
                const { Icon } = type;
                return (
                  <div
                    key={type.value}
                    onClick={() => setFormData({ ...formData, interview_type: type.value })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                      isSelected
                        ? "bg-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-xl text-white bg-gradient-to-br ${type.gradient}`}>
                        <Icon />
                      </div>
                      <span className="font-bold text-sm text-white">{type.label}</span>
                    </div>
                    <p className="text-xs text-slate-400">{type.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* شخصية المحاور */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <span>🎭</span>
              <span>4. شخصية المحاور الذكي</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PERSONAS.map((p) => {
                const isSelected = formData.persona === p.value;
                return (
                  <div
                    key={p.value}
                    onClick={() => setFormData({ ...formData, persona: p.value })}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all text-right relative overflow-hidden ${
                      isSelected
                        ? `bg-slate-900 ${p.activeBorder} ring-1 ${p.activeBorder} shadow-lg ${p.activeShadow}`
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-2xl mb-2">{p.emoji}</div>
                    <div className="font-bold text-sm text-white mb-1">{p.label}</div>
                    <div className="text-xs text-slate-400">{p.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* زر بدء المقابلة */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:via-teal-300 hover:to-emerald-400 text-slate-950 font-black rounded-2xl text-lg sm:text-xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جاري تهيئة المقابلة مع الوكلاء الأذكياء ({startElapsed} ثانية)...</span>
                </>
              ) : (
                <>
                  <span>دخول غرفة المقابلة وبدء التدريب الآن</span>
                  <svg className="w-6 h-6 -rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-500 mt-3">
              ملاحظة: سيتم طلب إذن الميكروفون والكاميرا لقياس التواصل البصري ولغة الجسد محلياً داخل جهازك دون رفع الفيديو.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
