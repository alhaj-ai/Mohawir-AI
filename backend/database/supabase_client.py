"""
منظومة مُحاوِر الذكية (Mohawir AI)
Hybrid Database Engine — يدعم الاتصال السحابي بـ Supabase أو التخزين المحلي التلقائي عبر SQLite
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()


class Database:
    """محرك قواعد بيانات هجين متقدم يدعم كلاً من Supabase و SQLite المحلي."""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.is_supabase = False
        self.client = None

        if self.url and self.key:
            try:
                from supabase import create_client
                self.client = create_client(self.url, self.key)
                self.is_supabase = True
                print("Connected successfully to Supabase PostgreSQL.")
            except Exception as e:
                print(f"Warning: Could not connect to Supabase ({e}). Falling back to local SQLite.")
                self._init_sqlite()
        else:
            print("Notice: No SUPABASE_URL found in environment. Initializing local SQLite database.")
            self._init_sqlite()

    def _init_sqlite(self):
        """تهيئة قاعدة بيانات SQLite محلية مدمجة وإنشاء الجداول اللازمة."""
        self.is_supabase = False
        db_dir = os.path.join(os.path.dirname(__file__), "..", "data")
        os.makedirs(db_dir, exist_ok=True)
        self.sqlite_path = os.path.join(db_dir, "mohawir.db")

        with sqlite3.connect(self.sqlite_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS interview_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT DEFAULT 'anonymous',
                company TEXT NOT NULL,
                job_description TEXT NOT NULL,
                resume TEXT NOT NULL,
                interview_type TEXT NOT NULL,
                persona TEXT NOT NULL,
                status TEXT DEFAULT 'in_progress',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS interview_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                question_number INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS answer_evaluations (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                relevance_score INTEGER,
                structure_score INTEGER,
                depth_score INTEGER,
                overall_score INTEGER,
                strengths TEXT,
                weaknesses TEXT,
                better_answer TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS coaching_reports (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL UNIQUE,
                overall_score INTEGER,
                summary TEXT,
                top_strengths TEXT,
                top_weaknesses TEXT,
                action_items TEXT,
                recurring_patterns TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS session_metrics (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL UNIQUE,
                avg_confidence INTEGER,
                avg_eye_contact INTEGER,
                avg_stress INTEGER,
                dominant_emotion TEXT,
                total_filler_words INTEGER,
                filler_word_breakdown TEXT,
                avg_volume INTEGER,
                speaking_time_seconds INTEGER,
                silent_time_seconds INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_memory (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                pattern_type TEXT NOT NULL,
                description TEXT NOT NULL,
                occurrences INTEGER DEFAULT 1,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            conn.commit()

    # ==================== SESSIONS ====================

    def create_session(self, setup_data: Dict[str, Any]) -> str:
        """إنشاء جلسة مقابلة جديدة وإرجاع المعرف الفريد لها."""
        session_id = str(uuid.uuid4())
        user_id = setup_data.get("user_id", "anonymous")

        if self.is_supabase:
            result = (
                self.client.table("interview_sessions")
                .insert({
                    "id": session_id,
                    "user_id": user_id,
                    "company": setup_data["company"],
                    "job_description": setup_data["job_description"],
                    "resume": setup_data["resume"],
                    "interview_type": setup_data["interview_type"],
                    "persona": setup_data["persona"],
                })
                .execute()
            )
            return result.data[0]["id"]
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO interview_sessions (id, user_id, company, job_description, resume, interview_type, persona)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    session_id,
                    user_id,
                    setup_data["company"],
                    setup_data["job_description"],
                    setup_data["resume"],
                    setup_data["interview_type"],
                    setup_data["persona"],
                ))
                conn.commit()
            return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """استرجاع بيانات الجلسة بواسطة المعرف."""
        if self.is_supabase:
            result = (
                self.client.table("interview_sessions")
                .select("*")
                .eq("id", session_id)
                .execute()
            )
            return result.data[0] if result.data else None
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM interview_sessions WHERE id = ?", (session_id,))
                row = cursor.fetchone()
                return dict(row) if row else None

    def complete_session(self, session_id: str):
        """تحديث حالة الجلسة إلى مكتملة."""
        if self.is_supabase:
            self.client.table("interview_sessions").update({
                "status": "completed",
                "completed_at": "now()",
            }).eq("id", session_id).execute()
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE interview_sessions SET status = 'completed', completed_at = ? WHERE id = ?",
                    (datetime.utcnow().isoformat(), session_id)
                )
                conn.commit()

    # ==================== MESSAGES ====================

    def add_message(self, session_id: str, role: str, content: str, question_number: Optional[int] = None):
        """حفظ رسالة في سجل المحادثة."""
        msg_id = str(uuid.uuid4())
        if self.is_supabase:
            self.client.table("interview_messages").insert({
                "id": msg_id,
                "session_id": session_id,
                "role": role,
                "content": content,
                "question_number": question_number,
            }).execute()
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO interview_messages (id, session_id, role, content, question_number)
                VALUES (?, ?, ?, ?, ?)
                """, (msg_id, session_id, role, content, question_number))
                conn.commit()

    def get_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """استرجاع جميع رسائل الجلسة بالترتيب الزمني."""
        if self.is_supabase:
            result = (
                self.client.table("interview_messages")
                .select("*")
                .eq("session_id", session_id)
                .order("created_at")
                .execute()
            )
            return result.data
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM interview_messages WHERE session_id = ? ORDER BY created_at ASC",
                    (session_id,)
                )
                return [dict(r) for r in cursor.fetchall()]

    # ==================== EVALUATIONS ====================

    def save_evaluation(self, session_id: str, evaluation: Dict[str, Any]):
        """حفظ تقييم وكيل التقييم لإجابة معينة."""
        eval_id = str(uuid.uuid4())
        if self.is_supabase:
            self.client.table("answer_evaluations").insert({
                "id": eval_id,
                "session_id": session_id,
                **evaluation,
            }).execute()
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO answer_evaluations (
                    id, session_id, question, answer, relevance_score, structure_score, depth_score, overall_score, strengths, weaknesses, better_answer
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    eval_id,
                    session_id,
                    evaluation.get("question", ""),
                    evaluation.get("answer", ""),
                    evaluation.get("relevance_score", 5),
                    evaluation.get("structure_score", 5),
                    evaluation.get("depth_score", 5),
                    evaluation.get("overall_score", 5),
                    evaluation.get("strengths", ""),
                    evaluation.get("weaknesses", ""),
                    evaluation.get("better_answer", "")
                ))
                conn.commit()

    def get_evaluations(self, session_id: str) -> List[Dict[str, Any]]:
        """استرجاع تقييمات إجابات الجلسة."""
        if self.is_supabase:
            result = (
                self.client.table("answer_evaluations")
                .select("*")
                .eq("session_id", session_id)
                .order("created_at")
                .execute()
            )
            return result.data
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM answer_evaluations WHERE session_id = ? ORDER BY created_at ASC",
                    (session_id,)
                )
                return [dict(r) for r in cursor.fetchall()]

    # ==================== REPORTS ====================

    def save_report(self, session_id: str, report: Dict[str, Any]):
        """حفظ التقرير الاستشاري النهائي للمقابلة."""
        report_id = str(uuid.uuid4())
        if self.is_supabase:
            self.client.table("coaching_reports").insert({
                "id": report_id,
                "session_id": session_id,
                **report,
            }).execute()
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT OR REPLACE INTO coaching_reports (
                    id, session_id, overall_score, summary, top_strengths, top_weaknesses, action_items, recurring_patterns
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    report_id,
                    session_id,
                    report.get("overall_score", 0),
                    report.get("summary", ""),
                    report.get("top_strengths", ""),
                    report.get("top_weaknesses", ""),
                    report.get("action_items", ""),
                    report.get("recurring_patterns", "")
                ))
                conn.commit()

    def get_report(self, session_id: str) -> Optional[Dict[str, Any]]:
        """استرجاع التقرير النهائي للجلسة."""
        if self.is_supabase:
            result = (
                self.client.table("coaching_reports")
                .select("*")
                .eq("session_id", session_id)
                .execute()
            )
            return result.data[0] if result.data else None
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM coaching_reports WHERE session_id = ?", (session_id,))
                row = cursor.fetchone()
                return dict(row) if row else None

    # ==================== SESSION METRICS ====================

    def save_metrics(self, session_id: str, metrics: Dict[str, Any]):
        """حفظ القياسات الحيوية والصوتية لجلسة المقابلة."""
        metric_id = str(uuid.uuid4())
        breakdown = metrics.get("filler_word_breakdown", {})
        breakdown_str = json.dumps(breakdown) if isinstance(breakdown, dict) else str(breakdown)

        if self.is_supabase:
            existing = (
                self.client.table("session_metrics")
                .select("id")
                .eq("session_id", session_id)
                .execute()
            )
            if existing.data:
                self.client.table("session_metrics").update(metrics).eq("session_id", session_id).execute()
            else:
                self.client.table("session_metrics").insert({
                    "id": metric_id,
                    "session_id": session_id,
                    **metrics,
                }).execute()
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT OR REPLACE INTO session_metrics (
                    id, session_id, avg_confidence, avg_eye_contact, avg_stress, dominant_emotion,
                    total_filler_words, filler_word_breakdown, avg_volume, speaking_time_seconds, silent_time_seconds
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    metric_id,
                    session_id,
                    metrics.get("avg_confidence", 0),
                    metrics.get("avg_eye_contact", 0),
                    metrics.get("avg_stress", 0),
                    metrics.get("dominant_emotion", "neutral"),
                    metrics.get("total_filler_words", 0),
                    breakdown_str,
                    metrics.get("avg_volume", 0),
                    metrics.get("speaking_time_seconds", 0),
                    metrics.get("silent_time_seconds", 0),
                ))
                conn.commit()

    def get_metrics(self, session_id: str) -> Optional[Dict[str, Any]]:
        """استرجاع القياسات الحيوية والصوتية للجلسة."""
        if self.is_supabase:
            result = (
                self.client.table("session_metrics")
                .select("*")
                .eq("session_id", session_id)
                .execute()
            )
            return result.data[0] if result.data else None
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM session_metrics WHERE session_id = ?", (session_id,))
                row = cursor.fetchone()
                if not row:
                    return None
                data = dict(row)
                if isinstance(data.get("filler_word_breakdown"), str):
                    try:
                        data["filler_word_breakdown"] = json.loads(data["filler_word_breakdown"])
                    except Exception:
                        data["filler_word_breakdown"] = {}
                return data

    # ==================== USER MEMORY ====================

    def add_pattern(self, user_id: str, pattern_type: str, description: str):
        """تتبع الأنماط المتكررة للمرشح في المقابلات."""
        pattern_id = str(uuid.uuid4())
        if self.is_supabase:
            existing = (
                self.client.table("user_memory")
                .select("*")
                .eq("user_id", user_id)
                .eq("pattern_type", pattern_type)
                .eq("description", description)
                .execute()
            )
            if existing.data:
                row = existing.data[0]
                self.client.table("user_memory").update({
                    "occurrences": row["occurrences"] + 1,
                    "last_seen": "now()",
                }).eq("id", row["id"]).execute()
            else:
                self.client.table("user_memory").insert({
                    "id": pattern_id,
                    "user_id": user_id,
                    "pattern_type": pattern_type,
                    "description": description,
                }).execute()
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM user_memory WHERE user_id = ? AND pattern_type = ? AND description = ?",
                    (user_id, pattern_type, description)
                )
                row = cursor.fetchone()
                if row:
                    cursor.execute(
                        "UPDATE user_memory SET occurrences = occurrences + 1, last_seen = ? WHERE id = ?",
                        (datetime.utcnow().isoformat(), row["id"])
                    )
                else:
                    cursor.execute("""
                    INSERT INTO user_memory (id, user_id, pattern_type, description, occurrences)
                    VALUES (?, ?, ?, ?, 1)
                    """, (pattern_id, user_id, pattern_type, description))
                conn.commit()

    def get_user_patterns(self, user_id: str) -> List[Dict[str, Any]]:
        """استرجاع الأنماط السابقة للمستخدم مرتبة حسب التكرار."""
        if self.is_supabase:
            result = (
                self.client.table("user_memory")
                .select("*")
                .eq("user_id", user_id)
                .order("occurrences", desc=True)
                .limit(10)
                .execute()
            )
            return result.data
        else:
            with sqlite3.connect(self.sqlite_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM user_memory WHERE user_id = ? ORDER BY occurrences DESC LIMIT 10",
                    (user_id,)
                )
                return [dict(r) for r in cursor.fetchall()]


# كائن قاعدة البيانات الموحد (Singleton)
db = Database()
