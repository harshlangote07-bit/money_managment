import re
import pandas as pd

def normalize_narration(description: str, merchant_metadata: str = "") -> str:
    combined = f"{description or ''} {merchant_metadata or ''}".lower()
    combined = re.sub(r"[/\-_@.]", " ", combined)
    combined = re.sub(r"\b[a-z]*\d+[a-z\d]*\b", " ", combined)
    combined = re.sub(r"[^a-z\s]", " ", combined)
    return re.sub(r"\s+", " ", combined).strip()

def clean_and_deduplicate(df: pd.DataFrame, desc_col: str, label_col: str, merchant_col: str = None) -> pd.DataFrame:
    df = df.copy()
    merchants = df[merchant_col] if merchant_col and merchant_col in df.columns else ""
    df["clean_text"] = [
        normalize_narration(d, m) 
        for d, m in zip(df[desc_col], merchants if isinstance(merchants, pd.Series) else [""] * len(df))
    ]
    df = df[df["clean_text"].str.len() > 2]
    return df.drop_duplicates(subset=["clean_text"]).reset_index(drop=True)