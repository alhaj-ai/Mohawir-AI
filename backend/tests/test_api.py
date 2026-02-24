from fastapi.testclient import TestClient

from app.main import app
from agents.orchestrator import HAS_LANGGRAPH

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Mohawir AI" in data["system"]


def test_check_keys_endpoint():
    response = client.get("/api/check-keys")
    assert response.status_code == 200
    data = response.json()
    assert "sqlite_active" in data


def test_evaluate_step_endpoint():
    response = client.post(
        "/api/interview/evaluate-step",
        json={
            "session_id": "session_saudi_backend_01",
            "question_id": "q3_redis_cache_invalidation",
            "candidate_answer": "استخدمنا استراتيجية Cache-Aside مع تحديد TTL قصير و Redlock مما خفض استهلاك CPU بنسبة 60%.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["star_score"] >= 9.0
    assert "star_breakdown" in data
    assert "next_adaptive_question" in data


def test_langgraph_orchestrator_wired():
    assert isinstance(HAS_LANGGRAPH, bool)
