from langchain_core.tools import tool
from sqlalchemy import text
from app.core.db import get_session
from typing import Optional


@tool
def query_parts_price(part_name: str, car_make: Optional[str] = None) -> dict:
    """Query the scraped spare parts price database for a given part.
    Returns min and max price in PKR."""
    session = get_session()
    try:
        if car_make:
            result = session.execute(
                text("""
                    SELECT AVG(price_min) as avg_min, AVG(price_max) as avg_max,
                           MIN(price_min) as min_price, MAX(price_max) as max_price,
                           COUNT(*) as listings
                    FROM scraped_part_prices
                    WHERE LOWER(part_name) LIKE LOWER(:part)
                    AND (car_make IS NULL OR LOWER(car_make) LIKE LOWER(:make))
                """),
                {"part": f"%{part_name}%", "make": f"%{car_make}%"},
            ).fetchone()
        else:
            result = session.execute(
                text("""
                    SELECT AVG(price_min) as avg_min, AVG(price_max) as avg_max,
                           MIN(price_min) as min_price, MAX(price_max) as max_price,
                           COUNT(*) as listings
                    FROM scraped_part_prices
                    WHERE LOWER(part_name) LIKE LOWER(:part)
                """),
                {"part": f"%{part_name}%"},
            ).fetchone()

        if result and result.listings > 0:
            return {
                "part_name": part_name,
                "price_min": float(result.min_price),
                "price_max": float(result.max_price),
                "listings": int(result.listings),
                "source": "scraped_data",
            }
    except Exception as e:
        print(f"DB query failed: {e}")
    finally:
        session.close()

    return _fallback_parts_price(part_name)


@tool
def query_labor_cost(part_name: str, city: str = "Lahore") -> dict:
    """Query the labor cost database for a given part and city.
    Returns min and max labor cost in PKR."""
    session = get_session()
    try:
        result = session.execute(
            text("""
                SELECT labor_min, labor_max FROM labor_costs
                WHERE LOWER(part_name) LIKE LOWER(:part)
                AND LOWER(city) = LOWER(:city)
                LIMIT 1
            """),
            {"part": f"%{part_name}%", "city": city},
        ).fetchone()

        if result:
            return {
                "part_name": part_name,
                "city": city,
                "labor_min": float(result.labor_min),
                "labor_max": float(result.labor_max),
                "source": "labor_db",
            }
    except Exception as e:
        print(f"Labor cost query failed: {e}")
    finally:
        session.close()

    return _fallback_labor_cost(part_name, city)


@tool
def calculate_repair_time(part_name: str, severity: str) -> dict:
    """Calculate estimated repair time in hours based on part and severity."""
    base_hours = {
        "bumper_front": 4, "bumper_rear": 4, "door_left": 6, "door_right": 6,
        "bonnet": 5, "boot": 5, "headlight": 2, "taillight": 2,
        "windscreen": 3, "mirror_left": 1, "mirror_right": 1,
        "fender_left": 5, "fender_right": 5, "roof": 8,
    }
    multipliers = {"MINOR": 0.5, "MODERATE": 1.0, "SEVERE": 1.8}

    base = base_hours.get(part_name.lower(), 4)
    multiplier = multipliers.get(severity.upper(), 1.0)
    hours = round(base * multiplier, 1)

    return {"part_name": part_name, "severity": severity, "repair_hours": hours}


@tool
def calculate_total_cost(line_items: list) -> dict:
    """Sum all line items to produce a total min and max cost in PKR."""
    total_min = sum(
        item.get("parts_min", 0) + item.get("labor_min", 0) for item in line_items
    )
    total_max = sum(
        item.get("parts_max", 0) + item.get("labor_max", 0) for item in line_items
    )
    return {
        "total_min": round(total_min, 2),
        "total_max": round(total_max, 2),
        "currency": "PKR",
    }


# ─── Fallback pricing (when no scraped data available) ────────────────────────

_FALLBACK_PARTS = {
    "bumper_front":  (8000,  35000),
    "bumper_rear":   (7000,  30000),
    "door_left":     (15000, 60000),
    "door_right":    (15000, 60000),
    "bonnet":        (12000, 50000),
    "boot":          (10000, 40000),
    "headlight":     (5000,  25000),
    "taillight":     (3000,  15000),
    "windscreen":    (8000,  30000),
    "mirror_left":   (2000,  8000),
    "mirror_right":  (2000,  8000),
    "fender_left":   (8000,  35000),
    "fender_right":  (8000,  35000),
    "roof":          (20000, 80000),
}

_FALLBACK_LABOR = {
    "bumper_front":  (2000, 5000),
    "bumper_rear":   (2000, 5000),
    "door_left":     (3000, 8000),
    "door_right":    (3000, 8000),
    "bonnet":        (2500, 6000),
    "boot":          (2000, 5000),
    "headlight":     (500,  1500),
    "taillight":     (500,  1200),
    "windscreen":    (1500, 3000),
    "mirror_left":   (300,  800),
    "mirror_right":  (300,  800),
    "fender_left":   (2000, 5000),
    "fender_right":  (2000, 5000),
    "roof":          (5000, 12000),
}


def _fallback_parts_price(part_name: str) -> dict:
    mn, mx = _FALLBACK_PARTS.get(part_name.lower(), (5000, 20000))
    return {"part_name": part_name, "price_min": mn, "price_max": mx, "listings": 0, "source": "fallback"}


def _fallback_labor_cost(part_name: str, city: str) -> dict:
    mn, mx = _FALLBACK_LABOR.get(part_name.lower(), (2000, 5000))
    return {"part_name": part_name, "city": city, "labor_min": mn, "labor_max": mx, "source": "fallback"}
