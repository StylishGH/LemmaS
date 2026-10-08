from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()

@router.post("/login")
def login(dados: dict):
    # Aqui vamos importar da src.auth e src.database
    return {"message": "Login successful"}

@router.post("/register")
def register(dados: dict):
    return {"message": "Registration successful"}
