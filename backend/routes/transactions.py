
from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
import re
from collections import defaultdict

from ml.model1_service import TransactionClassifierService
from ml.taxonomy import TAXONOMY
from services.financial_calc import aggregate_for_financial_layer

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])
classifier_service = TransactionClassifierService()

REQUIRED_COLUMNS = {"date", "description", "amount"}
ESSENTIAL_CATEGORIES = {
    "groceries",
    "housing/utilities",
    "healthcare",
    "education",
    "insurance",
    "transport/fuel",
}

def normalize_merchant(description, merchant=""):
    text = f"{merchant} {description}".lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def detect_recurring_transactions(df):
    """
    Detect likely recurring transactions using merchant/description similarity,
    approximate amounts, and transaction dates.

    Three or more occurrences are required to flag a likely recurring pattern.
    """
    groups = defaultdict(list)

    for index, row in df.iterrows():
        category = row["final_category"]

        if category == "other/unknown":
            continue

        key = normalize_merchant(
            row["description"],
            row.get("merchant", "")
        )

        if key:
            groups[(key, category)].append({
                "index": index,
                "date": row["date"],
                "amount": float(row["amount"]),
            })

    recurring = []

    for (key, category), transactions in groups.items():
        if len(transactions) < 3:
            continue

        amounts = [t["amount"] for t in transactions]
        average_amount = sum(amounts) / len(amounts)

        if average_amount == 0:
            continue

        # Avoid grouping transactions with substantially different amounts.
        amount_spread = (
            max(amounts) - min(amounts)
        ) / abs(average_amount)

        if amount_spread > 0.20:
            continue

        dates = sorted(t["date"] for t in transactions)
        intervals = [
            (dates[i] - dates[i - 1]).days
            for i in range(1, len(dates))
        ]

        monthly_intervals = [
            gap for gap in intervals if 20 <= gap <= 40
        ]

        if len(monthly_intervals) >= 2:
            frequency = "monthly"
        elif len(transactions) >= 3:
            frequency = "repeated"
        else:
            continue

        recurring.append({
            "description_key": key,
            "category": category,
            "frequency": frequency,
            "occurrences": len(transactions),
            "average_amount": round(average_amount, 2),
            "transaction_indices": [
                t["index"] for t in transactions
            ],
        })

    return recurring


@router.post("/upload")
async def upload_statement(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Upload a CSV file."
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded CSV is empty."
        )

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not parse the CSV file."
        )

    df.columns = [
        str(column).strip().lower()
        for column in df.columns
    ]

    missing_columns = REQUIRED_COLUMNS - set(df.columns)

    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Required CSV columns are missing.",
                "missing_columns": sorted(missing_columns),
            }
        )

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="The CSV contains no transactions."
        )

    if "merchant" not in df.columns:
        df["merchant"] = ""

    original_count = len(df)

    df["date"] = pd.to_datetime(
        df["date"], errors="coerce"
    )

    df["amount"] = pd.to_numeric(
        df["amount"], errors="coerce"
    )

    df["description"] = (
        df["description"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    df["merchant"] = (
        df["merchant"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    valid_mask = (
        df["date"].notna()
        & df["amount"].notna()
        & (df["description"].str.len() > 0)
        & df["amount"].map(lambda value: pd.notna(value))
    )

    excluded_count = int((~valid_mask).sum())

    df = df.loc[valid_mask].copy()

    if df.empty:
        raise HTTPException(
            status_code=400,
            detail="No valid transactions remained after validation."
        )

    df["date"] = df["date"].dt.normalize()

    predictions = []

    for _, row in df.iterrows():
        prediction = classifier_service.predict_transaction(
            row["description"],
            row["merchant"]
        )

        category = prediction["predicted_category"]

        if category not in TAXONOMY:
            category = "other/unknown"

        predictions.append({
            "final_category": category,
            "is_uncertain": bool(
                prediction.get("is_uncertain", True)
            ),
            "confidence": prediction.get("confidence"),
            "needs_manual_review": bool(
                prediction.get("needs_manual_review", True)
            ),
            "classification_method": prediction.get(
                "classification_method", "ml_model"
            ),
        })

    prediction_df = pd.DataFrame(
        predictions, index=df.index
    )

    df = pd.concat([df, prediction_df], axis=1)

    # Keep F2's existing aggregation contract intact.
    financial_summary = aggregate_for_financial_layer(df)

    # Calculate monthly totals by category.
    df["year_month"] = df["date"].dt.to_period("M").astype(str)

    monthly_category_totals = {}

    for month, group in df.groupby("year_month"):
        monthly_category_totals[month] = {
            category: round(
                float(
                    group.loc[
                        group["final_category"] == category,
                        "amount"
                    ].sum()
                ),
                2,
            )
            for category in TAXONOMY
        }

    recurring_patterns = detect_recurring_transactions(df)

    recurring_indices = {
        index
        for pattern in recurring_patterns
        for index in pattern["transaction_indices"]
    }

    preview = []

    for index, row in df.iterrows():
        preview.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "description": row["description"],
            "merchant": row["merchant"],
            "amount": float(row["amount"]),
            "final_category": row["final_category"],
            "is_uncertain": bool(row["is_uncertain"]),
            "confidence": (
                float(row["confidence"])
                if pd.notna(row["confidence"])
                else None
            ),
            "needs_manual_review": bool(
                row["needs_manual_review"]
            ),
            "is_recurring": index in recurring_indices,
        })

    return {
        "filename": file.filename,
        "total_transactions": original_count,
        "valid_transactions": len(df),
        "excluded_count": excluded_count,
        "summary": {
            **financial_summary,
            "monthly_category_totals": monthly_category_totals,
        },
        "recurring_patterns": recurring_patterns,
        "preview": preview,
    }
