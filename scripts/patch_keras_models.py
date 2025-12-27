#!/usr/bin/env python3
"""
Patch legacy `.keras` archives for Keras 3 / TF 2.20 compatibility.

Fixes applied (idempotent):
- Top-level module path: `keras.src.engine.functional` → `keras.src.models.functional`
- Remove deprecated `time_major` from serialized LSTM configs
"""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path


REQUIRED_MEMBERS = {"metadata.json", "config.json", "model.weights.h5"}


def _strip_time_major(obj) -> bool:
    changed = False
    if isinstance(obj, dict):
        if "time_major" in obj:
            obj.pop("time_major", None)
            changed = True
        for value in obj.values():
            changed = _strip_time_major(value) or changed
    elif isinstance(obj, list):
        for value in obj:
            changed = _strip_time_major(value) or changed
    return changed


def patch_config(config: dict) -> bool:
    changed = False

    if config.get("class_name") == "Functional" and config.get("module") == "keras.src.engine.functional":
        config["module"] = "keras.src.models.functional"
        changed = True

    changed = _strip_time_major(config) or changed
    return changed


def patch_keras_archive(path: Path) -> bool:
    with zipfile.ZipFile(path, "r") as archive:
        members = set(archive.namelist())
        missing = REQUIRED_MEMBERS - members
        if missing:
            raise ValueError(f"{path} is missing required members: {sorted(missing)}")

        config = json.loads(archive.read("config.json"))
        changed = patch_config(config)
        if not changed:
            return False

        metadata_bytes = archive.read("metadata.json")
        weights_bytes = archive.read("model.weights.h5")

    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with zipfile.ZipFile(tmp_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("metadata.json", metadata_bytes)
        archive.writestr("config.json", json.dumps(config, separators=(",", ":")))
        archive.writestr("model.weights.h5", weights_bytes)

    tmp_path.replace(path)
    return True


def iter_default_models(project_root: Path):
    models_dir = project_root / "ai_models"
    if not models_dir.exists():
        return []
    return sorted(models_dir.rglob("*.keras"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Patch legacy .keras archives for Keras 3 compatibility.")
    parser.add_argument("paths", nargs="*", help="Paths to .keras files (default: scan ai_models/)")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent

    paths = [Path(p).expanduser() for p in args.paths] if args.paths else iter_default_models(project_root)
    paths = [p.resolve() for p in paths]

    if not paths:
        print("No .keras files found.")
        return 0

    changed_any = False
    for path in paths:
        if path.suffix != ".keras":
            continue
        try:
            changed = patch_keras_archive(path)
        except Exception as exc:
            print(f"ERROR {path}: {exc}")
            continue

        if changed:
            changed_any = True
            print(f"patched {path}")
        else:
            print(f"ok {path}")

    return 0 if changed_any else 0


if __name__ == "__main__":
    raise SystemExit(main())

