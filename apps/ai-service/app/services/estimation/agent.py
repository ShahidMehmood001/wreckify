from typing import List, Optional
from app.schemas.detect import DetectedPart
from app.schemas.estimate import EstimateResponse, LineItem
from app.services.providers.base import BaseVisionProvider
from .tools import (
    query_parts_price,
    query_labor_cost,
    calculate_repair_time,
    calculate_total_cost,
    _fallback_parts_price,
    _fallback_labor_cost,
)


async def run_estimation_pipeline(
    scan_id: str,
    detected_parts: List[DetectedPart],
    vehicle: Optional[object],
    provider: BaseVisionProvider,
    city: str = "Lahore",
) -> EstimateResponse:
    line_items = []
    car_make = vehicle.make if vehicle else None

    for part in detected_parts:
        parts_data = _safe_invoke(query_parts_price, {"part_name": part.part_name, "car_make": car_make})
        labor_data = _safe_invoke(query_labor_cost, {"part_name": part.part_name, "city": city})
        repair_data = _safe_invoke(calculate_repair_time, {"part_name": part.part_name, "severity": part.severity})

        severity_multiplier = {"MINOR": 0.6, "MODERATE": 1.0, "SEVERE": 1.5}.get(part.severity.upper(), 1.0)

        parts_min = round(parts_data["price_min"] * severity_multiplier)
        parts_max = round(parts_data["price_max"] * severity_multiplier)
        labor_min = round(labor_data["labor_min"] * severity_multiplier)
        labor_max = round(labor_data["labor_max"] * severity_multiplier)

        line_items.append(LineItem(
            part=part.part_name,
            parts_min=parts_min,
            parts_max=parts_max,
            labor_min=labor_min,
            labor_max=labor_max,
        ))

    totals = _safe_invoke(
        calculate_total_cost,
        {"line_items": [item.model_dump() for item in line_items]},
    )

    narrative = await _generate_narrative(provider, detected_parts, vehicle, totals)

    return EstimateResponse(
        scan_id=scan_id,
        total_min=totals["total_min"],
        total_max=totals["total_max"],
        currency="PKR",
        line_items=line_items,
        narrative=narrative,
    )


def _safe_invoke(tool_fn, args: dict) -> dict:
    try:
        return tool_fn.invoke(args)
    except Exception as e:
        print(f"Tool {tool_fn.name} failed: {e}")
        return {}


async def _generate_narrative(
    provider: BaseVisionProvider,
    parts: List[DetectedPart],
    vehicle: Optional[object],
    totals: dict,
) -> str:
    try:
        llm = provider.get_llm()
        vehicle_str = f"{vehicle.year} {vehicle.make} {vehicle.model}" if vehicle else "the vehicle"
        parts_summary = ", ".join(
            f"{p.part_name.replace('_', ' ')} ({p.severity.lower()})" for p in parts
        )
        prompt = (
            f"You are a professional vehicle damage assessor in Pakistan. "
            f"Write a concise 2-3 sentence repair assessment for {vehicle_str}. "
            f"Damaged parts: {parts_summary}. "
            f"Estimated repair cost: PKR {int(totals.get('total_min', 0)):,} to PKR {int(totals.get('total_max', 0)):,}. "
            f"Be professional, factual, and mention the repair priority."
        )
        response = llm.invoke(prompt)
        return response.content.strip()
    except Exception as e:
        print(f"Narrative generation failed: {e}")
        parts_str = ", ".join(p.part_name.replace("_", " ") for p in parts)
        return (
            f"The vehicle has sustained damage to the following parts: {parts_str}. "
            f"Estimated repair cost ranges from PKR {int(totals.get('total_min', 0)):,} "
            f"to PKR {int(totals.get('total_max', 0)):,}. "
            f"Professional repair is recommended."
        )
