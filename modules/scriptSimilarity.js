function getScriptsSimilarityHTML() {
  return `
    
    <section class="module-page home-intro-card bg-white dark:bg-[#1f2937] grid grid-cols-6 gap-8 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
        
        <div id="TB" onclick="selectScript('TB')"
            class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover flex items-center justify-center">
            <img src="icons/scripts/TB_logo.webp"
                alt="Trouble Brewing"
                class="max-h-64 w-auto object-contain">
        </div>

        <div id="BMR" onclick="selectScript('BMR')"
            class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover flex items-center justify-center">
            <img src="icons/scripts/BMR_logo.webp"
                alt="Bad Moon Rising"
                class="max-h-64 w-auto object-contain">
        </div>

        <div id="SnV" onclick="selectScript('SnV')"
            class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover flex items-center justify-center">
            <img src="icons/scripts/SnV_logo.webp"
                alt="Sects and Violets"
                class="max-h-64 w-auto object-contain">
        </div>
        <div id="similarityDiv" class="col-span-3 bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
            <label class="toggle">
                <input type="checkbox" id="btnTravellers" name="btnToggle" />
                <span class="slider bg-white">Include travellers</span>
            </label>
            <label class="toggle">
                <input type="checkbox" id="btnLoric" name="btnToggle" />
                <span class="slider bg-white">Include Lorics</span>
            </label><label class="toggle">
                <input type="checkbox" id="btnFabled" name="btnToggle" />
                <span class="slider bg-white">Include Fabled</span>
            </label>
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold text-gray-700 dark:text-gray-200">Scripts Similarity</h4>
                <p class="font-semibold text-gray-700 dark:text-gray-200">Value: <span id="demo"></span></p>
                <div class="slidecontainer">
                    <input type="range" min="1" max="100" value="90" class="slider" id="slider">
                </div>
            </div>
            
            <div class="chart-container chart-container--similarity" id="chartContainer">
                <canvas id="similarityChart" style="width:100%;"></canvas>
            </div>
            <div id="similarityList" class="flex flex-col gap-1" style="height: 250px; overflow-y: auto;"></div>
        </div>
    </section>
    <section class="module-page home-intro-card bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
      <div id="displayAreaDiv" style="width: 100%">
        <h3 id="textDiv" class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">Choose a base script to display similar scripts.</h3>
        <h3 id="bootleggerDiv" class="text-l font-bold text-gray-800 dark:text-gray-100 mt-1" style="margin-bottom:0.5cm;">Bootlegger: <span id="bootleggerText"></span></h3>
        <section class="grid grid-cols-7 sm:grid-cols-7 xl:grid-cols-7 gap-6">
            <div id="TFDiv" class="text-sm text-gray-700 dark:text-gray-500 font-medium rounded-2xl ">Townsfolk</div>
            <div id="OutsidersDiv" class="text-sm text-gray-700 dark:text-gray-500 font-medium rounded-2xl">Outsiders</div>
            <div id="MinionDiv" class="text-sm text-gray-700 dark:text-gray-500 font-medium rounded-2xl">Minions</div>
            <div id="DemonDiv" class="text-sm text-gray-700 dark:text-gray-500 font-medium rounded-2xl">Demons</div>
            <div id="TravellersDiv" class="text-sm text-gray-700 dark:text-gray-500 font-medium rounded-2xl">Outsiders</div>
            <div id="LoricDiv" class="text-sm text-gray-700 dark:text-gray-500 font-medium rounded-2xl">Minions</div>
            <div id="FabledDiv" class="text-sm text-gray-700 dark:text-gray-500 font-medium rounded-2xl">Demons</div>
        </section>
            </section>
      </div>
    </section>
    

  `;
}
let currentScript = null;

function selectScript(script) {
    currentScript = script;
    base3 = ['TB','SnV','BMR']
    base3.forEach(curr_script => {
        if (script===curr_script) {
            const selectedScript = document.getElementById(script)
            selectedScript.style.outline = 'rgb(236, 215, 18) solid 2px';
        }
        else {
            const selectedScript = document.getElementById(curr_script)
            selectedScript.style.outline = null;
        }
    });
    updateText(script)
    updateSimilar(script)
}

function initTeamToggles() {
    ['btnTravellers', 'btnLoric', 'btnFabled'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            if (currentScript) {
                updateSimilar(currentScript);
            }
        });
    });
}

function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

const debouncedUpdateSimilar = debounce(() => {
    if (currentScript) {
        updateSimilar(currentScript);
    }
}, 100);

