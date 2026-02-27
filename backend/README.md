# منظومة مُحاوِر الذكية (Mohawir AI) — الخادم البرمجي (Backend)

خادم واجهات برمجية ذكي مبني باستخدام **FastAPI** وهندسة الوكلاء المتعددين (**LangChain** و **LangGraph**)، ومزود بتفريغ صوتي عربي فائق السرعة عبر **Whisper Large v3** على مسرعات **Groq LPU**.

---

## المعمارية البرمجية (Architecture)

- **وكيل إدارة المقابلة (Interviewer Agent)**: Llama 3.3 70B مع دعم Gemini 2.5 Flash.
- **وكيل التقييم التفكيكي اللحظي (Evaluator Agent)**: Llama 3.1 8B Instant (تنفيذ متوازٍ خلفي ThreadPool).
- **وكيل التوجيه والتقرير النهائي (Coach Agent)**: Gemini 2.5 Flash / Llama 3.3 70B.
- **محرك التفريغ الصوتي (Voice STT)**: Groq Whisper Large v3 Turbo بدعم اللغة العربية الكامل `language="ar"`.
- **قاعدة البيانات الهجينة (Hybrid Storage)**: تخزين SQLite مدمج محلياً وتلقائياً مع دعم الربط السحابي بـ Supabase.

---

## التشغيل السريع (Quick Start)

```bash
# 1. الانتقال إلى مجلد الخادم
cd backend

# 2. إنشاء البيئة الافتراضية وتفعيلها
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. تثبيت المتطلبات
pip install -r requirements.txt

# 4. إعداد مفاتيح البيئة
cp .env.example .env
# قم بإضافة مفاتيح GROQ_API_KEY و GEMINI_API_KEY داخل ملف .env

# 5. تشغيل الخادم
uvicorn main:app --reload --port 8000
```
