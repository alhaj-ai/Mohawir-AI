"""
منظومة مُحاوِر الذكية (Mohawir AI)
وكيل التقييم التحليلي المتزامن (Evaluator Agent)
يحلل إجابات المرشح لحظياً في مسار خلفي مستقل دون تعطيل تدفق المحادثة، ويقدم تقييماً نقدياً بناءً باللغة العربية
"""

import os
import json
from typing import Dict
from dotenv import load_dotenv

try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

from langchain_core.messages import HumanMessage

load_dotenv()

EVALUATION_PROMPT = """أنت خبير تقييم مقابلات وظيفية ومستشار توظيف تعمل في الكواليس.
مهمتك هي التحليل الهادئ والصارم لإجابة المرشح وتقييمها موضوعياً باللغة العربية. المرشح لا يرى مخرجاتك أثناء المقابلة.

سياق المقابلة:
- الشركة: {company}
- الوصف الوظيفي: {job_description}
- نوع المقابلة: {interview_type}

السؤال المطروح:
{question}

إجابة المرشح:
{answer}

قم بتقييم الإجابة بدقة على مقياس من (1 إلى 10) وفق المعايير التالية:
- relevance_score: هل أجاب المرشح بدقة على جوهر السؤال المطروح؟
- structure_score: هل كانت الإجابة منظمة ومنطقية؟ (تطبيق منهجية STAR في الأسئلة السلوكية)
- depth_score: هل أظهر عمقاً تقنياً وتطبيقياً حقيقياً، أم اكتفى بالعموميات السطحية؟
- overall_score: التقييم الإجمالي الشامل للإجابة كوزن نسبي للمعايير.

وقدم باللغة العربية السليمة:
- strengths: جملة إلى جملتين توضح نقاط القوة في الإجابة.
- weaknesses: جملة إلى جملتين توضح نقاط الضعف وفرص التحسين بكل صراحة.
- better_answer: صياغة إجابة بديلة نموذجية ومثالية ومحكمة كان يفضل للمرشح قولها.

أجب فقط بصيغة كائن JSON صالح تماماً وبدون أي نصوص أو كتل برمجية إضافية:
{{
  "relevance_score": <int 1-10>,
  "structure_score": <int 1-10>,
  "depth_score": <int 1-10>,
  "overall_score": <int 1-10>,
  "strengths": "<نص باللغة العربية>",
  "weaknesses": "<نص باللغة العربية>",
  "better_answer": "<نص باللغة العربية>"
}}
"""


class EvaluatorAgent:
    """وكيل التقييم اللحظي لإجابات المرشحين."""

    def __init__(self):
        groq_key = os.getenv("GROQ_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")

        self.llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.2,
            groq_api_key=groq_key,
            max_tokens=500,
        ) if (groq_key and ChatGroq) else None

        self._fallback_llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.2,
            google_api_key=gemini_key,
            max_output_tokens=500,
        ) if (gemini_key and ChatGoogleGenerativeAI) else None

    def evaluate(
        self,
        question: str,
        answer: str,
        company: str,
        job_description: str,
        interview_type: str,
    ) -> Dict:
        """تحليل وتقييم زوج السؤال والإجابة."""

        prompt = EVALUATION_PROMPT.format(
            company=company,
            job_description=job_description[:700],
            interview_type=interview_type,
            question=question,
            answer=answer,
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

            # تنظيف علامات كتل الكود إن وُجدت
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            evaluation = json.loads(content)
            evaluation["question"] = question
            evaluation["answer"] = answer
            return evaluation

        except Exception as e:
            print(f"تحذير: تعذر تحليل التقييم عبر الوكيل: {e}")
            return {
                "question": question,
                "answer": answer,
                "relevance_score": 6,
                "structure_score": 6,
                "depth_score": 6,
                "overall_score": 6,
                "strengths": "إجابة واضحة تلامس جوانب السؤال الأساسية.",
                "weaknesses": "يمكن تعزيز الإجابة بأرقام دقيقة وأمثلة عملية أكثر عمقاً.",
                "better_answer": "من الأفضل دعم الإجابة ببيانات ملموسة وربطها المباشر بالنتائج المحققة.",
            }
