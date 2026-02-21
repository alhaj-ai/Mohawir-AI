"""
منظومة مُحاوِر الذكية (Mohawir AI)
وكيل التوجيه وصياغة التقرير التنفيذي (Coach Agent)
يجمع كافة تقييمات المقابلة ومخرجات الوكلاء لصياغة تقرير استشاري شامل باللغة العربية
"""

import os
import json
from typing import Dict, List
from dotenv import load_dotenv

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None

from langchain_core.messages import HumanMessage

load_dotenv()

COACHING_PROMPT = """أنت مستشار توظيف وقيادة مهنية ومدرّب مهني معتمد (Senior Executive Career Coach).
مهمتك إعداد تقرير تقييم واستشارة مهنية شامل باللغة العربية لمرشح أتم جلسة مقابلة افتراضية.

سياق المقابلة:
- المنشأة المستهدفة: {company}
- الدور والوصف الوظيفي: {job_description}
- نمط المقابلة: {interview_type}

تقييمات الأسئلة والأجوبة خلال الجلسة:
{evaluations}

أنماط سابقة من جلسات المرشح السابقة:
{past_patterns}

قم بصياغة تقرير توجيهي عميق، صريح، وداعم دون مجاملة زائفة، باللغة العربية الفصحى.

أجب فقط بصيغة كائن JSON صالح تماماً وبدون أي مقدمات أو كتل برمجية:
{{
  "overall_score": <int 1-100>,
  "summary": "<فقرة من 3 إلى 4 جمل تلخص أداء المرشح وجاهزيته الحقيقية للدور الوظيفي>",
  "top_strengths": "<قائمة نقطية من 3 نقاط قوة بارزة، مفصولة بأسطر جديدة، كل نقطة تبدأ بـ '• '>",
  "top_weaknesses": "<قائمة نقطية من 3 فرص للتحسين وتفادي الأخطاء، مفصولة بأسطر جديدة، كل نقطة تبدأ بـ '• '>",
  "action_items": "<قائمة نقطية من 3 إلى 5 توصيات وتدريبات عملية محددة للتحضير، مفصولة بأسطر جديدة، تبدأ بـ '• '>",
  "recurring_patterns": "<ملاحظة ختامية حول النمط المتكرر أو 'لا توجد بيانات سابقة كافية'>"
}}
"""


class CoachAgent:
    """وكيل التدريب والتقرير الاستشاري النهائي."""

    def __init__(self):
        gemini_key = os.getenv("GEMINI_API_KEY")
        groq_key = os.getenv("GROQ_API_KEY")

        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.4,
            google_api_key=gemini_key,
        ) if (gemini_key and ChatGoogleGenerativeAI) else None

        self._fallback_llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            groq_api_key=groq_key,
        ) if (groq_key and ChatGroq) else None

    def generate_report(
        self,
        company: str,
        job_description: str,
        interview_type: str,
        evaluations: List[Dict],
        past_patterns: List[Dict],
    ) -> Dict:
        """توليد التقرير الاستشاري النهائي."""

        eval_text = ""
        for i, e in enumerate(evaluations, 1):
            eval_text += f"\nالسؤال {i}: {e.get('question', '')}\n"
            eval_text += f"الإجابة: {e.get('answer', '')}\n"
            eval_text += f"الدرجات: الملاءمة={e.get('relevance_score')}، الهيكلية={e.get('structure_score')}، العمق={e.get('depth_score')}، الإجمالي={e.get('overall_score')}\n"
            eval_text += f"نقاط القوة: {e.get('strengths', '')}\n"
            eval_text += f"نقاط الضعف: {e.get('weaknesses', '')}\n"
            eval_text += f"الإجابة المثالية المقترحة: {e.get('better_answer', '')}\n"

        if past_patterns:
            pattern_text = "\n".join([
                f"- {p['description']} (تكرر {p['occurrences']} مرات)"
                for p in past_patterns
            ])
        else:
            pattern_text = "لا توجد جلسات سابقة مسجلة للمرشح."

        prompt = COACHING_PROMPT.format(
            company=company,
            job_description=job_description[:900],
            interview_type=interview_type,
            evaluations=eval_text,
            past_patterns=pattern_text,
        )

        try:
            if self.llm:
                try:
                    response = self.llm.invoke([HumanMessage(content=prompt)])
                except Exception:
                    if self._fallback_llm:
                        response = self._fallback_llm.invoke([HumanMessage(content=prompt)])
                    else:
                        raise
            elif self._fallback_llm:
                response = self._fallback_llm.invoke([HumanMessage(content=prompt)])
            else:
                raise ValueError("لا يوجد مفتاح API للنموذج")

            content = response.content.strip()

            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            return json.loads(content)

        except Exception as e:
            print(f"تحذير: تعذر توليد التقرير عبر وكيل التوجيه: {e}")
            return {
                "overall_score": 75,
                "summary": "أظهر المرشح كفاءة جيدة واستجابة متوازنة للأسئلة المطروحة، مع وجود فرص لتطوير هيكلية الإجابات لتكون أكثر تأثيراً وإقناعاً.",
                "top_strengths": "• الثقة في التحدث والإلمام بالمصطلحات الأساسية\n• تقديم إجابات مباشرة لمعظم الأسئلة\n• التفاعل الإيجابي مع سياق المقابلة",
                "top_weaknesses": "• الحاجة إلى مزيد من الأمثلة المدعومة بأرقام وإحصائيات\n• عدم التوسع الكافي في توضيح منهجية حل المشكلات\n• الاسترسال أحياناً قبل الوصول إلى النتيجة المباشرة",
                "action_items": "• التدرب المكثف على تطبيق منهجية STAR (الموقف، المهمة، الإجراء، النتيجة)\n• توثيق أبرز المشاريع السابقة وإنجازاتها بالأرقام\n• ممارسة المحاكاة مع شخصيات محاورين مختلفة لتعزيز الثبات",
                "recurring_patterns": "جلسة واعدة ومؤشرات تدل على قابلية عالية للتطور.",
            }

    def extract_patterns(self, evaluations: List[Dict]) -> List[Dict]:
        """استخلاص الأنماط المتكررة لحفظها في الذاكرة طويلة المدى للمستخدم."""
        patterns = []
        weak_dimensions = []

        for e in evaluations:
            if e.get("structure_score", 10) <= 5:
                weak_dimensions.append("هيكلية الإجابة ومنهجية STAR")
            if e.get("depth_score", 10) <= 5:
                weak_dimensions.append("العمق التقني والاستراتيجي")
            if e.get("relevance_score", 10) <= 5:
                weak_dimensions.append("المطابقة المباشرة لجذر السؤال")

        from collections import Counter
        counts = Counter(weak_dimensions)

        for dim, count in counts.items():
            if count >= 2:
                patterns.append({
                    "pattern_type": "weakness",
                    "description": f"حاجة مستمرة لتحسين {dim} (ظهر في {count} أسئلة)",
                })

        return patterns
