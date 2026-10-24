import os
import json
import joblib
import numpy as np
from datetime import datetime
from ml.preprocess import normalize_narration

CONFIDENCE_THRESHOLD = 0.60
CORRECTIONS_STORE = "saved_models/user_corrected_labels.jsonl"

class TransactionClassifierService:
    def __init__(self, model_path: str = "saved_models/model1_tfidf_logreg.joblib"):
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Trained model artifact not found at {model_path}. Run training first using python ml/train.py"
            )
        self.pipeline = joblib.load(model_path)
        self.classes = self.pipeline.named_steps["clf"].classes_

    def predict_transaction(self, description: str, merchant_metadata: str = "") -> dict:
        clean_text = normalize_narration(description, merchant_metadata)
        if not clean_text:
            return {
                "raw_description": description,
                "predicted_category": "other/unknown",
                "confidence": 0.0,
                "is_uncertain": True,
                "needs_manual_review": True
            }

        probs = self.pipeline.predict_proba([clean_text])[0]
        max_idx = int(np.argmax(probs))
        confidence = float(probs[max_idx])
        predicted_cat = str(self.classes[max_idx])

        is_uncertain = confidence < CONFIDENCE_THRESHOLD
        final_category = "other/unknown" if confidence < 0.35 else predicted_cat

        return {
            "raw_description": description,
            "merchant_metadata": merchant_metadata,
            "predicted_category": final_category,
            "candidate_category": predicted_cat,
            "confidence": round(confidence, 4),
            "is_uncertain": is_uncertain,
            "needs_manual_review": is_uncertain or (final_category == "other/unknown")
        }

    def record_manual_correction(
        self,
        description: str,
        merchant_metadata: str,
        corrected_category: str,
        user_consent_for_retraining: bool
    ) -> dict:
        retained = False
        if user_consent_for_retraining:
            os.makedirs(os.path.dirname(CORRECTIONS_STORE), exist_ok=True)
            entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "description": description,
                "merchant_metadata": merchant_metadata,
                "clean_text": normalize_narration(description, merchant_metadata),
                "corrected_category": corrected_category,
            }
            with open(CORRECTIONS_STORE, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
            retained = True

        return {
            "applied_category": corrected_category,
            "retained_for_retraining": retained
        }