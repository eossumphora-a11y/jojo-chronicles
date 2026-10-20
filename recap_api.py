"""Optional private local API for recap generation and wiki suggestions.

Ollama must be installed and running separately. No remote/cloud LLM calls.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from recap_engine import DEFAULT_MODEL, create_recap, extract_candidates

router = APIRouter(prefix="/api/recap", tags=["local-recap"])


class RecapRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=175000)
    title: str = Field(default="Sessione senza titolo", max_length=160)
    model: str = Field(default=DEFAULT_MODEL, max_length=90)


class ExtractRequest(BaseModel):
    summary: str = Field(min_length=1, max_length=65000)
    model: str = Field(default=DEFAULT_MODEL, max_length=90)


@router.post("/generate")
def generate(payload: RecapRequest):
    try:
        return create_recap(payload.transcript, payload.title, payload.model)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/extract")
def extract(payload: ExtractRequest):
    try:
        return {"entities": extract_candidates(payload.summary, payload.model), "review_required": True}
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
