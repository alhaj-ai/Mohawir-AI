"""
منظومة مُحاوِر الذكية (Mohawir AI)
وكيل إدارة المقابلة الذكي (Interviewer Agent)
يقود جلسة المقابلة التفاعلية باللغة العربية الفصحى الراقية، مستخدماً نماذج Llama 3.3 70B و Gemini 2.5 Flash
مع محرك محاكاة عربي ذكي مدمج يعمل تلقائياً عند غياب مفاتيح السحابة
"""

import os
from typing import List
from dotenv import load_dotenv

try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from models.schemas import (
    InterviewSetup,
    InterviewType,
    InterviewerPersona,
    Message,
)

load_dotenv()


# ============================================================
# موجهات شخصيات المحاور الذكي (Interviewer Personas)
# ============================================================

PERSONA_INSTRUCTIONS = {
    InterviewerPersona.FRIENDLY: """
أنت محاور دافئ، إيجابي، وداعم للمرشح. تهدف إلى إزالة التوتر ومساعدته على تقديم أفضل ما لديه.
تثني بلباقة واقتضاب على النقاط الجيدة في إجابته قبل الانتقال للسؤال التالي. أسلوبك مشجع ومهني.
""",
    InterviewerPersona.NEUTRAL: """
أنت محاور مهني، موضوعي، ومتزن للغاية. لا تفرط في المدح ولا في النقد.
تطرح الأسئلة بوضوح ودقة وإيجاز، وتركز على استخلاص الحقائق والأدلة الملموسة.
""",
    InterviewerPersona.ADVERSARIAL: """
أنت محاور صارم، متطلب، وتختبر المرشح تحت الضغط والتدقيق العالي (Stress Interview).
لا تقبل بالإجابات العامة أو الإنشائية، وتطالب فوراً بأمثلة رقمية وأدلة دقيقة.
تتساءل عن أسباب اتخاذ قراراته وتطرح أسئلة استدراكية غير متوقعة لاختبار ثباته وخبرته الحقيقية مع الحفاظ على اللباقة والاحتراف.
""",
}


# ============================================================
# موجهات أنماط المقابلات التخصصية (Interview Types)
# ============================================================

INTERVIEW_TYPE_INSTRUCTIONS = {
    InterviewType.SCREENING: """
هذه مقابلة فرز أولي واستكشاف عام (Screening Interview).
ركز على:
- التعرف الموجز على خلفية المرشح الأكاديمية والمهنية.
- سبب اهتمامه بهذه الشركة تحديداً وبهذا الدور الوظيفي.
- مدى التطابق الأساسي بين خبراته ومتطلبات الوظيفة المعلنة.
- تطلعاته العامة ومدى جاهزيته.
اطرح 5 أسئلة مباشرة ومتدرجة.
""",
    InterviewType.BEHAVIORAL: """
هذه مقابلة سلوكية احترافية تعتمد منهجية STAR (الموقف، المهمة، الإجراء، النتيجة).
ركز على:
- مواقف عملية حقيقية من مسيرة المرشح تبرهن على المهارات المطلوبة في الوصف الوظيفي.
- كيفية تعامله مع التحديات، النزاعات بين الزملاء، الفشل، والنجاحات البارزة.
- التفتيش الدقيق عن الإجراء الشخصي الذي قام به (Action) والنتيجة القابلة للقياس (Result).
اطرح 5 أسئلة سلوكية استقصائية تغطي جدارات مختلفة.
""",
    InterviewType.TECHNICAL_CODING: """
هذه مقابلة تقنية وبرمجية متخصصة.
ركز على:
- الخوارزميات وبنى البيانات (Data Structures & Algorithms) ذات الصلة بالدور الوظيفي.
- أسلوب التفكير المنطقي والهندسي وحل المشكلات التراكمية (Problem Solving).
- التعقيد الزمني والمكاني (Big-O Complexity) والمفاضلة بين الحلول.
اطرح 3 إلى 5 أسئلة تقنية متعمقة، واطلب من المرشح شرح منطقه الهندسي خطوة بخطوة.
""",
    InterviewType.SYSTEM_DESIGN: """
هذه مقابلة تصميم نظم ومعمارية برمجية سحابية (System Design).
ركز على:
- تصميم أنظمة موزعة عالية التوفر وقابلة للتوسع الهائل (High Scalability & Availability).
- المقايضات الهندسية (Trade-offs): الاتساق مقابل التوافر (CAP)، قواعد البيانات العلائقية مقابل غير العلائقية، الكاشينج، والموازنة.
- التعامل مع عنق الزجاجة (Bottlenecks)، زمن الاستجابة، والتكلفة التشغيلية.
اطرح أسئلة معمارية واقعية وناقش خيارات التصميم.
""",
    InterviewType.HR: """
هذه مقابلة الموارد البشرية والملاءمة الثقافية (HR & Culture Fit).
ركز على:
- الطموحات المهنية والمسار الوظيفي المستقبلي.
- أسلوب العمل، القيادة، والانسجام مع روح الفريق وثقافة المنشأة.
- القيم الشخصية، إدارة ضغوط العمل، وأسباب التفكير في التغيير.
اطرح 5 أسئلة إنسانية ومهنية متعمقة.
""",
}