function initSlider(){
    var slider = document.getElementById("slider");
    slider.value = 80;
    var valText = document.getElementById("demo");
    valText.textContent = slider.value + "%";
    slider.oninput = function() {
        valText.innerHTML = this.value + "%";
        debouncedUpdateSimilar();
    }
}

const BASE3 = {
    TB:  { title: "Trouble Brewing",   travellers: ["scapegoat", "gunslinger", "beggar", "bureaucrat", "thief"] },
    BMR: { title: "Bad Moon Rising",   travellers: ["butcher", "bonecollector", "harlot", "barista", "deviant"] },
    SnV: { title: "Sects and Violets", travellers: ["apprentice", "matron", "voudon", "judge", "bishop"] },
};

function getBaseScript(key) {
    const def = BASE3[key];
    const scriptContent = base3_json.find(x => x.title === def.title);
    if (!scriptContent._travellersAdded) {
        scriptContent.characters.push(...def.travellers);
        scriptContent._travellersAdded = true;
    }
    return scriptContent;
}

let teamByCharacterCache = null;
function getTeamByCharacter() {
    if (!teamByCharacterCache) {
        teamByCharacterCache = new Map();
        allTokens.forEach(({ id, team }) => {
            if (!teamByCharacterCache.has(id)) teamByCharacterCache.set(id, team);
        });
    }
    return teamByCharacterCache;
}

// Cache to improve performance when filtering sets based on excluded teams. The cache stores the last excluded set and the corresponding filtered sets.
let filteredCache = { key: null, sets: null };
function getFilteredSets(excluded) {
    const key = [...excluded].sort().join(",");
    if (filteredCache.key === key) return filteredCache.sets;
    const teamBy = getTeamByCharacter();
    const sets = scriptsData.map(s =>
        new Set(s.characters.filter(id => !excluded.has(teamBy.get(id))))
    );
    filteredCache = { key, sets };
    return sets;
}

function findSimilarScripts(key) {
    const scriptContent = getBaseScript(key);
    const excluded = getExcludedTeams();
    const teamBy = getTeamByCharacter();
    const setA = new Set(scriptContent.characters.filter(id => !excluded.has(teamBy.get(id))));
    const sets = getFilteredSets(excluded);
    const threshold = document.getElementById("slider").value / 100;
    const sizeA = setA.size;
    const result = [];

    for (let i = 0; i < sets.length; i++) {
        const setB = sets[i];
        const sizeB = setB.size;
        if (sizeA === 0 || sizeB === 0) continue;

        // Élagage : Jaccard <= min(|A|,|B|) / max(|A|,|B|)
        if (Math.min(sizeA, sizeB) / Math.max(sizeA, sizeB) <= threshold) continue;

        let inter = 0;
        for (const id of setA) if (setB.has(id)) inter++;
        const iou = inter / (sizeA + sizeB - inter);

        if (iou <= threshold) continue;
        const data = scriptsData[i];
        if (iou === 1 && !data.bootlegger) continue; // Avoid exact same script to appear.

        const added = [...setB].filter(x => !setA.has(x));
        const removed = [...setA].filter(x => !setB.has(x));
        if (data.bootlegger) added.push("bootlegger");
        result.push([data, iou, added, removed, scriptContent]); // [1] = Jaccard (nombre)
    }

    result.sort((x, y) => y[1] - x[1]);
    return result;
}

function updateSimilar(script) {
    const mostSimilar = findSimilarScripts(script);
    const chartContainer = document.getElementById('chartContainer');
    const listContainer = document.getElementById('similarityList');

    chartContainer.style.display = 'none';
    listContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    mostSimilar.forEach(script => {
        const scriptItem = document.createElement("div");
        scriptItem.style.minWidth = '0';
        scriptItem.style.cursor = "pointer";
        scriptItem.style.border = "1px solid #ccc";
        scriptItem.style.padding = "2px 8px";
        scriptItem.style.borderRadius = "4px";
        scriptItem.style.color = "var(--module-text-strong)";
        scriptItem.style.backgroundColor = "var(--module-raised-surface)";
        const str = getString(script);
        scriptItem.textContent = script[0].title + ' (' + Math.round(script[1] * 100) + '%) - ' + str;
        fragment.appendChild(scriptItem);
        scriptItem.onclick = (e) => {
            e.stopPropagation();
            compareScripts(script[0], script[4], script[2], script[3]);
        };
    });
    listContainer.appendChild(fragment);
}

function getString(script) {
    addString = ""
    removeString = ""
    if (script[2].length == 0) { addString = ""}
    else { addString = "Adds: " + script[2]}
    if (script[3].length == 0) { removeString = ""}
    else { removeString = " -- Removes: " + script[3]}
    return addString + removeString
}

