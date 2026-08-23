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

# Nombre de pages récupérées en parallèle
PAGE_BATCH_SIZE = 2

# Timeout HTTP
TIMEOUT = 30

# Petite pause entre les requêtes
REQUEST_DELAY = 0.2


# ============================================================
# SESSION HTTP
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
# UTILITAIRES
# ============================================================

def request_json(url, params=None):
    """
    Effectue une requête HTTP et retourne le JSON.
    """

    response = session.get(
        url,
        params=params,
        timeout=TIMEOUT,
    )

    response.raise_for_status()

    return response.json()


# ============================================================
# RECUPERATION D'UNE PAGE DE SCRIPTS
# ============================================================

def get_page(page):
    """
    Equivalent Python de getPage() dans all_scripts.ts.

    Appelle :

        /api/scripts/?format=json&page=X
    """

    url = f"{API_BASE}/scripts/"

    params = {
        "format": "json",
        "page": page,
    }

    data = request_json(url, params=params)

    return {
        "count": data["count"],
        "results": data["results"],
        "next": data.get("next") is not None,
    }


# ============================================================
# METADATA D'UN SCRIPT
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

        if (
            item.get("id") == "_meta"
            and "name" in item
        ):
            return {
                "name": item["name"],
                "author": item.get("author", ""),
            }

    return None


def ids_from_contents(content):
    """
    Récupère les IDs des personnages présents dans un script.

    _meta est exclu.
    """

    return [
        item["id"].lower()
        for item in content
        if item.get("id") != "_meta"
        and "id" in item
    ]


# ============================================================
# RECUPERATION D'UN SCRIPT
# ============================================================

def get_script_response(script_id):
    """
    Equivalent Python de getScriptResp().

    Essaie d'abord :

        /api/scripts/{id}/?format=json

    puis, en cas de 404 :

        /api/scripts/{id}/json?format=json
    """

    # --------------------------------------------------------
    # Première méthode
    # --------------------------------------------------------

    url = f"{API_BASE}/scripts/{script_id}/"

    try:

        data = request_json(
            url,
            params={"format": "json"},
        )

        return data

    except requests.HTTPError as error:

        if error.response is None:
            raise

        if error.response.status_code != 404:
            raise

    # --------------------------------------------------------
    # Fallback pour certains anciens scripts
    # --------------------------------------------------------

    print(
        f"  -> fallback JSON endpoint pour script {script_id}"
    )

    url = f"{API_BASE}/scripts/{script_id}/json"

    data = request_json(
        url,
        params={"format": "json"},
    )

    return data


# ============================================================
# PARSING D'UN SCRIPT
# ============================================================

def parse_script(script_id, data):
    """
    Reproduit la logique de getScript() / parseScriptInstance()
    de botc-tools.

    Retourne les informations utiles du script.
    """

    # --------------------------------------------------------
    # Cas 1 :
    #
    # L'API retourne directement un tableau :
    #
    # [
    #   {"id": "washerwoman", ...},
    #   ...
    # ]
    # --------------------------------------------------------

    if isinstance(data, list):

        content = data

        meta = meta_from_contents(content)
        if meta is None:

            print(
                f"  !! Pas de _meta pour le script {script_id}"
            )

            return {
                "pk": int(script_id),
                "title": "",
                "author": "",
                "score": 0,
                "characters": ids_from_contents(content),
                "content": content,
            }

        return {
            "pk": int(script_id),
            "script_id": meta["script_id"],
            "version": meta["version"] ,
            "title": meta["name"],
            "author": meta["author"],
            "characters": ids_from_contents(content),
            "content": content,
        }

    # --------------------------------------------------------
    # Cas 2 :
    #
    # L'API retourne un objet ScriptInstanceResp
    # --------------------------------------------------------

    content = data.get("content", [])

    meta = meta_from_contents(content)

    if meta is None:

        meta = {
            "name": "",
            "author": "",
        }

    title = data.get("name") or meta["name"]
    author = data.get("author") or meta["author"]
    version = data.get("version") or meta["version"]
    script_id_original = data.get("script_id") or meta.get("script_id")

    return {
        "pk": data.get("pk", int(script_id)),
        "script_id_original": script_id_original,
        "version": version,
        "title": title,
        "author": author,
        "characters": ids_from_contents(content),
        "content": content,
        "version": data.get("version"),
    }


