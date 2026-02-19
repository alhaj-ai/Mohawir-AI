"""
منظومة مُحاوِر الذكية (Mohawir AI)
خدمة المعالجة والتفريغ الصوتي الذكي (Voice Service)
تعتمد على نموذج Whisper Large v3 Turbo فائق السرعة عبر مسرعات Groq LPU
مخصصة لدعم اللغة العربية واللهجات والتعبيرات التقنية لسوق العمل العربي
"""

import os
try:
    from groq import Groq
except ImportError:
    Groq = None
from dotenv import load_dotenv

load_dotenv()

# قاموس المفردات والمصطلحات التقنية والوظيفية لتوجيه محرك Whisper نحو دقة استماع 99%
INTERVIEW_VOCABULARY_AR = (
    "سياق مقابلة وظيفية تقنية ومهنية باللغة العربية. قد يتحدث المرشح عن: "
    "الخبرات المهنية، الإنجازات، التحديات، منهجية ستار STAR، نقاط القوة والضعف، "
    "الذكاء الاصطناعي، تعلم الآلة، النماذج اللغوية الضخمة LLM، معالجة اللغات الطبيعية NLP، "
    "بايثون Python، جافاسكربت JavaScript، تايب سكريبت TypeScript، رياكت React، نيكست Next.js، "
    "فاست إيه بي آي FastAPI، نود Node.js، كوبرنيتس Kubernetes، دوكر Docker، "
    "الحوسبة السحابية Cloud Computing، خدمات أمازون AWS، جوجل كلاود GCP، مايكروسوفت أزور Azure، "
    "النظم الموزعة Microservices، واجهات برمجة التطبيقات REST API، جراف كيو إل GraphQL، "
    "قواعد البيانات PostgreSQL، مونجو دي بي MongoDB، ريديس Redis، كافكا Kafka، "
    "توليد معزز بالاسترجاع RAG، لانج شين LangChain، لانج جراف LangGraph، المتجهات Embeddings، "
    "هندسة البرمجيات Software Architecture، قابلية التوسع Scalability، زمن الاستجابة Latency، الإنتاجية Throughput، "
    "إدارة المشاريع Agile، سكرام Scrum، مؤشرات الأداء KPIs، الأهداف والنتائج الرئيسية OKRs، "
    "الأمن السيبراني، المصادقة OAuth، التشفير Encryption، حل النزاعات، العمل الجماعي، والقيادة التقنية."
)


class VoiceService:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key) if (api_key and Groq) else None

    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        custom_prompt: str = "",
        language: str = "ar",
    ) -> dict:
        """
        تفريغ التسجيل الصوتي بدقة فائقة باستخدام Groq Whisper Large v3.
        المخرجات: {"text": "...", "language": "ar", "duration": 4.5, "success": True}
        """
        if not self.client:
            return {
                "text": "",
                "language": language,
                "duration": 0.0,
                "success": False,
                "error": "مفتاح GROQ_API_KEY غير مهيأ في ملف .env",
            }

        try:
            # دمج القاموس الأساسي مع أي معلومات مخصصة من الوصف الوظيفي
            prompt = INTERVIEW_VOCABULARY_AR
            if custom_prompt:
                prompt = f"{prompt} تفاصيل إضافية: {custom_prompt}"

            # نموذج Whisper يحدد سقف التوجيه بـ 224 توكن تقريباً
            if len(prompt) > 850:
                prompt = prompt[:850]

            transcription = self.client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model="whisper-large-v3-turbo",
                response_format="verbose_json",
                language=language,
                prompt=prompt,
                temperature=0.0,
            )

            return {
                "text": transcription.text.strip(),
                "language": getattr(transcription, "language", language),
                "duration": getattr(transcription, "duration", 0.0),
                "success": True,
            }
        except Exception as e:
            print(f"تحذير: فشل التفريغ الصوتي عبر Whisper: {e}")
            return {
                "text": "",
                "language": language,
                "duration": 0.0,
                "success": False,
                "error": str(e),
            }


voice_service = VoiceService()
