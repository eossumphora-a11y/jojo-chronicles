"""JoJo Chronicles: local-only audio transcription server.

Run via python local_server.py. Dependencies in transcription/requirements.txt.
If optional packages are missing, static Master Studio still runs, without audio transcription.
No uploaded audio is committed or persisted by this process.
"""
from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import re
import tempfile
from functools import lru_cache, partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = int(os.environ.get("JOJO_PORT", "8765"))
ALLOWED = {f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}"}
AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".opus", ".webm", ".mp4", ".aac"}
MAX_FILE_BYTES = 160 * 1024 * 1024
MAX_TOTAL_BYTES = 400 * 1024 * 1024
MAX_TRACKS = 8

try:
    from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
    from fastapi.responses import JSONResponse
    from fastapi.staticfiles import StaticFiles
    import uvicorn
except ImportError:
    FastAPI = None


@lru_cache(maxsize=2)
def whisper_model(name: str):
    from faster_whisper import WhisperModel
    return WhisperModel(name, device="cpu", compute_type="int8")


def timestamp(seconds: float) -> str:
    whole = max(0, int(seconds))
    return f"{whole // 3600:02d}:{(whole // 60) % 60:02d}:{whole % 60:02d}" if whole >= 3600 else f"{whole // 60:02d}:{whole % 60:02d}"


def speaker_label(filename: str) -> str:
    # Craig's separate tracks can be associated with the names in filenames.
    # A single mixed track never receives a guessed speaker identity.
    stem = Path(filename.replace("\\", "/").split("/")[-1]).stem
    return re.sub(r"[^\w .-]", "_", stem, flags=re.UNICODE).strip()[:64] or "Traccia"


if FastAPI is not None:
    app = FastAPI(title="JoJo Chronicles Local Studio")
    from recap_api import router as recap_router
    app.include_router(recap_router)

    @app.middleware("http")
    async def check_local_host(request: Request, call_next):
        host = request.headers.get("host", "").lower()
        if host not in {f"localhost:{PORT}", f"127.0.0.1:{PORT}"}:
            return JSONResponse({"detail": "Host non autorizzato."}, status_code=403)
        origin = request.headers.get("origin")
        if request.method != "GET" and origin and origin.lower() not in ALLOWED:
            return JSONResponse({"detail": "Origine non autorizzata."}, status_code=403)
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/api/status")
    def api_status():
        return {
            "available": True,
            "whisper_installed": importlib.util.find_spec("faster_whisper") is not None,
            "max_tracks": MAX_TRACKS,
            "max_file_mb": MAX_FILE_BYTES // (1024 * 1024),
            "privacy": "Elaborazione sul computer locale; nessun audio inviato a GitHub.",
        }

    @app.post("/api/transcribe")
    def api_transcribe(
        files: list[UploadFile] = File(...),
        model: str = Form("small"),
        language: str = Form("auto"),
    ):
        if model not in {"base", "small", "medium"}:
            raise HTTPException(status_code=422, detail="Modello non valido.")
        if language not in {"auto", "it", "en"}:
            raise HTTPException(status_code=422, detail="Lingua non valida.")
        if not 1 <= len(files) <= MAX_TRACKS:
            raise HTTPException(status_code=422, detail=f"Carica da 1 a {MAX_TRACKS} tracce.")
        if importlib.util.find_spec("faster_whisper") is None:
            raise HTTPException(
                status_code=503,
                detail="Whisper non installato. Esegui: python -m pip install -r transcription/requirements.txt",
            )

        rows = []
        total_bytes = 0
        detected = []
        with tempfile.TemporaryDirectory(prefix="jojo-audio-") as temp:
            for index, upload in enumerate(files):
                name = upload.filename or f"traccia-{index + 1}"
                ext = Path(name).suffix.lower()
                if ext not in AUDIO_EXTENSIONS:
                    raise HTTPException(status_code=415, detail=f"Formato non supportato: {ext or '(senza estensione)'}")
                target = Path(temp) / f"track-{index:02d}{ext}"
                bytes_this_file = 0
                with target.open("wb") as output:
                    while True:
                        chunk = upload.file.read(1024 * 1024)
                        if not chunk:
                            break
                        bytes_this_file += len(chunk)
                        total_bytes += len(chunk)
                        if bytes_this_file > MAX_FILE_BYTES or total_bytes > MAX_TOTAL_BYTES:
                            raise HTTPException(status_code=413, detail="Audio troppo grande per il limite configurato.")
                        output.write(chunk)
                if not bytes_this_file:
                    raise HTTPException(status_code=422, detail=f"Il file '{name}' è vuoto.")
                label = speaker_label(name) if len(files) > 1 else None
                try:
                    segments, info = whisper_model(model).transcribe(
                        str(target),
                        language=None if language == "auto" else language,
                        beam_size=5,
                        vad_filter=True,
                        condition_on_previous_text=False,
                    )
                    for segment in segments:
                        text = segment.text.strip()
                        if text:
                            rows.append({
                                "start": round(float(segment.start), 2),
                                "end": round(float(segment.end), 2),
                                "speaker": label,
                                "text": text,
                                "track": index + 1,
                            })
                    detected.append({"file": name, "language": info.language})
                except Exception as exc:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Impossibile decodificare la traccia '{name}': {type(exc).__name__}.",
                    ) from exc
                finally:
                    upload.file.close()
        rows.sort(key=lambda item: (item["start"], item["track"]))
        transcript = "\n".join(
            f"{timestamp(row['start'])} | "
            + (f"[{row['speaker']}] " if row["speaker"] else "")
            + row["text"]
            for row in rows
        )
        return {
            "transcript": transcript,
            "segments": rows,
            "detected_languages": detected,
            "track_count": len(files),
            "speaker_policy": "Nomi derivati dai file per tracce separate; nessuna diarizzazione della traccia mista.",
        }

    # Only local server serves the Master Studio. GitHub Pages separately publishes docs/.
    app.mount("/", StaticFiles(directory=str(ROOT), html=True), name="static")


def main():
    print(f"JoJo Chronicles Master Studio: http://127.0.0.1:{PORT}/studio/")
    if FastAPI is None:
        print("Audio non abilitato: installa le dipendenze con:")
        print("  python -m pip install -r transcription/requirements.txt")
        handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
        ThreadingHTTPServer((HOST, PORT), handler).serve_forever()
    else:
        print("Audio locale disponibile (il primo utilizzo scarica il modello Whisper).")
        uvicorn.run(app, host=HOST, port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
