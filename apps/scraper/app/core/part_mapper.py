import re

# Keywords → canonical part name
PART_KEYWORDS = {
    "bumper_front":  ["front bumper", "bumper front", "front bumper guard"],
    "bumper_rear":   ["rear bumper", "bumper rear", "back bumper"],
    "door_left":     ["left door", "door left", "driver door"],
    "door_right":    ["right door", "door right", "passenger door"],
    "bonnet":        ["bonnet", "hood", "engine hood", "engine cover"],
    "boot":          ["boot", "trunk", "dicky", "dickey", "boot lid"],
    "headlight":     ["headlight", "head light", "headlamp", "front light"],
    "taillight":     ["taillight", "tail light", "rear light", "back light", "taillamp"],
    "windscreen":    ["windscreen", "windshield", "front glass", "front windshield"],
    "mirror_left":   ["left mirror", "driver mirror", "side mirror left"],
    "mirror_right":  ["right mirror", "passenger mirror", "side mirror right"],
    "fender_left":   ["left fender", "fender left", "left mudguard"],
    "fender_right":  ["right fender", "fender right", "right mudguard"],
    "roof":          ["roof", "car roof", "top panel"],
}

CAR_MAKES = [
    "suzuki", "toyota", "honda", "kia", "hyundai", "mg", "changan",
    "daihatsu", "nissan", "mitsubishi", "proton", "haval", "baic",
    "prince", "united", "regal", "faw",
]


def map_part_name(title: str) -> str | None:
    title_lower = title.lower()
    for part_name, keywords in PART_KEYWORDS.items():
        for kw in keywords:
            if kw in title_lower:
                return part_name
    return None


def extract_car_make(title: str) -> str | None:
    title_lower = title.lower()
    for make in CAR_MAKES:
        if make in title_lower:
            return make.capitalize()
    return None


def extract_car_model(title: str) -> str | None:
    models = {
        "alto": "Alto", "cultus": "Cultus", "wagon r": "Wagon R", "swift": "Swift",
        "mehran": "Mehran", "ravi": "Ravi", "bolan": "Bolan", "jimny": "Jimny",
        "corolla": "Corolla", "yaris": "Yaris", "hilux": "Hilux", "fortuner": "Fortuner",
        "prado": "Prado", "land cruiser": "Land Cruiser", "camry": "Camry",
        "civic": "Civic", "city": "City", "hrv": "HR-V", "brv": "BR-V",
        "sportage": "Sportage", "picanto": "Picanto", "stonic": "Stonic",
        "tucson": "Tucson", "elantra": "Elantra", "sonata": "Sonata",
    }
    title_lower = title.lower()
    for model_key, model_name in models.items():
        if model_key in title_lower:
            return model_name
    return None


def extract_year(title: str) -> int | None:
    match = re.search(r'\b(19|20)\d{2}\b', title)
    if match:
        year = int(match.group())
        if 1990 <= year <= 2026:
            return year
    return None


def parse_price_pkr(price_text: str) -> tuple[float, float] | None:
    """Extract price from text like 'Rs 5,000' or 'PKR 5000-8000'."""
    cleaned = re.sub(r'[^\d,\-–]', ' ', price_text).strip()
    numbers = re.findall(r'[\d,]+', cleaned)
    values = [float(n.replace(',', '')) for n in numbers if n]

    if not values:
        return None
    if len(values) == 1:
        v = values[0]
        return (v * 0.8, v * 1.2)  # ±20% range for single price
    return (min(values), max(values))
