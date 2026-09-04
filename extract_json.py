import json
import math
import time
from pathlib import Path

import requests


# ============================================================
# CONFIGURATION
# ============================================================
API_BASE = "https://botcscripts.com/api"
OUTPUT_DIR = Path("botc_scripts")
STATE_FILE = OUTPUT_DIR / "extraction_state.json"
DATABASE_FILE = OUTPUT_DIR / "all_scripts.json"
# Small delay between page requests
REQUEST_DELAY = 0.2
# HTTP timeout
TIMEOUT = 30

# ============================================================
# HTTP SESSION
# ============================================================
session = requests.Session()
session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 "
        "(Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/139.0 Safari/537.36"
    ),
    "Accept": "application/json",
})


# ============================================================
# UTILITIES
# ============================================================
def request_json(url, params=None):
    """
    Perform an HTTP request and return the JSON response.
    """
    response = session.get(
        url,
        params=params,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def load_state():
    """Load the extraction state from disk."""
    if not STATE_FILE.exists():
        return {"last_extracted_id": 0}

    try:
        with STATE_FILE.open("r", encoding="utf-8") as f:
            state = json.load(f)

        if not isinstance(state, dict):
            print("Warning: Invalid extraction state. Resetting state.")
            return {"last_extracted_id": 0}

        return state

    except (json.JSONDecodeError, OSError) as exc:
        print(f"Warning: Could not load extraction state: {exc}")
        print("Resetting extraction state.")
        return {"last_extracted_id": 0}


def save_state(last_extracted_id):
    """
    Save the ID of the latest extracted script.
    """
    state = {"last_extracted_id": int(last_extracted_id)}
    with STATE_FILE.open("w", encoding="utf-8") as f:
        json.dump(state,f,ensure_ascii=False,indent=2)


# ============================================================
# FETCH A PAGE OF SCRIPTS
# ============================================================

def get_page(page):
    """
    Fetch one page of scripts.

    IMPORTANT:
    The API already returns the complete script information
    in `results`.

    Therefore, there is no need to make an additional request
    to /api/scripts/{id}/ for each script.
    """

    url = f"{API_BASE}/scripts/"

    params = {
        "format": "json",
        "page": page,
    }

    data = request_json(
        url,
        params=params,
    )

    return {
        "count": data["count"],
        "results": data["results"],
        "next": data.get("next") is not None,
    }


# ============================================================
# SCRIPT METADATA
# ============================================================
def meta_from_contents(content):
    """
    Cherche l'entrée :
        {
            "id": "_meta",
            "name": "...",
            "author": "..."
        }
    dans le contenu du script.
    """
    for item in content:
        if (item.get("id") == "_meta" and "name" in item
        ):
            return {
                "name": item["name"],
                "author": item.get("author", ""),
            }

    return None


def ids_from_contents(content):
    """
    Extract the character IDs present in a script.

    The _meta entry is excluded.
    """

    return [
        item["id"].lower()
        for item in content
        if item.get("id") != "_meta"
        and "id" in item
    ]


# ============================================================
# PARSE A SCRIPT
# ============================================================

def parse_script(script_id, data):
    """
    Transform the raw API response into the format used
    by the rest of the pipeline.

    `data` can be either:

    1. A list containing the script characters directly.

    or:

    2. An object containing a `content` field.
    """

    # --------------------------------------------------------
    # Case 1:
    # The API returns a list directly
    # --------------------------------------------------------

    if isinstance(data, list):
        content = data
        meta = meta_from_contents(content)
        if meta is None:
            print(f"  !! No _meta entry found for script {script_id}")
            return {
                "pk": int(script_id),
                "script_id_original": None,
                "version": None,
                "title": "",
                "author": "",
                "characters": ids_from_contents(content),
                "content": content,
            }
        return {
            "pk": int(script_id),
            "script_id_original": meta.get("script_id"),
            "version": meta.get("version"),
            "title": meta["name"],
            "author": meta["author"],
            "characters": ids_from_contents(content),
            "content": content,
        }

    # --------------------------------------------------------
    # Case 2:
    # The API returns a ScriptInstanceResp object
    # --------------------------------------------------------
    if not isinstance(data, dict):
        raise ValueError(
            f"Unexpected format for script {script_id}: "
            f"{type(data)}"
        )

    content = data.get("content", [])
    meta = meta_from_contents(content)
    if meta is None:
        meta = {
            "title": "",
            "author": "",
            "script_id": None,
            "version": None,
        }

    title = data.get("title") or meta["name"]
    author = data.get("author") or meta["author"]
    version = (
        data.get("version")
        or meta.get("version")
    )
    script_id_original = (
        data.get("script_id")
        or meta.get("script_id")
    )

    return {
        "pk": data.get("pk", int(script_id)),
        "script_id_original": script_id_original,
        "version": version,
        "title": title,
        "author": author,
        "characters": ids_from_contents(content),
        "content": content,
    }

# ============================================================
# LOAD EXISTING DATABASE
# ============================================================
def load_existing_database():
    """
    Load all_scripts.json if it exists.

    Returns a dictionary indexed by script PK in order
    to prevent duplicates.
    """
    if not DATABASE_FILE.exists():
        return {}

    try:
        with open(DATABASE_FILE,"r",encoding="utf-8") as f:
            scripts = json.load(f)

        database = {}
        for script in scripts:
            if "pk" not in script:
                continue
            database[int(script["pk"])] = script
        return database

    except Exception as error:
        print(f"!! Could not load {DATABASE_FILE}: {error}")
        return {}

# DOWNLOAD / UPDATE
def download_all_scripts():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    state = load_state() or {}
    last_extracted_id = state.get("last_extracted_id", 0)

    print(f"Last extracted script ID: {last_extracted_id}")

    existing_scripts = load_existing_database()

    first_page = get_page(1)
    total_count = first_page["count"]
    page_size = len(first_page["results"])

    if page_size == 0:
        print("No scripts found.")
        return

    num_pages = math.ceil(total_count / page_size)

    print(f"Total scripts available: {total_count}")
    print(f"Total pages: {num_pages}")

    new_scripts = []
    highest_new_id = last_extracted_id
    reached_existing_data = False

    def process_page(results):
        nonlocal highest_new_id, reached_existing_data

        for item in results:
            script_id = item.get("pk")
            if script_id is None:
                continue

            # Stop processing once we reach scripts already extracted.
            if script_id <= last_extracted_id:
                reached_existing_data = True
                continue

            try:
                script = parse_script(script_id, item)

                existing_scripts[script_id] = script
                new_scripts.append(script)

                highest_new_id = max(highest_new_id, script_id)

                print(f"Added script {script_id}: {script.get('title', 'Unknown')}")

            except Exception as exc:
                print(f"Failed to parse script {script_id}: {exc}")

    # Process first page directly.
    process_page(first_page["results"])

    # Fetch additional pages only while we have not reached old data.
    for page in range(2, num_pages + 1):

        if reached_existing_data:
            break

        print(f"Fetching page {page}/{num_pages}...")

        try:
            data = get_page(page)
        except Exception as exc:
            print(f"Failed to fetch page {page}: {exc}")
            break

        process_page(data["results"])

    # Save the complete database in a single file.
    sorted_scripts = [
        existing_scripts[script_id]
        for script_id in sorted(existing_scripts)
    ]

    with DATABASE_FILE.open("w", encoding="utf-8") as f:
        json.dump(sorted_scripts, f, ensure_ascii=False, indent=2)

    # Update extraction state only after all data has been saved.
    if highest_new_id > last_extracted_id:
        save_state(highest_new_id)

    print()
    print(f"New scripts added: {len(new_scripts)}")
    print(f"Total scripts in database: {len(sorted_scripts)}")
    print(f"Latest extracted ID: {highest_new_id}")
# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    download_all_scripts()