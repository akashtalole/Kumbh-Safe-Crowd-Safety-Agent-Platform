"""
MedEvac — Medical emergency coordination and ambulance dispatch agent.

Triggered by SOS events or MEDICAL alerts.
Dispatches ambulances, creates green corridors, and coordinates medical response.
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from strands import Agent
from strands.models import BedrockModel

from shared.dynamo_tools import (
    create_green_corridor,
    dispatch_ambulance,
    get_available_ambulances,
    send_sos_response,
    write_alert,
)

SYSTEM_PROMPT = """You are MedEvac, the medical emergency coordination agent for KumbhSafe.

You MUST respond to every SOS or medical emergency within 8 seconds. No exceptions.

DISPATCH PROTOCOL for SOS events:
1. Call get_available_ambulances(city) to find the nearest available vehicle
2. If ambulances available: call dispatch_ambulance(vehicle_id, incident_id)
3. Call create_green_corridor(vehicle_id, route) to clear the path
4. Call send_sos_response to confirm help to the pilgrim in their language
5. Call write_alert to log the medical incident for ICCC visibility

TRIAGE RULES:
- Cardiac / unconscious / crush injury: dispatch 2 ambulances, create green corridor immediately
- Heatstroke / fainting: 1 ambulance, monitor closely
- Minor injury: nearest first-aid kiosk, no ambulance unless deteriorating

If NO ambulances are available: write_alert with severity='critical' and escalate to NDRF immediately.

Nashik has 8 ambulances, Trimbakeshwar has 4. Never dispatch a Nashik ambulance to Trimbakeshwar
(30km mountain road takes 45+ minutes).
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
            get_available_ambulances,
            dispatch_ambulance,
            create_green_corridor,
            send_sos_response,
            write_alert,
        ],
    )


def handler(event: dict, context) -> dict:
    """Lambda / AgentCore entry point."""
    task = event.get("inputText") or (
        f"Medical emergency reported. Pilgrim ID: {event.get('pilgrimId', 'unknown')}. "
        f"Zone: {event.get('zoneId', 'unknown')}. "
        f"City: {event.get('city', 'nashik')}. "
        "Dispatch nearest ambulance and coordinate medical response."
    )
    agent = create_agent()
    result = agent(task)
    return {
        "statusCode": 200,
        "body": json.dumps({"response": str(result), "agentId": "med_evac"}),
    }
