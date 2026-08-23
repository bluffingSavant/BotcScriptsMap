import json


def jaccard(set_a, set_b):
    if not set_a and not set_b:
        return 1.0
    return len(set_a & set_b) / len(set_a | set_b)

def difference(set_a, set_b):
    added = set_a-set_b if len(set_a-set_b) > 0 else None
    removed = set_b-set_a if len(set_b-set_a) > 0 else None
    return (added, removed)


with open("botc_scripts/all_scripts.json", "r", encoding="utf-8") as f:
    all_scripts = json.load(f)

base3 = [s for s in all_scripts if s["author"] == "The Pandemonium Institute"]
others = [s for s in all_scripts if s["author"] != "The Pandemonium Institute"]

base_char_sets = {s["title"]: set(s["characters"]) for s in base3}

# Identifier les doublons exacts (similarity == 1 avec un des scripts de base)
duplicates = []
for script in others:
    chars = set(script["characters"])
    for base_title, base_chars in base_char_sets.items():
        if jaccard(chars, base_chars) == 1.0:
            duplicates.append((script, base_title))
            break

        if jaccard(chars, base_chars) > 0.7:
            added, removed = difference(chars, base_chars)
            if added is not None and removed is not None:
                print(f"Based on {base_title} **\nCharacters added: {added}. Characters removed: {removed}")
            elif added is not None:
                print(f"Based on {base_title} **\nCharacters added: {added}. No characters removed.")
            elif removed is not None:
                print(f"Based on {base_title} **\nNo characters added. Characters removed: {removed}.")

print(f"{len(duplicates)} doublon(s) trouvé(s) :")
for script, base_title in duplicates:
    print(f"  - '{script['title']}' (pk={script['pk']}, author={script['author']}) == '{base_title}'")

# Supprimer ces entrées de all_scripts
duplicate_pks = {script["pk"] for script, _ in duplicates}
cleaned_scripts = [s for s in all_scripts if s["pk"] not in duplicate_pks]

print(f"\n{len(all_scripts)} scripts avant → {len(cleaned_scripts)} scripts après")

# Sauvegarder le JSON nettoyé
with open("botc_scripts/all_scripts.json", "w", encoding="utf-8") as f:
    json.dump(cleaned_scripts, f, ensure_ascii=False, indent=2)