function updateText(script) {
    const displayAreaDiv = document.getElementById('textDiv')
    const scriptContent = getBaseScript(script);

    displayAreaDiv.textContent = scriptContent.title;
    renderCharacterList(scriptContent);
}

function compareScripts(newScript, baseScript, added, removed) {
    const displayAreaDiv = document.getElementById('textDiv')
    displayAreaDiv.textContent = baseScript.title + ' → ' + newScript.title;
    
    const bootleggerText = document.getElementById('bootleggerText');
    bootleggerText.style.color = '#ca2525';
    if (newScript.bootlegger) {
        bootleggerText.textContent = newScript.bootlegger;
    } else {
        bootleggerText.textContent = "No bootlegger information available.";
    }
    renderCharacterList(baseScript, added, removed);
}

function getExcludedTeams() {
    const excluded = new Set();
    if (!document.getElementById('btnTravellers').checked) excluded.add('traveller');
    if (!document.getElementById('btnLoric').checked) excluded.add('loric');
    if (!document.getElementById('btnFabled').checked) excluded.add('fabled');
    return excluded;
}

function filterCharactersByTeam(characters, excludedTeams, teamByCharacter) {
    return characters.filter(charId => {
        return !excludedTeams.has(teamByCharacter.get(charId));
    });
}

function jaccard(script_a, script_b) {
    intersection = intersect(script_a, script_b)
    setUnion = union(script_a, script_b)
    return intersection.length / setUnion.length
}

function intersect(a, b) {
  var setA = new Set(a);
  var setB = new Set(b);
  var intersection = new Set([...setA].filter(x => setB.has(x)));
  return Array.from(intersection);
}

function union(a,b) {
    var union = [...new Set([...a, ...b])];
    return Array.from(union);
}

function difference(a, b) {
    const removed = a.filter(x => !b.includes(x));
    const added   = b.filter(x => !a.includes(x));
    return [added, removed];
}

function renderCharacterList(baseScript, added = [], removed = []) {
    const teamDivs = ['TFDiv', 'OutsidersDiv', 'MinionDiv', 'DemonDiv', 'TravellersDiv', 'LoricDiv', 'FabledDiv'];
    teamDivs.forEach(id => {
        document.getElementById(id).innerHTML = '';
    });

    const fullList = [...new Set([...baseScript.characters, ...(added || [])])];

    fullList.forEach(char => {
        const charTeam = allTokens.filter(c => c.id == char).map(c => c.team)[0];
        let div = null;
        if (charTeam == 'townsfolk') div = document.getElementById('TFDiv');
        else if (charTeam == 'outsider') div = document.getElementById('OutsidersDiv');
        else if (charTeam == 'minion') div = document.getElementById('MinionDiv');
        else if (charTeam == 'demon') div = document.getElementById('DemonDiv');
        else if (charTeam == 'traveller') div = document.getElementById('TravellersDiv');
        else if (charTeam == 'loric') div = document.getElementById('LoricDiv');
        else if (charTeam == 'fabled') div = document.getElementById('FabledDiv');
        if (!div) return;

        const isAdded = (added || []).includes(char);
        const isRemoved = (removed || []).includes(char);

        const charItem = document.createElement("div")
        charItem.style.color = 'var(--module-text-strong)'
        charItem.style.flex = '1';
        charItem.style.minWidth = '0';
        charItem.style.borderRadius = '10px';
        charItem.style.padding = '10px';
        charItem.textContent = char;

        if (isAdded) {
            charItem.style.backgroundColor = '#d1fae5';
            charItem.style.border = '2px solid #10b981';
            charItem.style.color = '#065f46';
            charItem.style.fontWeight = '600';
        } else if (isRemoved) {
            charItem.style.backgroundColor = '#f3f4f6';
            charItem.style.border = '1px dashed #9ca3af';
            charItem.style.color = '#6b7280';
            charItem.style.textDecoration = 'line-through';
            charItem.style.opacity = '0.7';
        } else {
            charItem.style.backgroundColor = TEAM_BG_COLORS[charTeam];
            charItem.style.border = `1px solid ${TEAM_COLORS[charTeam]}`;
            if (charTeam === "traveller") {
                charItem.style.backgroundImage = TRAVELLER_GRADIENT_BG;
                charItem.style.border = "2px solid transparent";
                charItem.style.borderImage = TRAVELLER_GRADIENT_BORDER;
            }
        }
        div.appendChild(charItem);
    });
}