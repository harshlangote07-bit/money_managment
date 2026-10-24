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
    print("Loading base dataset from HuggingFace...")
    ds = load_dataset("Karthik-Eswar/indian-transaction-categorization-synthetic")
    df_hf = pd.DataFrame(ds["train"])
    df_hf = df_hf.rename(columns={df_hf.columns[0]: "description", df_hf.columns[1]: "label"})

    # Merge with your rich local training data CSV if it exists
    extra_path = "extra_training_data.csv"
    if os.path.exists(extra_path):
        print(f"Merging with custom varied dataset from {extra_path}...")
        df_extra = pd.read_csv(extra_path)
        df_combined = pd.concat([df_hf[["description", "label"]], df_extra[["description", "label"]]], ignore_index=True)
    else:
        df_combined = df_hf[["description", "label"]]

    df_combined["category"] = df_combined["label"].apply(map_to_project_taxonomy)
    df_clean = clean_and_deduplicate(df_combined, desc_col="description", label_col="category")

    X = df_clean["clean_text"]
    y = df_clean["category"]

  # Changed: removed stratify=y to prevent errors with small custom classes
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=42)

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
    print("Model successfully retrained with varied data and saved!")

if __name__ == "__main__":
    train_model_1()