# ============================================================
# TELECHARGEMENT D'UN SCRIPT
# ============================================================

def download_script(script_id):
    """
    Télécharge un script individuel.
    """

    print(f"Téléchargement du script {script_id}...")

    try:

        data = get_script_response(script_id)

        script = parse_script(
            script_id,
            data,
        )

        return script

    except requests.HTTPError as error:

        print(
            f"  !! HTTP error pour {script_id}: "
            f"{error}"
        )

    except Exception as error:

        print(
            f"  !! Erreur pour {script_id}: "
            f"{error}"
        )

    return None


# ============================================================
# TELECHARGER TOUS LES SCRIPTS
# ============================================================

def download_all_scripts():

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # Première page
    # --------------------------------------------------------

    print("Récupération de la première page...")

    first_page = get_page(1)

    total_count = first_page["count"]

    first_results = first_page["results"]

    print(
        f"Nombre total de scripts annoncés : "
        f"{total_count}"
    )

    print(
        f"Scripts dans la première page : "
        f"{len(first_results)}"
    )

    # --------------------------------------------------------
    # Déterminer le nombre de pages
    # --------------------------------------------------------

    if len(first_results) == 0:

        print("Aucun script trouvé.")

        return

    num_pages = math.ceil(
        total_count / len(first_results)
    )

    print(
        f"Nombre de pages estimé : {num_pages}"
    )

    # --------------------------------------------------------
    # Récupérer les IDs
    # --------------------------------------------------------

    script_ids = []

    for item in first_results:
        script_ids.append(
            str(item["pk"])
        )
        

    # --------------------------------------------------------
    # Pages restantes
    # --------------------------------------------------------
    #pages_to_fetch = min(num_pages+1,3)
    for page in range(2, num_pages):

        print(
            f"\nRécupération page "
            f"{page}/{num_pages}..."
        )

        try:

            page_data = get_page(page)

            for item in page_data["results"]:

                script_ids.append(
                    str(item["pk"])
                )

            time.sleep(REQUEST_DELAY)

        except Exception as error:

            print(
                f"  !! Impossible de récupérer "
                f"la page {page}: {error}"
            )

    # --------------------------------------------------------
    # Supprimer les doublons
    # --------------------------------------------------------

    script_ids = list(
        dict.fromkeys(script_ids)
    )

    print(
        f"\n{len(script_ids)} scripts uniques trouvés."
    )

    # --------------------------------------------------------
    # Télécharger chaque script
    # --------------------------------------------------------

    all_scripts = []

    for index, script_id in enumerate(
        script_ids,
        start=1,
    ):

        print(
            f"\n[{index}/{len(script_ids)}]"
        )

        output_file = (
            OUTPUT_DIR / "individual_scripts" /
            f"{script_id}.json"
        )

        # Ne pas télécharger à nouveau
        # les fichiers déjà présents.

        if output_file.exists():

            print(
                f"  déjà présent : "
                f"{output_file}"
            )

            try:

                with open(
                    output_file,
                    "r",
                    encoding="utf-8",
                ) as f:

                    script = json.load(f)

                all_scripts.append(script)

            except Exception:

                print(
                    "  fichier invalide, "
                    "nouveau téléchargement"
                )

            else:

                continue
        script = download_script(
            script_id
        )

        if script is None:
            continue

        # ----------------------------------------------------
        # Sauvegarde du JSON brut/enrichi
        # ----------------------------------------------------

        with open(
            output_file,
            "w",
            encoding="utf-8",
        ) as f:

            json.dump(
                script,
                f,
                ensure_ascii=False,
                indent=2,
            )

        all_scripts.append(script)

        time.sleep(REQUEST_DELAY)

    # --------------------------------------------------------
    # Sauvegarder une base JSON globale
    # --------------------------------------------------------

    database_file = (
        OUTPUT_DIR /
        "all_scripts.json"
    )

    with open(
        database_file,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            all_scripts,
            f,
            ensure_ascii=False,
            indent=2,
        )

    print("\n" + "=" * 60)

    print(
        f"Téléchargement terminé."
    )

    print(
        f"Scripts téléchargés : "
        f"{len(all_scripts)}"
    )

    print(
        f"Dossier : "
        f"{OUTPUT_DIR.resolve()}"
    )

    print(
        f"Base globale : "
        f"{database_file.resolve()}"
    )

    print("=" * 60)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    download_all_scripts()