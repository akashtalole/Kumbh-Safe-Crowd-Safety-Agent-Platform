"""
CommandBridge — Master orchestrator agent.

Triggered by ZONE_RED, ZONE_BLACK, GHAT_CLOSED, FLOOD_ALERT, and AGENT_FAILED events.
Coordinates cross-city incidents, prioritises response, and invokes specialist agents.
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from strands import Agent
from strands.models import BedrockModel

from shared.dynamo_tools import (
    get_all_zones_summary,
    send_pilgrim_sms,
    write_alert,
)

SYSTEM_PROMPT = """You are CommandBridge, the master orchestrator for KumbhSafe's AI agent network.

You coordinate the five specialist agents: CrowdSentinel, RouteOracle, FloodWatch, MedEvac, LostConnect.
You are invoked when situations require cross-agent or cross-city coordination.

ORCHESTRATION PROTOCOL:
1. Call get_all_zones_summary() to get the full situational picture across both cities
2. Assess the priority and type of incident
3. Invoke the appropriate specialist agents via invoke_child_agent
4. If multiple cities are affected simultaneously: coordinate resource sharing
5. Write a master alert summarising the cross-city situation
6. If NDRF activation is required: write_alert with severity='critical' and include NDRF in notification targets

CROSS-CITY CONFLICT RULE:
Nashik and Trimbakeshwar are 30km apart via a single mountain road.
If both cities have simultaneous BLACK zones, resources CANNOT be shared — treat as two independent incidents.
Escalate to ORG_ADMIN immediately.

AGENT FAILURE PROTOCOL:
If any specialist agent fails: write_alert with type='infrastructure', severity='high', and notify ICCC_OPERATOR.
Never let a silent agent failure go undetected. The Kushavart cap rule must always be active.

You are the last line of coordination before human intervention.
"""


def invoke_child_agent(agent_id: str, task: str) -> dict:
    """Invoke a specialist agent via Bedrock AgentCore."""
    import boto3
    client = boto3.client(
        "bedrock-agent-runtime",
        region_name=os.environ.get("AWS_REGION", "ap-south-1"),
    )
    agent_ids = {
        "crowd_sentinel": os.environ.get("BEDROCK_AGENT_ID_CROWD_SENTINEL", ""),
        "route_oracle": os.environ.get("BEDROCK_AGENT_ID_ROUTE_ORACLE", ""),
        "flood_watch": os.environ.get("BEDROCK_AGENT_ID_FLOOD_WATCH", ""),
        "med_evac": os.environ.get("BEDROCK_AGENT_ID_MED_EVAC", ""),
        "lost_connect": os.environ.get("BEDROCK_AGENT_ID_LOST_CONNECT", ""),
    }
    alias_ids = {
        "crowd_sentinel": os.environ.get("BEDROCK_AGENT_ALIAS_ID_CROWD_SENTINEL", "TSTALIASID"),
        "route_oracle": os.environ.get("BEDROCK_AGENT_ALIAS_ID_ROUTE_ORACLE", "TSTALIASID"),
        "flood_watch": os.environ.get("BEDROCK_AGENT_ALIAS_ID_FLOOD_WATCH", "TSTALIASID"),
        "med_evac": os.environ.get("BEDROCK_AGENT_ALIAS_ID_MED_EVAC", "TSTALIASID"),
        "lost_connect": os.environ.get("BEDROCK_AGENT_ALIAS_ID_LOST_CONNECT", "TSTALIASID"),
    }
    bedrock_agent_id = agent_ids.get(agent_id, "")
    alias_id = alias_ids.get(agent_id, "TSTALIASID")
    if not bedrock_agent_id:
        return {"error": f"No Bedrock agent ID configured for {agent_id}"}

    import uuid
    resp = client.invoke_agent(
        agentId=bedrock_agent_id,
        agentAliasId=alias_id,
        sessionId=str(uuid.uuid4()),
        inputText=task,
    )
    completion = ""
    for event in resp.get("completion", []):
        chunk = event.get("chunk", {})
        if "bytes" in chunk:
            completion += chunk["bytes"].decode("utf-8")
    return {"agentId": agent_id, "response": completion}


def create_agent() -> Agent:
    from strands import tool as strands_tool

    @strands_tool
    def invoke_child_agent_tool(agent_id: str, task: str) -> dict:
        """Invoke a specialist sub-agent with a specific task.

        Args:
            agent_id: Specialist agent ID — 'crowd_sentinel' | 'route_oracle' | 'flood_watch' | 'med_evac' | 'lost_connect'
            task: Detailed task description for the specialist agent.

        Returns:
            Agent response with completion text.
        """
        return invoke_child_agent(agent_id, task)

    model = BedrockModel(
        model_id=os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-pro-v1:0"),
        region_name=os.environ.get("AWS_REGION", "ap-south-1"),
    )
    return Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            invoke_child_agent_tool,
            get_all_zones_summary,
            write_alert,
            send_pilgrim_sms,
        ],
    )


def handler(event: dict, context) -> dict:
    """Lambda / AgentCore entry point."""
    detail = event.get("detail", {})
    event_type = event.get("detail-type") or event.get("eventType", "")
    task = event.get("inputText") or (
        f"EventBridge event received: {event_type}. "
        f"Details: {json.dumps(detail)}. "
        "Assess the situation across both cities and coordinate the appropriate specialist agents."
    )
    agent = create_agent()
    result = agent(task)
    return {
        "statusCode": 200,
        "body": json.dumps({"response": str(result), "agentId": "command_bridge"}),
    }
