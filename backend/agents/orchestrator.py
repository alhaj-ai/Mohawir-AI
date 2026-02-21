"""
Multi-Agent Orchestrator (LangGraph StateGraph + Concurrent Execution).
Runs Evaluator and Interviewer IN PARALLEL for faster response times,
and coordinates turn transitions through a compiled LangGraph StateGraph.
"""

from typing import TypedDict, List, Dict, Optional, Any
from concurrent.futures import ThreadPoolExecutor

from agents.interviewer import InterviewerAgent
from agents.evaluator import EvaluatorAgent
from agents.coach import CoachAgent

try:
    from langgraph.graph import StateGraph, END
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False


class InterviewState(TypedDict):
    session_id: str
    setup: Dict
    last_question: str
    last_answer: str
    evaluations: List[Dict]
    next_message: str
    is_complete: bool
    final_report: Optional[Dict]
    _evaluator_future: Optional[Any]


class InterviewOrchestrator:
    """
    Coordinates Interviewer, Evaluator, and Coach agents using LangGraph StateGraph
    with concurrent background evaluation on non-final turns.
    """

    def __init__(self, interviewer: InterviewerAgent):
        self.interviewer = interviewer
        self.evaluator = EvaluatorAgent()
        self.coach = CoachAgent()
        self.evaluations: List[Dict] = []
        self.executor = ThreadPoolExecutor(max_workers=3)
        self.graph = self._build_graph() if HAS_LANGGRAPH else None

    def _dispatch_agents_node(self, state: InterviewState) -> InterviewState:
        setup = state["setup"]
        evaluator_future = self.executor.submit(
            self.evaluator.evaluate,
            question=state["last_question"],
            answer=state["last_answer"],
            company=setup["company"],
            job_description=setup["job_description"],
            interview_type=setup["interview_type"],
        )
        interviewer_future = self.executor.submit(
            self.interviewer.respond_to_answer,
            state["last_answer"],
        )
        next_message, is_complete = interviewer_future.result()
        return {
            **state,
            "next_message": next_message,
            "is_complete": is_complete,
            "_evaluator_future": evaluator_future,
        }

    def _finalize_coach_node(self, state: InterviewState) -> InterviewState:
        evaluator_future = state.get("_evaluator_future")
        if evaluator_future is not None:
            new_evaluation = evaluator_future.result()
            self.evaluations.append(new_evaluation)
        setup = state["setup"]
        final_report = self.coach.generate_report(
            company=setup["company"],
            job_description=setup["job_description"],
            interview_type=setup["interview_type"],
            evaluations=self.evaluations,
            past_patterns=[],
        )
        return {
            **state,
            "evaluations": list(self.evaluations),
            "final_report": final_report,
            "_evaluator_future": None,
        }

    def _build_graph(self):
        workflow = StateGraph(InterviewState)
        workflow.add_node("dispatch_agents", self._dispatch_agents_node)
        workflow.add_node("finalize_coach", self._finalize_coach_node)
        workflow.set_entry_point("dispatch_agents")
        workflow.add_conditional_edges(
            "dispatch_agents",
            lambda s: "finalize_coach" if s.get("is_complete") else "end",
            {"finalize_coach": "finalize_coach", "end": END},
        )
        workflow.add_edge("finalize_coach", END)
        return workflow.compile()

    def run_turn(
        self,
        session_id: str,
        setup: Dict,
        last_question: str,
        last_answer: str,
    ) -> InterviewState:
        initial_state: InterviewState = {
            "session_id": session_id,
            "setup": setup,
            "last_question": last_question,
            "last_answer": last_answer,
            "evaluations": list(self.evaluations),
            "next_message": "",
            "is_complete": False,
            "final_report": None,
            "_evaluator_future": None,
        }
        if self.graph is not None:
            return self.graph.invoke(initial_state)
        dispatched = self._dispatch_agents_node(initial_state)
        if dispatched["is_complete"]:
            return self._finalize_coach_node(dispatched)
        return dispatched
