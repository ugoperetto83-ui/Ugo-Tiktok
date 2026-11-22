#!/usr/bin/env python3
"""
Voix off procédurale avec edge-tts.

    npm run voice                # ou : .venv/bin/python scripts/generate_voice.py [--force]

1. Lit les scènes depuis scripts/video-data.ts (via scripts/voice-input.ts, source de vérité unique).
2. Génère un MP3 par scène dans public/voice/<id>.mp3
   (fr-FR-RemyMultilingualNeural à +12 %, repli sur fr-FR-HenriNeural).
3. Mesure la durée EXACTE de chaque fichier et récupère les horodatages mot par mot (WordBoundary).
4. Écrit scripts/voice-manifest.json, lu par Remotion pour caler la durée de chaque scène
   et les sous-titres sur la voix.

Un cache (hash texte + voix + débit) évite de régénérer les scènes inchangées.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "scripts" / "voice-manifest.json"
TICKS_PER_SECOND = 10_000_000  # edge-tts exprime offset/durée en unités de 100 ns


def load_input() -> dict:
    """Exporte les scènes depuis le TypeScript (pas de duplication des données)."""
    tsx = ROOT / "node_modules" / ".bin" / ("tsx.cmd" if os.name == "nt" else "tsx")
    out = subprocess.run(
        [str(tsx), str(ROOT / "scripts" / "voice-input.ts")],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(out.stdout)


def cache_key(text: str, voice: str, rate: str) -> str:
    return hashlib.sha1(f"{voice}|{rate}|{text}".encode()).hexdigest()[:16]


async def synthesize(text: str, voice: str, rate: str, dest: Path) -> list[dict]:
    """Génère le MP3 et retourne les mots horodatés (secondes)."""
    kwargs = {"rate": rate, "boundary": "WordBoundary"}
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        kwargs["proxy"] = proxy
    communicate = edge_tts.Communicate(text, voice, **kwargs)
    words: list[dict] = []
    tmp = dest.with_suffix(".part")
    with tmp.open("wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / TICKS_PER_SECOND
                words.append(
                    {
                        "text": chunk["text"].strip(),
                        "start": round(start, 4),
                        "end": round(start + chunk["duration"] / TICKS_PER_SECOND, 4),
                    }
                )
    if tmp.stat().st_size == 0:
        tmp.unlink()
        raise RuntimeError(f"Aucun audio reçu pour la voix {voice}")
    tmp.replace(dest)
    return words


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--force", action="store_true", help="régénère toutes les scènes (ignore le cache)")
    args = parser.parse_args()

    data = load_input()
    cfg = data["voice"]
    out_dir = ROOT / "public" / cfg["dir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    previous = {}
    if MANIFEST.exists() and not args.force:
        previous = json.loads(MANIFEST.read_text(encoding="utf-8")).get("scenes", {})

    attempts = [(cfg["name"], cfg["rate"]), (cfg["fallbackName"], cfg["fallbackRate"])]
    scenes_out: dict[str, dict] = {}

    for scene in data["scenes"]:
        sid, text = scene["id"], scene["text"]
        dest = out_dir / f"{sid}.mp3"
        prev = previous.get(sid)
        key_primary = cache_key(text, *attempts[0])
        if prev and dest.exists() and prev.get("key") == key_primary:
            scenes_out[sid] = prev
            print(f"  = {sid:<14} {prev['duration']:.2f} s (cache)")
            continue

        last_error: Exception | None = None
        for voice, rate in attempts:
            try:
                words = await synthesize(text, voice, rate, dest)
                break
            except Exception as err:  # réseau, voix indisponible…
                last_error = err
                print(f"  ! {sid}: {voice} a échoué ({err}), essai suivant…", file=sys.stderr)
        else:
            raise SystemExit(f"Impossible de générer la voix pour « {sid} » : {last_error}")

        duration = MP3(dest).info.length  # durée exacte du fichier
        scenes_out[sid] = {
            "file": f"{cfg['dir']}/{sid}.mp3",
            "voice": voice,
            "rate": rate,
            "text": text,
            "key": key_primary if voice == attempts[0][0] else cache_key(text, voice, rate),
            "duration": round(duration, 4),
            "words": words,
        }
        print(f"  ✔ {sid:<14} {duration:.2f} s · {len(words)} mots · {voice} {rate}")

    MANIFEST.write_text(
        json.dumps({"generatedWith": f"edge-tts {edge_tts.__version__}", "scenes": scenes_out}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    total = sum(s["duration"] for s in scenes_out.values())
    print(f"✔ Manifest → {MANIFEST.relative_to(ROOT)} · voix totale {total:.2f} s")


if __name__ == "__main__":
    asyncio.run(main())
