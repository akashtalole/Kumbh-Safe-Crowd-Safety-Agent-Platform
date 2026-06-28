"""
Shared DynamoDB tool library used by all KumbhSafe Strands agents.
Every tool is decorated with @tool so Strands can register it automatically.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3
from strands import tool

_dynamodb = None


def _ddb():
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource(
            "dynamodb",
            region_name=os.environ.get("AWS_REGION", "ap-south-1"),
        )
    return _dynamodb


def _table(name: str):
    return _ddb().Table(f"kumbhsafe-{name}")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Zone tools ────────────────────────────────────────────────────────────────

@tool
def read_zone_density(zone_id: str) -> dict[str, Any]:
    """Read the current crowd density and status for a specific zone.

    Args:
        zone_id: The zone identifier (e.g. 'zone_kushavart_core')

    Returns:
        Zone record with density, status, count, isHeld, lastUpdated fields.
    """
    resp = _table("zones").get_item(Key={"PK": zone_id, "SK": "LATEST"})
    item = resp.get("Item")
    if not item:
        return {"error": f"Zone {zone_id} not found"}
    return {
        "zoneId": item.get("PK"),
        "density": float(item.get("density", 0)),
        "status": item.get("status", "UNKNOWN"),
        "currentCount": int(item.get("currentCount", 0)),
        "capacity": int(item.get("capacity", 0)),
        "isHeld": bool(item.get("isHeld", False)),
        "city": item.get("city", ""),
        "lastUpdated": item.get("lastUpdated", ""),
    }


@tool
def get_all_zones_summary(city: str = "") -> list[dict[str, Any]]:
    """Get density summary for all zones, optionally filtered by city.

    Args:
        city: Optional city filter — 'nashik' or 'trimbakeshwar'. Empty for all.

    Returns:
        List of zone summaries sorted by density descending.
    """
    if city:
        resp = _table("zones").query(
            IndexName="city-status-index",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("city").eq(city),
        )
    else:
        resp = _table("zones").scan(
            FilterExpression=boto3.dynamodb.conditions.Attr("SK").eq("LATEST")
        )
    items = resp.get("Items", [])
    zones = [
        {
            "zoneId": i.get("PK"),
            "name": i.get("name", ""),
            "city": i.get("city", ""),
            "density": float(i.get("density", 0)),
            "status": i.get("status", ""),
            "currentCount": int(i.get("currentCount", 0)),
            "isHeld": bool(i.get("isHeld", False)),
        }
        for i in items
        if i.get("SK") == "LATEST"
    ]
    return sorted(zones, key=lambda z: z["density"], reverse=True)


@tool
def hold_zone_entry(zone_id: str, reason: str) -> dict[str, Any]:
    """Activate an entry hold on a zone to stop pilgrim inflow.

    Args:
        zone_id: Zone identifier to hold.
        reason: Human-readable reason for the hold (logged to audit trail).

    Returns:
        Confirmation with zoneId and heldAt timestamp.
    """
    now = _now()
    _table("zones").update_item(
        Key={"PK": zone_id, "SK": "LATEST"},
        UpdateExpression="SET isHeld = :t, heldReason = :r, heldAt = :ts, heldBy = :by",
        ExpressionAttributeValues={
            ":t": True,
            ":r": reason,
            ":ts": now,
            ":by": "agent",
        },
    )
    return {"zoneId": zone_id, "isHeld": True, "heldAt": now, "reason": reason}


@tool
def release_zone_entry(zone_id: str) -> dict[str, Any]:
    """Release an entry hold on a zone.

    Args:
        zone_id: Zone identifier to release.

    Returns:
        Confirmation with zoneId and releasedAt timestamp.
    """
    now = _now()
    _table("zones").update_item(
        Key={"PK": zone_id, "SK": "LATEST"},
        UpdateExpression="SET isHeld = :f, heldReason = :r, releasedAt = :ts",
        ExpressionAttributeValues={":f": False, ":r": None, ":ts": now},
    )
    return {"zoneId": zone_id, "isHeld": False, "releasedAt": now}


# ── Alert tools ───────────────────────────────────────────────────────────────

@tool
def write_alert(
    zone_id: str,
    alert_type: str,
    severity: str,
    title: str,
    description: str,
    agent_source: str,
    sop_steps: list[str] | None = None,
) -> dict[str, Any]:
    """Create a new alert and persist it to DynamoDB.

    Args:
        zone_id: Zone where the alert originates.
        alert_type: Type — 'crowd_surge' | 'flood' | 'medical' | 'stampede' | 'missing' | 'fire'.
        severity: Alert severity — 'info' | 'high' | 'critical'.
        title: Short alert title shown in the ICCC dashboard.
        description: Detailed description of the situation.
        agent_source: Name of the agent raising this alert.
        sop_steps: Optional ordered list of SOP steps to display.

    Returns:
        Created alert record including alertId.
    """
    alert_id = str(uuid.uuid4())
    now = _now()
    item = {
        "PK": alert_id,
        "SK": now,
        "alertId": alert_id,
        "zoneId": zone_id,
        "type": alert_type,
        "severity": severity,
        "title": title,
        "description": description,
        "agentSource": agent_source,
        "status": "open",
        "sopSteps": sop_steps or [],
        "createdAt": now,
        "updatedAt": now,
    }
    _table("alerts").put_item(Item=item)
    return {"alertId": alert_id, "created": True, "severity": severity, "createdAt": now}


# ── Notification tools ─────────────────────────────────────────────────────────

@tool
def send_pilgrim_sms(trigger: str, zone_ids: list[str], context_message: str) -> dict[str, Any]:
    """Send bulk SMS notifications to pilgrims in specified zones via SNS.

    Args:
        trigger: Event trigger name — 'zone_black' | 'zone_red' | 'flood_warning' | 'route_change'.
        zone_ids: List of zone IDs whose pilgrims should receive the SMS.
        context_message: The message body (max 160 chars). Will be localised server-side.

    Returns:
        Confirmation with messagesSent count and SNS messageId.
    """
    sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
    topic_arn = os.environ.get("SNS_PILGRIM_SMS_TOPIC_ARN", "")
    if not topic_arn:
        return {"error": "SNS_PILGRIM_SMS_TOPIC_ARN not configured"}

    payload = {
        "trigger": trigger,
        "zoneIds": zone_ids,
        "message": context_message,
        "timestamp": _now(),
    }
    resp = sns.publish(
        TopicArn=topic_arn,
        Message=json.dumps(payload),
        Subject=f"KumbhSafe Alert: {trigger}",
    )
    return {"messageId": resp.get("MessageId"), "trigger": trigger, "zoneCount": len(zone_ids)}


# ── Flood / Ghat tools ────────────────────────────────────────────────────────

@tool
def get_godavari_level() -> dict[str, Any]:
    """Read the current Godavari river water level from DynamoDB (updated by IoT sensors).

    Returns:
        Current water level in metres, trend, and ghat statuses.
    """
    resp = _table("ghats").scan(
        FilterExpression=boto3.dynamodb.conditions.Attr("SK").eq("LATEST")
    )
    ghats = [
        {
            "ghatId": i.get("PK"),
            "name": i.get("name", ""),
            "waterLevel": float(i.get("waterLevel", 0)),
            "trend": i.get("waterLevelTrend", "stable"),
            "status": i.get("status", "safe"),
            "bathingAllowed": bool(i.get("bathingAllowed", True)),
        }
        for i in resp.get("Items", [])
    ]
    return {"ghats": ghats, "readAt": _now()}


@tool
def update_ghat_status(ghat_id: str, status: str, bathing_allowed: bool) -> dict[str, Any]:
    """Update the safety status of a bathing ghat.

    Args:
        ghat_id: Ghat identifier.
        status: New status — 'safe' | 'caution' | 'warning' | 'closed'.
        bathing_allowed: Whether pilgrims may enter the water.

    Returns:
        Confirmation with ghatId and updatedAt timestamp.
    """
    now = _now()
    _table("ghats").update_item(
        Key={"PK": ghat_id, "SK": "LATEST"},
        UpdateExpression="SET #s = :s, bathingAllowed = :b, updatedAt = :t",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": status, ":b": bathing_allowed, ":t": now},
    )
    return {"ghatId": ghat_id, "status": status, "bathingAllowed": bathing_allowed, "updatedAt": now}


@tool
def get_imd_forecast() -> dict[str, Any]:
    """Fetch the latest IMD rainfall forecast from DynamoDB config cache.

    Returns:
        Forecast data including expected rainfall in mm and flood risk level.
    """
    resp = _table("config-cache").get_item(Key={"PK": "imd_forecast", "SK": "LATEST"})
    item = resp.get("Item", {})
    return {
        "forecastMm": float(item.get("forecastMm", 0)),
        "floodRisk": item.get("floodRisk", "low"),
        "validUntil": item.get("validUntil", ""),
        "source": item.get("source", "IMD"),
        "fetchedAt": item.get("fetchedAt", ""),
    }


# ── Safe route tools ──────────────────────────────────────────────────────────

@tool
def get_safe_routes(from_zone_id: str, city: str) -> list[dict[str, Any]]:
    """Get available safe route alternatives from a congested zone.

    Args:
        from_zone_id: The origin zone that is RED or BLACK.
        city: City context — 'nashik' or 'trimbakeshwar'.

    Returns:
        Ordered list of safe route alternatives with estimated travel times.
    """
    resp = _table("routes").query(
        IndexName="fromZone-city-index",
        KeyConditionExpression=(
            boto3.dynamodb.conditions.Key("fromZoneId").eq(from_zone_id)
            & boto3.dynamodb.conditions.Key("city").eq(city)
        ),
    )
    routes = [
        {
            "routeId": i.get("routeId", ""),
            "toZoneId": i.get("toZoneId", ""),
            "toZoneName": i.get("toZoneName", ""),
            "estimatedMinutes": int(i.get("estimatedMinutes", 0)),
            "distanceKm": float(i.get("distanceKm", 0)),
            "isActive": bool(i.get("isActive", True)),
        }
        for i in resp.get("Items", [])
        if i.get("isActive")
    ]
    return sorted(routes, key=lambda r: r["estimatedMinutes"])


# ── Ambulance / MedEvac tools ─────────────────────────────────────────────────

@tool
def get_available_ambulances(city: str) -> list[dict[str, Any]]:
    """Get a list of currently available ambulances in a city.

    Args:
        city: 'nashik' or 'trimbakeshwar'.

    Returns:
        List of available ambulances sorted by proximity.
    """
    resp = _table("ambulances").query(
        IndexName="city-status-index",
        KeyConditionExpression=(
            boto3.dynamodb.conditions.Key("city").eq(city)
            & boto3.dynamodb.conditions.Key("status").eq("available")
        ),
    )
    return [
        {
            "vehicleId": i.get("vehicleId", ""),
            "callSign": i.get("callSign", ""),
            "crew": i.get("crew", ""),
            "currentLat": float(i.get("currentLat", 0)),
            "currentLng": float(i.get("currentLng", 0)),
            "status": i.get("status", "available"),
        }
        for i in resp.get("Items", [])
    ]


@tool
def dispatch_ambulance(vehicle_id: str, incident_id: str) -> dict[str, Any]:
    """Dispatch an ambulance to an incident.

    Args:
        vehicle_id: The ambulance vehicle ID.
        incident_id: The incident or alert ID to respond to.

    Returns:
        Dispatch confirmation with ETA.
    """
    now = _now()
    _table("ambulances").update_item(
        Key={"vehicleId": vehicle_id},
        UpdateExpression="SET #s = :d, assignedIncidentId = :i, dispatchedAt = :t",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":d": "dispatched", ":i": incident_id, ":t": now},
    )
    return {"vehicleId": vehicle_id, "status": "dispatched", "incidentId": incident_id, "dispatchedAt": now}


@tool
def send_sos_response(pilgrim_id: str, message: str, ambulance_call_sign: str, eta_minutes: int) -> dict[str, Any]:
    """Send an SOS response confirmation SMS to the pilgrim.

    Args:
        pilgrim_id: Pilgrim who triggered the SOS.
        message: Confirmation message in the pilgrim's language.
        ambulance_call_sign: Assigned ambulance call sign.
        eta_minutes: Estimated arrival time in minutes.

    Returns:
        Confirmation with sent timestamp.
    """
    sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
    topic_arn = os.environ.get("SNS_MEDICAL_ALERTS_TOPIC_ARN", "")
    if topic_arn:
        sns.publish(
            TopicArn=topic_arn,
            Message=json.dumps({
                "pilgrimId": pilgrim_id,
                "message": message,
                "ambulanceCallSign": ambulance_call_sign,
                "etaMinutes": eta_minutes,
                "timestamp": _now(),
            }),
        )
    return {
        "pilgrimId": pilgrim_id,
        "ambulanceCallSign": ambulance_call_sign,
        "etaMinutes": eta_minutes,
        "sentAt": _now(),
    }


@tool
def create_green_corridor(vehicle_id: str, route_description: str) -> dict[str, Any]:
    """Request police to clear a green corridor for an emergency vehicle.

    Args:
        vehicle_id: Ambulance vehicle ID.
        route_description: Text description of the corridor route.

    Returns:
        Corridor request ID and confirmation.
    """
    corridor_id = str(uuid.uuid4())
    now = _now()
    _table("incidents").put_item(Item={
        "PK": f"corridor_{corridor_id}",
        "SK": now,
        "type": "green_corridor",
        "vehicleId": vehicle_id,
        "route": route_description,
        "status": "requested",
        "createdAt": now,
    })
    return {"corridorId": corridor_id, "vehicleId": vehicle_id, "status": "requested", "createdAt": now}


# ── Lost & Found tools ────────────────────────────────────────────────────────

@tool
def search_pilgrim_by_face(photo_s3_key: str) -> list[dict[str, Any]]:
    """Use Amazon Rekognition to search for a pilgrim by face photo.

    Args:
        photo_s3_key: S3 key of the uploaded photo to search against the pilgrim registry.

    Returns:
        List of potential matches with confidence scores.
    """
    rek = boto3.client("rekognition", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
    collection_id = os.environ.get("REKOGNITION_COLLECTION_ID", "kumbhsafe-pilgrims")
    bucket = os.environ.get("S3_MEDIA_BUCKET", "")
    try:
        resp = rek.search_faces_by_image(
            CollectionId=collection_id,
            Image={"S3Object": {"Bucket": bucket, "Name": photo_s3_key}},
            MaxFaces=5,
            FaceMatchThreshold=80,
        )
        return [
            {
                "pilgrimId": m["Face"].get("ExternalImageId", ""),
                "confidence": float(m.get("Similarity", 0)),
                "faceId": m["Face"].get("FaceId", ""),
            }
            for m in resp.get("FaceMatches", [])
        ]
    except Exception as e:
        return [{"error": str(e)}]


@tool
def get_pilgrim_by_qr(qr_code: str) -> dict[str, Any]:
    """Look up a pilgrim record by their QR wristband code.

    Args:
        qr_code: The QR code string scanned from the pilgrim's wristband.

    Returns:
        Pilgrim record or error if not found.
    """
    resp = _table("pilgrims").query(
        IndexName="qrCode-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("qrCode").eq(qr_code),
        Limit=1,
    )
    items = resp.get("Items", [])
    if not items:
        return {"error": f"No pilgrim found for QR code: {qr_code}"}
    i = items[0]
    return {
        "pilgrimId": i.get("pilgrimId", ""),
        "name": i.get("name", ""),
        "age": int(i.get("age", 0)),
        "phone": i.get("phone", ""),
        "language": i.get("language", "hindi"),
        "currentZoneId": i.get("currentZoneId", ""),
        "hasHealthFlag": bool(i.get("hasHealthFlag", False)),
        "healthNote": i.get("healthNote", ""),
    }


@tool
def create_lost_found_case(
    case_type: str,
    name: str,
    age: int,
    description: str,
    last_seen_zone: str,
    reporter_phone: str,
    city: str,
) -> dict[str, Any]:
    """Create a new lost or found person case in DynamoDB.

    Args:
        case_type: 'lost' or 'found'.
        name: Name of the missing or found person.
        age: Approximate age.
        description: Physical description.
        last_seen_zone: Zone where they were last seen.
        reporter_phone: Phone number of the person who reported.
        city: 'nashik' or 'trimbakeshwar'.

    Returns:
        Created case record with caseId.
    """
    case_id = str(uuid.uuid4())
    now = _now()
    item = {
        "PK": case_id,
        "SK": now,
        "caseId": case_id,
        "type": case_type,
        "name": name,
        "age": age,
        "description": description,
        "lastSeenZone": last_seen_zone,
        "reporterPhone": reporter_phone,
        "city": city,
        "status": "open",
        "reportedAt": now,
        "updatedAt": now,
    }
    _table("lostfound").put_item(Item=item)
    return {"caseId": case_id, "created": True, "type": case_type, "reportedAt": now}


@tool
def send_sms_to_reporter(phone: str, message: str) -> dict[str, Any]:
    """Send an SMS update to the person who reported a lost/found case.

    Args:
        phone: Phone number in E.164 format.
        message: SMS message body.

    Returns:
        Send confirmation.
    """
    sns = boto3.client("sns", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
    try:
        resp = sns.publish(PhoneNumber=phone, Message=message)
        return {"messageId": resp.get("MessageId"), "phone": phone, "sentAt": _now()}
    except Exception as e:
        return {"error": str(e), "phone": phone}
