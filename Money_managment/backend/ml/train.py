import os
import joblib
import pandas as pd
from datasets import load_dataset
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

from taxonomy import map_to_project_taxonomy
from preprocess import clean_and_deduplicate

def train_model_1():
    print("Loading dataset from HuggingFace (streaming a sample of 50,000 rows for hackathon speed)...")
    
    # Load dataset with streaming/splitting to avoid memory overflow
    dataset = load_dataset("mitulshah/transaction-categorization", split="train", streaming=True)
    
    # Take first 50,000 rows for fast training
    data = []
    for i, row in enumerate(dataset):
        if i <= 50000:
            continue
        if i > 100000:  # Limit to 50,000 rows
            break
        data.append({
            "transaction_description": row["transaction_description"],
            "category": row["category"]
        })
    
    df = pd.DataFrame(data)
    print(f"Loaded {len(df)} rows successfully.")
    
    # Map external dataset categories to your 14-category project taxonomy
    df["mapped_category"] = df["category"].apply(map_to_project_taxonomy)
    
    # Normalize text and remove duplicates to prevent data leakage
    df_clean = clean_and_deduplicate(df, desc_col="transaction_description", label_col="mapped_category")
    
    X = df_clean["clean_text"]
    y = df_clean["mapped_category"]
    
    # 70% Train, 15% Validation, 15% Test split[cite: 2]
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp)
    
    print("Training TF-IDF + Logistic Regression pipeline...")
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=15000, sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42))
    ])
    pipeline.fit(X_train, y_train)
    
    print("--- Validation Report ---")
    val_preds = pipeline.predict(X_val)
    print(classification_report(y_val, val_preds, zero_division=0))
    
    os.makedirs("saved_models", exist_ok=True)
    joblib.dump(pipeline, "saved_models/model1_tfidf_logreg.joblib")
    print("Model successfully trained and saved to saved_models/model1_tfidf_logreg.joblib!")

if __name__ == "__main__":
    train_model_1()