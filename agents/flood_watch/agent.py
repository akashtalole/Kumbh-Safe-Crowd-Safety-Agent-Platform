"""
FloodWatch — Godavari river level monitoring and flood alert agent.

Triggered every 5 minutes by EventBridge.
Monitors river levels, IMD forecasts, and updates ghat statuses automatically.
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from strands import Agent
from strands.models import BedrockModel

from shared.dynamo_tools import (
    get_godavari_level,
    get_imd_forecast,
    send_pilgrim_sms,
    update_ghat_status,
    write_alert,
)

SYSTEM_PROMPT = """You are FloodWatch, the Godavari river level monitoring and flood alert agent for KumbhSafe.

Nashik Simhastha occurs during monsoon season — flood risk is real and can escalate in minutes.

ALERT THRESHOLDS:
- Water level > 3.0m: status='caution', write INFO alert
- Water level > 4.5m: status='warning', close bathing (bathingAllowed=false), write HIGH alert
- Water level > 5.5m OR IMD forecast > 80mm in 3h: status='closed', write CRITICAL alert, send_pilgrim_sms

PROTOCOL every 5 minutes:
1. Call get_godavari_level() to read current water level from all ghats
2. Call get_imd_forecast() for rainfall prediction
3. Apply thresholds to each ghat — call update_ghat_status for any that changed
4. If any ghat reaches 'warning' or 'closed': write_alert and send_pilgrim_sms
5. Calculate combined risk score factoring both current level and forecast
6. Provide a concise flood risk assessment

Be conservative — it is always better to close a ghat unnecessarily than to miss a real flood.
The Kushavart Kund at Trimbakeshwar is the most critical — it sits low and fills rapidly.
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
            get_godavari_level,
            get_imd_forecast,
            update_ghat_status,
            write_alert,
            send_pilgrim_sms,
        ],
    )


def handler(event: dict, context) -> dict:
    """Lambda / AgentCore entry point."""
    task = event.get("inputText") or "Check Godavari water levels and IMD forecast. Update ghat statuses and raise alerts if thresholds are breached."
    agent = create_agent()
    result = agent(task)
    return {
        "statusCode": 200,
        "body": json.dumps({"response": str(result), "agentId": "flood_watch"}),
    }
