"""Agent Triage definitions using LangGraph."""
from typing import TypedDict, Annotated, Sequence, Any, Optional
import operator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langgraph.graph import StateGraph, END
import logging

logger = logging.getLogger(__name__)

class TriageState(TypedDict):
    """The state of the triage agent."""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    finding: dict[str, Any]
    severity_assessment: Optional[str]
    action_plan: Optional[str]

class TriageResult(BaseModel):
    """Structured output from the triage node."""
    severity: str = Field(description="Assessed severity: Critical, High, Medium, Low")
    reasoning: str = Field(description="Reasoning for the severity assessment")
    recommended_actions: list[str] = Field(description="Step-by-step recommended actions")

# You should configure an LLM model, ideally injected from settings
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

def triage_finding(state: TriageState) -> dict:
    """Analyze the finding and determine severity and actions."""
    finding = state["finding"]
    messages = state["messages"]

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert security analyst. Analyze the following security finding. "
                   "Determine the severity and provide recommended actions. "
                   "Output pure JSON matching the schema."),
        ("human", "Finding Details:\n{finding}")
    ])

    chain = prompt | llm.with_structured_output(TriageResult)
    
    try:
        result: TriageResult = chain.invoke({"finding": str(finding)})
        return {
            "severity_assessment": result.severity,
            "action_plan": "\n".join(result.recommended_actions),
            "messages": [AIMessage(content=f"Severity: {result.severity}\nReasoning: {result.reasoning}")]
        }
    except Exception as e:
        logger.error(f"Error in triage_finding: {e}")
        return {
            "severity_assessment": "Unknown",
            "action_plan": "Automated triage failed.",
            "messages": [AIMessage(content=f"Auto-triage failed with error: {e}")]
        }

def should_escalate(state: TriageState) -> str:
    """Determine if finding should be escalated to a human."""
    severity = state.get("severity_assessment", "").lower()
    if severity in ["critical", "high"]:
        return "escalate"
    return "auto_remediate"

def escalate(state: TriageState) -> dict:
    """Format for human escalation."""
    return {"messages": [AIMessage(content="Finding escalated to human analyst.")]}

def auto_remediate(state: TriageState) -> dict:
    """Format for auto-remediation."""
    return {"messages": [AIMessage(content="Auto-remediation playbook initiated.")]}

# Build graph
workflow = StateGraph(TriageState)
workflow.add_node("triage", triage_finding)
workflow.add_node("escalate", escalate)
workflow.add_node("auto_remediate", auto_remediate)

workflow.set_entry_point("triage")
workflow.add_conditional_edges(
    "triage",
    should_escalate,
    {
        "escalate": "escalate",
        "auto_remediate": "auto_remediate"
    }
)
workflow.add_edge("escalate", END)
workflow.add_edge("auto_remediate", END)

triage_app = workflow.compile()

async def run_triage(finding: dict) -> dict:
    """Run the triage workflow on a finding."""
    initial_state = {
        "finding": finding,
        "messages": [HumanMessage(content="Please triage this finding.")],
        "severity_assessment": None,
        "action_plan": None
    }
    final_state = await triage_app.ainvoke(initial_state)
    return {
        "severity": final_state.get("severity_assessment"),
        "actions": final_state.get("action_plan"),
        "messages": [m.content for m in final_state.get("messages", [])]
    }
