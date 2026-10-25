from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.transactions import router as tx_router

app = FastAPI(title="Financial Decision Support System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tx_router)

@app.get("/")
def read_root():
    return {"status": "Active", "architecture": "3 Engines + 2 ML Models operational"}