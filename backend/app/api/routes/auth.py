"""Rotas de Autenticação e Gestão de Alunos (LEMMAS Auth)."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_supabase_client, settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.consent import StudentConsent
from app.models.student import Student
from app.schemas.student import (
    StudentLogin,
    StudentRegister,
    StudentResponse,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["Autenticação"])
security_scheme = HTTPBearer(auto_error=False)

# Armazenamento em memória para desenvolvimento local resiliente (quando sem Supabase)
_STUDENTS_STORE: Dict[str, Student] = {}
_CONSENTS_STORE: Dict[str, StudentConsent] = {}


def get_current_student(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
) -> Student:
    """Dependência para autenticar requisições via Bearer Token."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    student_id = payload["sub"]
    student = _STUDENTS_STORE.get(student_id)

    if not student:
        # Se autenticado via JWT válido mas não em memória, recria entidade transitória
        return Student(
            id=student_id,
            email=payload.get("email", f"{student_id}@lemmas.app"),
            full_name=payload.get("name", "Estudante LEMMAS"),
            role=payload.get("role", "student"),
        )

    return student


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_student(payload: StudentRegister):
    """Cadastra um novo estudante na plataforma e registra o consentimento versionado."""
    # Verifica duplicidade
    for s in _STUDENTS_STORE.values():
        if s.email.lower() == payload.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado na plataforma",
            )

    student_id = str(uuid.uuid4())
    hashed_pwd = hash_password(payload.password)

    new_student = Student(
        id=student_id,
        email=payload.email,
        full_name=payload.full_name or payload.email.split("@")[0].capitalize(),
        hashed_password=hashed_pwd,
        role="student",
        cognitive_profile={
            "total_attempts": 0,
            "mastery_by_topic": {},
            "sm2_factors": {},
        },
    )
    _STUDENTS_STORE[student_id] = new_student

    # Registra o consentimento versionado obrigatório
    consent_id = str(uuid.uuid4())
    consent = StudentConsent(
        id=consent_id,
        student_id=student_id,
        consent_version="v1.0-2026",
        accepted=payload.consent_accepted,
    )
    _CONSENTS_STORE[consent_id] = consent

    # Gera token JWT de acesso
    token = create_access_token(
        data={
            "sub": student_id,
            "email": new_student.email,
            "name": new_student.full_name,
            "role": new_student.role,
        }
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        student=StudentResponse(
            id=new_student.id,
            email=new_student.email,
            full_name=new_student.full_name,
            role=new_student.role,
            cognitive_profile=new_student.cognitive_profile,
            created_at=new_student.created_at,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login_student(payload: StudentLogin):
    """Autentica o estudante e emite token de acesso."""
    found_student: Optional[Student] = None
    for s in _STUDENTS_STORE.values():
        if s.email.lower() == payload.email.lower():
            found_student = s
            break

    if not found_student or not verify_password(payload.password, found_student.hashed_password or ""):
        # Permite credenciais de teste para desenvolvimento se a lista estiver vazia
        if settings.DEBUG and payload.email == "demo@lemmas.app" and payload.password == "lemmas123":
            student_id = "student-demo-01"
            found_student = Student(
                id=student_id,
                email="demo@lemmas.app",
                full_name="Estudante Demo",
                role="student",
            )
            _STUDENTS_STORE[student_id] = found_student
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha incorretos",
            )

    token = create_access_token(
        data={
            "sub": found_student.id,
            "email": found_student.email,
            "name": found_student.full_name,
            "role": found_student.role,
        }
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        student=StudentResponse(
            id=found_student.id,
            email=found_student.email,
            full_name=found_student.full_name,
            role=found_student.role,
            cognitive_profile=found_student.cognitive_profile,
            created_at=found_student.created_at,
        ),
    )


@router.get("/me", response_model=StudentResponse)
def get_me(current_student: Student = Depends(get_current_student)):
    """Retorna os dados do estudante atualmente autenticado."""
    return StudentResponse(
        id=current_student.id,
        email=current_student.email,
        full_name=current_student.full_name,
        role=current_student.role,
        cognitive_profile=current_student.cognitive_profile,
        created_at=current_student.created_at,
    )
