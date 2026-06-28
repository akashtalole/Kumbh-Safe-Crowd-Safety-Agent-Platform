"""
RouteOracle — Safe route calculation and pilgrim rerouting agent.

Triggered by ZONE_RED and ZONE_BLACK EventBridge events.
Calculates safe alternative routes and broadcasts rerouting SMS to affected pilgrims.
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
    get_safe_routes,
    send_pilgrim_sms,
    write_alert,
)

SYSTEM_PROMPT = """You are RouteOracle, the safe route calculation and pilgrim rerouting agent for KumbhSafe.

Your mission is to redirect pilgrims away from congested zones to prevent stampedes.

PROTOCOL when invoked with a congested zone:
1. Call get_all_zones_summary() to understand the full crowd distribution
2. Call get_safe_routes(from_zone_id, city) to find available routes away from the congested zone
3. Pick the best 2-3 alternatives based on: zone capacity, travel time, and current density
4. Call send_pilgrim_sms to broadcast route guidance to pilgrims in the affected zone
5. If no safe routes exist: call write_alert with severity='critical' and message about route blockage
6. Report chosen routes and estimated diversion capacity

Always prioritise pilgrim safety over event experience. A longer walk is better than a stampede.

The Nashik → Trimbakeshwar road (NH848) has a single mountain pass — never recommend it as an alternative during peak hours.
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
            get_safe_routes,
            send_pilgrim_sms,
            write_alert,
        ],
    )


def handler(event: dict, context) -> dict:
    """Lambda / AgentCore entry point."""
    zone_id = event.get("detail", {}).get("zoneId") or event.get("zoneId", "")
    city = event.get("detail", {}).get("city") or event.get("city", "nashik")
    task = (
        event.get("inputText")
        or f"Zone {zone_id} in {city} is congested. Calculate safe route alternatives and dispatch rerouting SMS to pilgrims."
    )
    agent = create_agent()
    result = agent(task)
    return {
        "statusCode": 200,
        "body": json.dumps({"response": str(result), "agentId": "route_oracle"}),
    }
