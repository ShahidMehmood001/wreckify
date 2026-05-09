import re

# Keywords → canonical part name (used by PakWheels spider for title matching)
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

# gari.pk exact/partial part label → canonical name.
# gari.pk uses human-readable Pakistani market names — mapped here to our snake_case keys.
# Generic sided parts (Door, Fender, Mirror) map to _left as the canonical lookup key;
# the API layer expands this to cover both left and right at query time.
GARI_PK_PART_MAP = {
    # Bumpers
    "front bumper":        "bumper_front",
    "rear bumper":         "bumper_rear",
    "bumper":              "bumper_front",
    # Bonnet / Boot
    "bonnet":              "bonnet",
    "hood":                "bonnet",
    "boot lid":            "boot",
    "trunk":               "boot",
    "dicky":               "boot",
    "dickey":              "boot",
    # Lights
    "headlight":           "headlight",
    "head light":          "headlight",
    "headlamp":            "headlight",
    "front light":         "headlight",
    "tail light":          "taillight",
    "taillight":           "taillight",
    "taillamp":            "taillight",
    "rear light":          "taillight",
    "back light":          "taillight",
    # Windscreen
    "windscreen":          "windscreen",
    "windshield":          "windscreen",
    "front glass":         "windscreen",
    # Doors (generic — sides not distinguished on gari.pk)
    "front door":          "door_left",
    "rear door":           "door_left",
    "door":                "door_left",
    # Fenders / Mudguards
    "front fender":        "fender_left",
    "rear fender":         "fender_left",
    "fender":              "fender_left",
    "mudguard":            "fender_left",
    # Mirrors
    "side mirror":         "mirror_left",
    "mirror":              "mirror_left",
    # Roof
    "roof":                "roof",
    "roof panel":          "roof",
    "top panel":           "roof",
}

CAR_MAKES = [
    "suzuki", "toyota", "honda", "kia", "hyundai", "mg", "changan",
    "daihatsu", "nissan", "mitsubishi", "proton", "haval", "baic",
    "prince", "united", "regal", "faw",
]


def map_part_name(title: str) -> str | None:
    """Map a PakWheels listing title to a canonical part name."""
    title_lower = title.lower()
    for part_name, keywords in PART_KEYWORDS.items():
        for kw in keywords:
            if kw in title_lower:
                return part_name
    return None


def map_gari_pk_part_name(label: str) -> str | None:
    """Map a gari.pk part label to a canonical part name.

    Tries exact match first, then longest partial match to handle labels
    like 'Front Bumper Guard' correctly.
    """
    label_lower = label.strip().lower()
    # Exact match
    if label_lower in GARI_PK_PART_MAP:
        return GARI_PK_PART_MAP[label_lower]
    # Longest-key partial match — prevents 'bumper' matching before 'front bumper'
    best_key, best_canonical = None, None
    for key, canonical in GARI_PK_PART_MAP.items():
        if key in label_lower and (best_key is None or len(key) > len(best_key)):
            best_key, best_canonical = key, canonical
    return best_canonical


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
