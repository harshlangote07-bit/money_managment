TAXONOMY = [
    "Income/salary", "groceries", "dining/food delivery", "transport/fuel",
    "housing/utilities", "healthcare", "education", "shopping",
    "entertainment/subscriptions", "loan repayment", "insurance",
    "own-account transfers", "savings/investments", "other/unknown"
]

LABEL_MAP = {
    "salary": "Income/salary", "income": "Income/salary", "groceries": "groceries",
    "supermarket": "groceries", "blinkit": "groceries", "zepto": "groceries",
    "food": "dining/food delivery", "swiggy": "dining/food delivery", "zomato": "dining/food delivery",
    "transport": "transport/fuel", "fuel": "transport/fuel", "uber": "transport/fuel",
    "rent": "housing/utilities", "electricity": "housing/utilities", "utilities": "housing/utilities",
    "medical": "healthcare", "pharmacy": "healthcare", "education": "education",
    "shopping": "shopping", "amazon": "shopping", "flipkart": "shopping",
    "netflix": "entertainment/subscriptions", "emi": "loan repayment", "loan": "loan repayment",
    "credit card payment": "loan repayment", "insurance": "insurance",
    "self transfer": "own-account transfers", "transfer": "own-account transfers",
    "investment": "savings/investments", "sip": "savings/investments"
}

def map_to_project_taxonomy(raw_label: str) -> str:
    clean = str(raw_label).strip().lower()
    if clean in LABEL_MAP:
        return LABEL_MAP[clean]
    for cat in TAXONOMY:
        if clean == cat.lower():
            return cat
    return "other/unknown"