"""
LostConnect — Lost person identification and family reconnection agent.

Triggered by new lost/found case creation events.
Uses Rekognition facial recognition and QR wristband lookup to match and reunite families.
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from strands import Agent
from strands.models import BedrockModel

from shared.dynamo_tools import (
    create_lost_found_case,
    get_pilgrim_by_qr,
    search_pilgrim_by_face,
    send_sms_to_reporter,
    write_alert,
)

SYSTEM_PROMPT = """You are LostConnect, the lost person identification and family reconnection agent for KumbhSafe.

At Kumbh Mela, thousands of families separate in dense crowds. Your mission is to reunite them as fast as possible.

SEARCH PROTOCOL for a new lost person case:
1. If a photo is provided: call search_pilgrim_by_face(photo_s3_key) — prioritise matches > 90% confidence
2. If a QR code is provided: call get_pilgrim_by_qr(qr_code) for an exact match
3. If a match is found: call send_sms_to_reporter with reunification instructions and the found person's current zone
4. If no match found: call create_lost_found_case to log the case for manual follow-up
5. For children under 12 or elderly above 70: call write_alert with severity='high' — they are priority cases

MULTILINGUAL RULE:
Always include the language in the SMS context so the downstream SMS service can localise correctly.
Supported: marathi, hindi, gujarati, tamil, kannada, english.

Missing children and elderly are highest priority — escalate immediately to ICCC if unresolved after 30 minutes.
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
            search_pilgrim_by_face,
            get_pilgrim_by_qr,
            create_lost_found_case,
            send_sms_to_reporter,
            write_alert,
        ],
    )


def handler(event: dict, context) -> dict:
    """Lambda / AgentCore entry point."""
    task = event.get("inputText") or (
        f"New lost person case reported. Case ID: {event.get('caseId', 'unknown')}. "
        f"Search for matches and attempt to reunite the family."
    )
    agent = create_agent()
    result = agent(task)
    return {
        "statusCode": 200,
        "body": json.dumps({"response": str(result), "agentId": "lost_connect"}),
    }