# ============================================================
# صنف وكيل المقابلة (Interviewer Agent Class)
# ============================================================

class InterviewerAgent:
    """
    وكيل المقابلة الذكي في منظومة مُحاوِر.
    يدير سياق الحوار باللغة العربية ويطرح الأسئلة بذكاء بناءً على السيرة الذاتية والوصف الوظيفي.
    """

    TOTAL_QUESTIONS = 5

    def __init__(self, setup: InterviewSetup):
        self.setup = setup
        self.history: List[Message] = []
        self.question_count = 0

        groq_key = os.getenv("GROQ_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")

        # مسرع Groq LPU كنموذج رئيسي للسرعة الفائقة (Llama 3.3 70B)
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.6,
            groq_api_key=groq_key,
            max_tokens=300,
        ) if (groq_key and ChatGroq) else None

        # نموذج Gemini 2.5 Flash / 2.0 كبديل ذكي وسريع
        self._fallback_llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.6,
            google_api_key=gemini_key,
            max_output_tokens=300,
        ) if (gemini_key and ChatGoogleGenerativeAI) else None

    def _generate_fallback_response(self, is_opening: bool = False, is_closing: bool = False) -> str:
        """محرك محاكاة عربي ذكي متقدم يولد الأسئلة الواقعية عند عدم توفر مفاتيح السحابة."""
        company = self.setup.company or "المنشأة"
        itype = self.setup.interview_type
        persona = self.setup.persona

        if is_opening:
            if persona == InterviewerPersona.FRIENDLY:
                return f"أهلاً وسهلاً بك في {company}! سعداء جداً بوجودك معنا اليوم لإجراء هذه المقابلة. نبدأ بسؤال استهلالي خفيف: حدثنا بإيجاز عن نفسك وخلفيتك المهنية، وما الذي جذبك للتقديم على هذه الفرصة معنا تحديداً؟"
            elif persona == InterviewerPersona.ADVERSARIAL:
                return f"مرحباً بك في {company}. سنخوض اليوم في تفاصيل خبراتك بدقة وصرامة. للبدء: ما القيمة الاستثنائية الحقيقية التي ستضيفها لمنشأتنا والتي تميزك عن باقي المرشحين؟"
            else:
                return f"مرحباً بك في {company}. يسعدنا إجراء هذه المقابلة معك اليوم. للبدء: تفضل بتقديم نبذة موجزة عن خلفيتك المهنية وأبرز المحطات التي قادتك للاهتمام بهذا الدور الوظيفي."

        if is_closing:
            return f"شكراً جزيلاً لك على مشاركتك القيمة وإجاباتك الصريحة اليوم مع فريق {company}. تم تسجيل كافة إجاباتك ومؤشرات أدائك بنجاح، وتقرير التقييم والتوجيه التنفيذي جاهز للاطلاع فوراً. نتمنى لك دوام التوفيق والنجاح!"

        q_idx = self.question_count
        if itype == InterviewType.TECHNICAL_CODING:
            pool = [
                f"جميل. بالانتقال للجانب التقني: صف لي مشروعاً برمجياً معقداً قمت بتطويره مؤخراً، وما كانت أبرز التحديات الخوارزمية أو الهندسية التي واجهتك؟",
                f"ممتاز. عند التعامل مع تدفقات بيانات ضخمة أو زمن استجابة حرج، كيف تفاضل بين الحلول الخوارزمية وتتعامل مع التعقيد الزمني والمكاني (Big-O Complexity)؟",
                f"رائع. لو اكتشفت مشكلة في الأداء (Bottleneck) في بيئة الإنتاج الحية، ما هي خطواتك المنهجية لتتبع السبب الجذري وحله بأمان؟",
                f"أحسنت. كيف تضمن موثوقية الأكواد البرمجية وجودتها من خلال الاختبارات المؤتمتة (Unit & Integration Tests) ومراجعة الكود؟",
            ]
        elif itype == InterviewType.SYSTEM_DESIGN:
            pool = [
                f"أشكرك. لننتقل إلى المعمارية السحابية: كيف تصمم نظاماً موزعاً عالي التوفر (High Availability) وقابلاً للتوسع الهائل لخدمة ملايين المستخدمين في {company}؟",
                f"نقطة هامة. في حال واجهت معضلة اتساق البيانات مقابل التوافر (CAP Theorem)، كيف تختار قاعدة البيانات المناسبة للمشروع؟",
                f"جميل. ما استراتيجيتك لتطبيق التخزين المؤقت (Caching) وموازنة الأحمال (Load Balancing) للحد من استهلاك الموارد وخفض زمن الاستجابة؟",
                f"ممتاز. كيف تراقب أداء الخدمات المصغرة (Microservices Observability) وتتعامل مع فشل أحد المكونات الحيوية في النظام؟",
            ]
        elif itype == InterviewType.HR:
            pool = [
                f"شكراً لتوضيحك. حدثنا عن بيئة العمل التي تتيح لك تقديم أفضل إنتاجية، وكيف تتعامل مع تغير الأولويات والضغط المتزايد؟",
                f"رائع. ما هي تطلعاتك المهنية للسنوات الثلاث القادمة، وكيف ترى انسجام هذه التطلعات مع رؤية وثقافة {company}؟",
                f"نقطة جيدة. صف لي موقفاً شعرت فيه بعدم التوافق مع أحد أعضاء الفريق أو مديرك، وكيف أدرت هذا الحوار بمهنية؟",
                f"ممتاز. ما هي الدوافع الحقيقية وراء رغبتك في الانتقال الوظيفي في هذه المرحلة من مسيرتك المهنية؟",
            ]
        else:
            pool = [
                f"شكراً لإجابتك. بتطبيق منهجية STAR: صف لي موقفاً صعباً واجهته في عملك السابق، ما كانت المهمة المحددة لك، وما الإجراء الفعلي الذي اتخذته؟",
                f"عظيم. ما كانت النتيجة القابلة للقياس لذلك الإجراء، وما الأثر الذي تركه ذلك على فريق العمل أو المنشأة؟",
                f"ممتاز. حدثنا عن موقف ارتكبت فيه خطأ تقنياً أو إدارياً في أحد المشاريع، كيف تصرفت حيال ذلك وماذا تعلمت من تلك التجربة؟",
                f"رائع جداً. كيف تقيس نجاحك الشخصي في أي مبادرة جديدة تقودها، وما أبرز المهارات التي تحرص على تطويرها باستمرار؟",
            ]

        idx = max(0, min(q_idx - 1, len(pool) - 1))
        return pool[idx]

    def _invoke(self, messages):
        """تنفيذ استدعاء النموذج اللغوي مع التبديل التلقائي."""
        if self.llm:
            try:
                return self.llm.invoke(messages)
            except Exception as e:
                err = str(e).lower()
                print(f"تحويل إلى Gemini بسبب: {err}")
                if self._fallback_llm:
                    return self._fallback_llm.invoke(messages)
                raise
        elif self._fallback_llm:
            return self._fallback_llm.invoke(messages)
        else:
            raise ValueError("لم يتم توفير مفاتيح السحابة")

    def _build_system_prompt(self) -> str:
        """بناء الموجه التوجيهي الشامل باللغة العربية."""
        persona = PERSONA_INSTRUCTIONS.get(self.setup.persona, PERSONA_INSTRUCTIONS[InterviewerPersona.NEUTRAL])
        interview_style = INTERVIEW_TYPE_INSTRUCTIONS.get(self.setup.interview_type, INTERVIEW_TYPE_INSTRUCTIONS[InterviewType.BEHAVIORAL])

        jd = self.setup.job_description[:1400]
        resume = self.setup.resume[:1400]

        return f"""أنت مقيّم ومحاور وظيفي متمرس وخبير مقابلات في منشأة: {self.setup.company}.
لغتك الأساسية هي اللغة العربية الفصحى المهنية الراقية والواضحة، مع إمكانية استخدام المصطلحات التقنية العالمية بالإنجليزية أو معربة بطريقة طبيعية.

شخصيتك وأسلوبك في الحوار:
{persona}

نوع المقابلة وأهدافها:
{interview_style}

الوصف الوظيفي (Job Description):
{jd}

السيرة الذاتية للمرشح (Candidate Resume):
{resume}

قواعد وإرشادات صارمة يجب الالتزام بها:
1. اطرح سؤالاً واحداً فقط في كل دور. يُمنع منعاً باتاً دمج عدة أسئلة في فقرة واحدة.
2. اجعل حديثك موجزاً ومركزاً (جملة أو جملتان كتمهيد ثم السؤال مباشرة).
3. اربط أسئلتك بخبرات المرشح الحقيقية المذكورة في سيرته الذاتية وبمتطلبات الوصف الوظيفي.
4. لا تقدم أي تقييم أو نقد أو إفصاح عن نتيجة الإجابة أثناء المقابلة — التقييم مخصص للتقرير النهائي فقط.
5. بعد إتمام {self.TOTAL_QUESTIONS} أسئلة، اختم المقابلة بعبارة شكر مهنية واذكر أن التقرير التوجيهي سيصدر فوراً.
6. تقمص شخصية المحاور البشري تماماً ولا تخرج عن السياق، ولا تذكر أبداً أنك نموذج ذكاء اصطناعي.
"""

    def _format_history_for_llm(self):
        """تحويل سجل المحادثة إلى رسائل متوافقة مع LangChain."""
        messages = [SystemMessage(content=self._build_system_prompt())]

        for msg in self.history:
            if msg.role == "interviewer":
                messages.append(AIMessage(content=msg.content))
            else:
                messages.append(HumanMessage(content=msg.content))

        return messages

    def start_interview(self) -> str:
        """بدء المقابلة بالترحيب وطرح السؤال الأول."""
        try:
            kickoff_prompt = HumanMessage(
                content=(
                    "ابدأ المقابلة الآن باللغة العربية. رحب بالمرشح بجملة ترحيبية واحدة دافئة ومهنية واذكر اسم المنشأة، ثم اطرح سؤالك الاستهلالي الأول."
                )
            )
            messages = self._format_history_for_llm() + [kickoff_prompt]
            response = self._invoke(messages)
            opening = response.content.strip()
        except Exception:
            opening = self._generate_fallback_response(is_opening=True)

        self.history.append(Message(role="interviewer", content=opening))
        self.question_count = 1

        return opening

    def respond_to_answer(self, candidate_answer: str) -> tuple[str, bool]:
        """
        استلام إجابة المرشح وتوليد السؤال التالي أو إنهاء المقابلة.
        المخرجات: (رسالة_المحاور, هل_اكتملت_المقابلة)
        """
        self.history.append(Message(role="candidate", content=candidate_answer))

        if self.question_count >= self.TOTAL_QUESTIONS:
            try:
                closing_prompt = HumanMessage(
                    content=(
                        "انتهت المقابلة الرسمية. اشكر المرشح بلباقة واختم الجلسة بإيجاز (جملتان أو ثلاث كحد أقصى). "
                        "أخبره بأن مراجعة إجاباته جارية وسيصدر تقرير التقييم التوجيهي فوراً. لا تطرح أي أسئلة أخرى."
                    )
                )
                messages = self._format_history_for_llm() + [closing_prompt]
                response = self._invoke(messages)
                closing = response.content.strip()
            except Exception:
                closing = self._generate_fallback_response(is_closing=True)

            self.history.append(Message(role="interviewer", content=closing))
            return closing, True

        try:
            next_q_prompt = HumanMessage(
                content=(
                    "علق على إجابة المرشح السابقة بجملة واحدة قصيرة جداً (أو انتقل مباشرة إذا كانت الشخصية ضاغطة)، "
                    "ثم اطرح سؤالك التالي متعمقاً في مدى ملاءمته لهذا الدور الوظيفي."
                )
            )
            messages = self._format_history_for_llm() + [next_q_prompt]
            response = self._invoke(messages)
            next_message = response.content.strip()
        except Exception:
            next_message = self._generate_fallback_response()

        self.history.append(Message(role="interviewer", content=next_message))
        self.question_count += 1

        return next_message, False
