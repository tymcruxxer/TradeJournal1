from __future__ import annotations

import csv
import subprocess
from io import StringIO


def is_mt5_running(process_names: list[str]) -> bool:
    normalized_names = {name.lower() for name in process_names}

    try:
        import psutil  # type: ignore

        for proc in psutil.process_iter(["name"]):
            name = (proc.info.get("name") or "").lower()
            if name in normalized_names:
                return True

        return False
    except ImportError:
        return _is_mt5_running_with_tasklist(normalized_names)


def _is_mt5_running_with_tasklist(process_names: set[str]) -> bool:
    for process_name in process_names:
        try:
            result = subprocess.run(
                ["tasklist", "/FI", f"IMAGENAME eq {process_name}", "/FO", "CSV", "/NH"],
                capture_output=True,
                text=True,
                check=False,
            )
        except FileNotFoundError:
            return False

        if result.returncode != 0:
            continue

        rows = csv.reader(StringIO(result.stdout))
        for row in rows:
            if row and row[0].strip('"').lower() == process_name:
                return True

    return False
