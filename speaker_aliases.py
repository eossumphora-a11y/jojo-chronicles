"""Speaker provenance for JoJo Chronicles Craig recordings.

Only the player-to-character cast is confirmed by the user. Discord aliases
are provisional/indirect until the user explicitly confirms them.
"""
from __future__ import annotations

from functools import lru_cache
import json
from pathlib import Path
import re

CAST_FILE = Path(__file__).parent / "docs" / "data" / "craig-speakers.json"

@lru_cache(maxsize=1)
def speaker_cast() -> dict:
    with CAST_FILE.open(encoding="utf-8") as file:
        data = json.load(file)
    return data

def resolve_speaker(label: str) -> dict | None:
    """Identify only known exact aliases; never invent unknown people."""
    label = str(label or "").lower()
    for track in speaker_cast().get("tracks", []):
        alias = str(track.get("alias", "")).lower()
        if not alias:
            continue
        # A filename may contain '-2-marialuisa9042' and Buzz may add
        # '_nuova' / '_originale' to the same track name.
        for match in re.finditer(re.escape(alias), label):
            before = label[match.start()-1] if match.start() else ""
            after = label[match.end()] if match.end() < len(label) else ""
            if before and (before.isalnum() or before == "_"):
                continue
            if after and (after.isalnum() or after == "-"):
                continue
            return track
    return None

def annotate_transcript_speakers(transcript: str) -> str:
    """Annotate transcript source while preserving all original track labels.

    Annotation describes speaker provenance, NOT necessarily in-character speech.
    """
    def replace(match):
        token = match.group(1)
        if "ruolo registrazione:" in token:
            return match.group(0)
        track = resolve_speaker(token)
        if not track:
            return match.group(0)
        if track.get("role") == "master":
            description = "ruolo registrazione: Master/narratore (da nickname e dialoghi)"
        elif track.get("characterId"):
            character = next((p["character"] for p in speaker_cast()["confirmedPlayerCast"]
                              if p.get("characterId") == track["characterId"]), track["characterId"])
            certainty = "abbinamento da confermare" if track.get("confidence") == "to_confirm" else "abbinamento indiretto"
            description = f"ruolo registrazione: voce del giocatore di {character}; {certainty}; potrebbe parlare fuori personaggio"
        else:
            return match.group(0)
        return f"[{token}; {description}]"
    return re.sub(r"\[([^\]\n]{2,120})\]", replace, transcript)

