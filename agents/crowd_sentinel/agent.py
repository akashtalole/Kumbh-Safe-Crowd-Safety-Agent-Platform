"""
CrowdSentinel — Real-time crowd density monitoring agent.

Triggered every 30 seconds by EventBridge during active bathing hours (0600–2200 IST).
Reads zone densities, applies the Kushavart hard-cap rule, and writes alerts when zones
reach RED or BLACK status.
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
    hold_zone_entry,
    read_zone_density,
    send_pilgrim_sms,
    write_alert,
)

SYSTEM_PROMPT = """You are CrowdSentinel, the real-time crowd density monitoring agent for KumbhSafe.
Your mission is to protect the safety of pilgrims at Nashik Simhastha Kumbh Mela 2027.

HARD RULES (non-negotiable):
- If Kushavart Kund count exceeds 1,900 persons: immediately call hold_zone_entry and write_alert with severity='critical'
- Any zone at BLACK status: call hold_zone_entry and write_alert immediately
- Any zone at RED status: write_alert with severity='high' and send reroute SMS

ANALYSIS PROTOCOL:
1. Call get_all_zones_summary() to get current density across all zones
2. Apply Kushavart hard cap check (count > 1900 → BLACK regardless of density)
3. For each RED/BLACK zone: write_alert, hold_zone_entry, send_pilgrim_sms
4. For YELLOW zones: log observation only (no alert needed unless trending to RED)
5. Summarise your assessment in plain text for the ICCC dashboard

Be concise and action-oriented. Every second counts during a crowd surge.
"""


def create_agent() -> Agent:
    model = BedrockModel(
        model_id=os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-pro-v1:0"),
        region_name=os.environ.get("AWS_REGION", "ap-south-1"),
    )
    return Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            get_all_zones_summary,
            read_zone_density,
            write_alert,
            hold_zone_entry,
            send_pilgrim_sms,
        ],
    )


def handler(event: dict, context) -> dict:
    """Lambda / AgentCore entry point."""
    task = event.get("inputText") or event.get("task") or "Check all zones for density anomalies and take necessary action."
    agent = create_agent()
    result = agent(task)
    return {
        "statusCode": 200,
        "body": json.dumps({"response": str(result), "agentId": "crowd_sentinel"}),
    }
