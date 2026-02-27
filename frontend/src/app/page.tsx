"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "ready" | "offline">("checking");

  useEffect(() => {
    fetch(`${API_URL}/api/check-keys`)
      .then((res) => res.json())
      .then((data) => {
        setBackendStatus(data.gemini_configured || data.groq_configured || data.sqlite_active ? "ready" : "offline");
      })
      .catch(() => setBackendStatus("offline"));
  }, []);

  const scrollToGuide = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-brand-gradient text-white overflow-x-hidden selection:bg-emerald-500 selection:text-slate-950">
      {/* ====================================================
          الهيدر وشريط التنقل العلوي
      ==================================================== */}
      <nav className="relative z-30 px-6 md:px-12 py-5 border-b border-emerald-500/10 backdrop-blur-md bg-slate-950/40 sticky top-0 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/25">
            مـ
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight text-white flex items-center gap-1.5">
              مُحاوِر <span className="text-emerald-400 text-sm font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">AI</span>
            </span>
            <span className="text-[11px] text-emerald-200/60 font-medium -mt-0.5">منصة المقابلات الذكية</span>
          </div>
        </div>

        {/* روابط سريعة على الشاشات الكبيرة */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
          <a href="#features" className="hover:text-emerald-400 transition-colors">المزايا والوكلاء</a>
          <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">آلية العمل</a>
          <a href="#personas" className="hover:text-emerald-400 transition-colors">شخصيات المحاورين</a>
        </div>

        {/* حالة النظام وزر البدء */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full shadow-inner">
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === "ready"
                  ? "bg-emerald-400 animate-pulse"
                  : backendStatus === "offline"
                  ? "bg-amber-400"
                  : "bg-yellow-400"
              }`}
            />
            <span className="text-slate-300 font-medium">
              {backendStatus === "ready"
                ? "النظام متصل وجاهز"
                : backendStatus === "offline"
                ? "وضع المعاينة المحلي"
                : "جاري التحقق..."}
            </span>
          </div>

          <Link
            href="/setup"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
          >
            ابدأ المقابلة مجاناً
          </Link>
        </div>
      </nav>

      {/* ====================================================
          قسم الواجهة الترحيبية (HERO SECTION)
      ==================================================== */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* خلفيات مضيئة هادئة */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        {/* شارة التعريف بالمنظومة */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs md:text-sm font-bold mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>المنظومة العربية الأولى لمحاكاة المقابلات بالذكاء الاصطناعي متعدد الوكلاء</span>
        </div>

        {/* العنوان الرئيسي بخط ثمانية العريض */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight md:leading-[1.15] max-w-5xl tracking-tight mb-6">
          تدرّب باحترافية، وتخطّ مقابلتك الوظيفية القادمة{" "}
          <span className="text-gradient">بثقة لا تهتز</span>
        </h1>

        {/* النص الفرعي التوضيحي */}
        <p className="text-base sm:text-lg md:text-xl text-slate-300/90 max-w-3xl leading-relaxed font-normal mb-10">
          <strong className="text-emerald-300 font-bold">مُحاوِر AI</strong> يضعك أمام محاكاة حقيقية لمقابلات كبرى الشركات في الخليج والشرق الأوسط.
          حوار صوتي تفاعلي باللغة العربية، قياس لحظي للغة الجسد ونبرة الصوت، وتقرير تقييمي يزودك بنماذج إجابة مثالية بديلة.
        </p>

        {/* أزرار الإجراءات الرئيسية */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center mb-16">
          <Link
            href="/setup"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:via-teal-300 hover:to-emerald-400 text-slate-950 font-black rounded-2xl text-lg shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group"
          >
            <span>ابدأ جلستك التدريبية الآن</span>
            <svg
              className="w-5 h-5 -rotate-180 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>

          <button
            onClick={scrollToGuide}
            className="w-full sm:w-auto px-7 py-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 text-slate-200 font-bold rounded-2xl text-base transition-all flex items-center justify-center gap-2"
          >
            <span>شاهد كيف تعمل المنظومة</span>
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* ====================================================
            معاينة تفاعلية حية (INTERACTIVE PRODUCT PREVIEW CARD)
        ==================================================== */}
        <div className="w-full max-w-5xl rounded-3xl bg-slate-900/60 border border-emerald-500/20 p-4 md:p-6 shadow-2xl shadow-emerald-950/60 backdrop-blur-2xl relative overflow-hidden text-right">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          {/* شريط أدوات النافذة التفاعلية */}
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-slate-400 font-medium mr-2">محاكاة غرفة المقابلة الحية • مُحاوِر AI</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>جلسة مباشرة • أرامكو السعودية</span>
            </div>
          </div>

          {/* شبكة المعاينة */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* المحادثة الحية والأسئلة */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/15 text-right">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    AI
                  </div>
                  <span className="text-xs font-bold text-emerald-300">المحاور الذكي (أسلوب STAR السلوكي):</span>
                </div>
                <p className="text-sm md:text-base text-slate-200 leading-relaxed font-medium">
                  "أهلاً بك يا محمد. في سيرتك الذاتية ذكرت قيادتك لمشروع نقل البيانات إلى معمارية السحابة. صف لي موقفاً واجهت فيه خلافاً تقنياً مع زميل، وكيف توصلتم للحل والنتيجة؟"
                </p>
              </div>

              {/* بطاقة صوت المرشح وتحليل التردد */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-right">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    تفريغ صوت المرشح (عربي دقيق):
                  </span>
                  <span className="text-[11px] text-emerald-300/70 font-mono">00:38 / 02:00</span>
                </div>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
                  "الموقف كان عند اختيار نوع قاعدة البيانات، حيث فضل الزميل قاعدة SQL تقليدية بينما رأيت الحاجة إلى NoSQL لمعالجة التدفقات الضخمة. قمت بإنشاء بيئة اختبار معيارية (Benchmark) بالأرقام..."
                </p>
                {/* تموجات الصوت */}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-emerald-500/10">
                  <span className="text-xs text-slate-400 ml-2">نبرة الصوت:</span>
                  {[40, 70, 30, 85, 95, 60, 45, 80, 50, 90, 75, 35, 60, 90, 45].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-emerald-400/80 rounded-full animate-wave"
                      style={{ height: `${h * 0.25}px`, animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                  <span className="text-xs font-bold text-emerald-400 mr-auto">واثقة ومستقرة</span>
                </div>
              </div>
            </div>

            {/* لوحة المؤشرات البصرية الحيوية */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 block pb-1 border-b border-slate-800">
                  القياسات الحيوية للغة الجسد (Edge AI):
                </span>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">التواصل البصري مع الكاميرا:</span>
                    <span className="text-emerald-400 font-bold">92%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full w-[92%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">مؤشر الهدوء ومقاومة التوتر:</span>
                    <span className="text-teal-400 font-bold">88%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-400 rounded-full w-[88%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">كلمات الحشو والتردد (يعني، امم):</span>
                    <span className="text-emerald-400 font-bold">1 فقط (ممتاز)</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[95%]" />
                  </div>
                </div>
              </div>

              {/* بطاقة التقييم التفكيكي الفوري */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300 mb-1">
                  <span>⚡</span>
                  <span>التقييم اللحظي لوكيل التقييم:</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  هيكلية ممتازة تطابق أسلوب STAR، توضيح النتيجة بالأرقام الملموسة عزز الإجابة بشكل كبير.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          قسم المزايا والوكلاء المتعددين (FEATURES)
      ==================================================== */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-400 font-bold text-sm tracking-wider uppercase mb-2 block">
            بنية ذكاء اصطناعي ثورية
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
            ثلاثة وكلاء أذكياء يعملون بتناغم لإيصالك لقمة الجاهزية
          </h2>
          <p className="text-slate-400 text-base md:text-lg">
            لا نكتفي بطرح أسئلة عشوائية؛ بل ندير حواراً واقعياً متكاملاً يحاكي لجان التوظيف المتقدمة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* الوكيل 1 */}
          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              🎙️
            </div>
            <h3 className="text-xl font-black text-white mb-3">وكيل إدارة المقابلة</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              يطرح أسئلة تفاعلية ذكية تتكيف خطوة بخطوة مع إجاباتك وسيرتك الذاتية، مدعوماً بنماذج Llama 3.3 70B و Gemini.
            </p>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span>يدعم الفصحى واللهجات المهنية</span>
            </div>
          </div>

          {/* الوكيل 2 */}
          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-teal-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              ⚡
            </div>
            <h3 className="text-xl font-black text-white mb-3">وكيل التقييم التفكيكي</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              يعمل في مسار خلفي مستقل متزامن لتحليل إجاباتك فورياً بناءً على العمق التقني، الملاءمة، وهيكلية STAR دون أي تأخير.
            </p>
            <div className="text-xs font-bold text-teal-400 flex items-center gap-1">
              <span>تقييم فوري 0-10 لكل إجابة</span>
            </div>
          </div>

          {/* الوكيل 3 */}
          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="text-xl font-black text-white mb-3">وكيل التدريب التنفيذي</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              يصدر تقريراً استشارياً شاملاً في ختام المقابلة، يوضح نقاط القوة وفرص التحسين ويصيغ إجابات نموذجية بديلة يمكنك حفظها وتصديرها.
            </p>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span>توصيات عملية قابلة للتطبيق</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================
          قسم الأنماط وشخصيات المقابلة (PERSONAS & TYPES)
      ==================================================== */}
      <section id="personas" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-400 font-bold text-sm tracking-wider uppercase mb-2 block">
            محاكاة بيئات العمل الحقيقية
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
            اختر شخصية المحاور المناسبة لمستوى التحدي
          </h2>
          <p className="text-slate-400 text-base md:text-lg">
            سواء كنت تفضل بيئة مريحة وداعمة، أو مقابلة ضاغطة تختبر ثباتك تحت أشد الأسئلة تدقيقاً.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-right">
            <div className="text-2xl mb-3">🤝</div>
            <h3 className="text-lg font-black text-white mb-2">المحاور الودود والداعم</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              أسلوب دافئ ومرحب يثني على النقاط الإيجابية ويساعدك على كسر حاجز الرهبة وبناء ثقتك بنفسك في بداية التدريب.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-emerald-500/30 bg-emerald-950/10 text-right">
            <div className="text-2xl mb-3">⚖️</div>
            <h3 className="text-lg font-black text-white mb-2">المحاور المحايد والمهني</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              أسلوب موضوعي متزن يطرح الأسئلة المباشرة ويركز على الحقائق والأدلة، مماثل لمعظم لجان التوظيف الاحترافية.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-right">
            <div className="text-2xl mb-3">🎯</div>
            <h3 className="text-lg font-black text-white mb-2">المحاور الصارم والمتحدي</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              يدقق في كل تفصيلة، يرفض الإجابات العامة، ويطالب بأرقام وحالات دقيقة لاختبار ثباتك وقدرتك على الإقناع تحت الضغط.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================
          قسم خطوات العمل (HOW IT WORKS)
      ==================================================== */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-400 font-bold text-sm tracking-wider uppercase mb-2 block">
            بساطة وسرعة فائقة
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
            3 خطوات فقط تفصلك عن الجاهزية التامة
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
          <div className="relative p-6 rounded-3xl bg-slate-900/40 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black text-lg flex items-center justify-center mb-4">
              1
            </div>
            <h3 className="text-lg font-black text-white mb-2">ارفع سيرتك الذاتية والوصف</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              اسحب ملف سيرتك الذاتية بصيغة PDF وأدخل اسم المنشأة والوصف الوظيفي ليتعرف النظام على مهاراتك بدقة.
            </p>
          </div>

          <div className="relative p-6 rounded-3xl bg-slate-900/40 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-teal-500 text-slate-950 font-black text-lg flex items-center justify-center mb-4">
              2
            </div>
            <h3 className="text-lg font-black text-white mb-2">اختر النمط وشخصية المحاور</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              حدد نوع المقابلة (سلوكية، تقنية، تصميم نظم، أو موارد بشرية) وحدد مستوى الصرامة المطلوب.
            </p>
          </div>

          <div className="relative p-6 rounded-3xl bg-slate-900/40 border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-400 text-slate-950 font-black text-lg flex items-center justify-center mb-4">
              3
            </div>
            <h3 className="text-lg font-black text-white mb-2">خُض المقابلة واستلم تقريرك</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              تحدث بصوتك مباشرة أمام الكاميرا، واستلم تحليلاً مفصلاً بنقاط قوتك وإجابات نموذجية بديلة فور الانتهاء.
            </p>
          </div>
        </div>

        {/* دعوة ختامية للبدء */}
        <div className="mt-16 p-10 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-teal-950/50 to-slate-950/80 border border-emerald-500/30 text-center max-w-4xl mx-auto shadow-2xl">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
            هل أنت مستعد لمضاعفة فرص قبولك الوظيفي؟
          </h3>
          <p className="text-slate-300 text-sm md:text-base mb-6 max-w-xl mx-auto">
            انضم للآلاف من الكفاءات والمهندسين والمدراء الذين يطورون مهاراتهم في المقابلات يومياً.
          </p>
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black rounded-xl text-base shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
          >
            <span>ابدأ جلستك الآن مجاناً</span>
            <svg className="w-5 h-5 -rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ====================================================
          تذييل الصفحة (FOOTER)
      ==================================================== */}
      <footer className="py-10 px-6 border-t border-slate-800 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-white text-base">مُحاوِر AI</span>
            <span className="text-slate-400">| المنصة الذكية للمقابلات الوظيفية باللغة العربية</span>
          </div>
          <div className="text-slate-400">
            تم التطوير بواسطة <span className="text-emerald-400 font-bold">محمد الحاج (Mohammed AL-Haj)</span> • مهندس ذكاء اصطناعي ونظم متقدمة
          </div>
        </div>
      </footer>
    </main>
  );
}
