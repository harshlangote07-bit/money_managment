import os

structure = {
    "backend": [
        "main.py",
        "database.py",
        "schemas.py",
        "requirements.txt",
        "services/__init__.py",
        "services/financial_calc.py",
        "services/shared_projection.py",
        "ml/__init__.py",
        "ml/taxonomy.py",
        "ml/preprocess.py",
        "ml/model1_classifier.py",
        "ml/model1_service.py",
        "ml/model2_forecaster.py",
        "engines/__init__.py",
        "engines/engine1_path.py",
        "engines/engine2_stress.py",
        "engines/engine3_emergency.py",
        "routes/__init__.py",
        "routes/transactions.py"
    ],
    "frontend": [
        "package.json",
        "src/App.jsx",
        "src/main.jsx",
        "src/index.css"
    ]
}

# Create folders and files
for folder, files in structure.items():
    for file in files:
        path = os.path.join(folder, file)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write("") # Placeholder
        print(f"Created: {path}")

print("\nFolder structure created successfully!")