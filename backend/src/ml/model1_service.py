import os
import joblib
import numpy as np
from src.ml.preprocess import normalize_narration

CONFIDENCE_THRESHOLD = 0.60

class TransactionClassifierService:
    def __init__(self, model_path: str = "saved_models/model1_tfidf_logreg.joblib"):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model artifact not found at {model_path}.")
        self.pipeline = joblib.load(model_path)
        self.classes = self.pipeline.named_steps["clf"].classes_

    def predict_transaction(self, description: str, merchant_metadata: str = "") -> dict:
        clean_text = normalize_narration(description, merchant_metadata)
        if not clean_text:
            return {"predicted_category": "other/unknown", "confidence": 0.0, "is_uncertain": True}

        probs = self.pipeline.predict_proba([clean_text])[0]
        max_idx = int(np.argmax(probs))
        confidence = float(probs[max_idx])
        predicted_cat = str(self.classes[max_idx])

        is_uncertain = confidence < CONFIDENCE_THRESHOLD
        final_category = "other/unknown" if confidence < 0.35 else predicted_cat

        return {
            "predicted_category": final_category,
            "confidence": round(confidence, 4),
            "is_uncertain": is_uncertain
        }