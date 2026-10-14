import json

def count_occurences(json_raw):
    occurences = {"townsfolk":{},"outsider":{}, "minion":{}, 
                  "demon":{}, "loric": {}, "fabled": {}, "traveller": {}}
    with open(json_raw, 'r', encoding="utf-8") as json_file:
        scripts = json.load(json_file)
        for script in scripts:
            for character in script["characters"]:
                team = get_team(character)
                if character in occurences[team]:
                    occurences[team][character] +=1
                else:
                    occurences[team][character] = 0
    return occurences

def get_team(character):
    with open("official_data/roles.json", 'r', encoding="utf-8") as json_file:
        roles = json.load(json_file)
        for role in roles:
            if role["id"] == character:
                return role["team"]
    return "other"

o = count_occurences("botc_scripts/all_scripts.json")

print(o["demon"])