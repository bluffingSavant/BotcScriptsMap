function getScriptsSimilarityHTML() {
  return `
    <section class="bg-white dark:bg-[#1f2937] grid grid-cols-6 gap-8 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
        <div id="TB" onclick="selectScript('TB')"
            class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover flex items-center justify-center">
            <img src="icons/scripts/TB_logo.webp"
                alt="Trouble Brewing"
                class="max-h-32 w-auto object-contain">
        </div>

        <div id="BMR" onclick="selectScript('BMR')"
            class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover flex items-center justify-center">
            <img src="icons/scripts/BMR_logo.webp"
                alt="Bad Moon Rising"
                class="max-h-32 w-auto object-contain">
        </div>

        <div id="SnV" onclick="selectScript('SnV')"
            class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover flex items-center justify-center">
            <img src="icons/scripts/SnV_logo.webp"
                alt="Sects and Violets"
                class="max-h-32 w-auto object-contain">
        </div>
        <div id="similarityDiv"
            class="col-span-3 bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
            
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold text-gray-700 dark:text-gray-200">
                    Scripts Similarity
                </h4>
                <i class="fas fa-ellipsis-h text-gray-300 dark:text-gray-600"></i>
            </div>

            <div class="chart-container">
                <canvas id="similarityChart" style="width:100%; height:100%;"></canvas>
            </div>
        </div>
    </section>
    <section class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
      <div id="displayAreaDiv" style="width: 100%; height: 600px;">
        <h3 id="textDiv" class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">This is placeholder text.</h3>
        <section class="grid grid-cols-4 sm:grid-cols-4 xl:grid-cols-4 gap-6">
            <div id="TFDiv" class="text-sm text-gray-400 dark:text-gray-500 font-medium rounded-2xl ">Townsfolk</div>
            <div id="OutsidersDiv" class="text-sm text-gray-400 dark:text-gray-500 font-medium rounded-2xl">Outsiders</div>
            <div id="MinionDiv" class="text-sm text-gray-400 dark:text-gray-500 font-medium rounded-2xl">Minions</div>
            <div id="DemonDiv" class="text-sm text-gray-400 dark:text-gray-500 font-medium rounded-2xl">Demons</div>
        </section>
      </div>
    </section>
  `;
}


function initScriptSimilarity(page) {
    if (!window.chartInstances) window.chartInstances = {};
    const TBdiv = document.getElementById('TB');
    if (!TBdiv) return;

}

function findSimilarScripts(script) {
    if (script=='TB') {
        scriptContent = scriptsData.filter(s => s.title == "Trouble Brewing")[0]
    }
    else if (script=='BMR') {
        scriptContent = scriptsData.filter(s => s.title == "Bad Moon Rising")[0]
    }
    else if (script == 'SnV'){
        scriptContent = scriptsData.filter(s => s.title == "Sects and Violets")[0]
    }
    script_a = scriptContent.characters;
    mostSimilar = []
    for (let index = 0; index < scriptsData.length; index++) {
        script_b = scriptsData[index].characters
        if (script_a === script_b) { continue; }
        IoU = jaccard(script_a,script_b)
        if (IoU > 0.9) {
            const [added, removed] = difference(script_a, script_b)
            mostSimilar.push([scriptsData[index], IoU.toFixed(2), added, removed, scriptContent])
        }
    }
    mostSimilar.sort(function(a,b){return a[1].localeCompare(b[1]);}).reverse();
    return mostSimilar
}

function selectScript(script) {
    updateText(script)
    updateSimilar(script)
}

function updateSimilar(script) {
    mostSimilar = findSimilarScripts(script)
    const similarityDiv = document.getElementById('similarityDiv')

    if (!similarityDiv.dataset.originalHeight) {
        similarityDiv.dataset.originalHeight = similarityDiv.offsetHeight + 'px';
    }

    similarityDiv.innerHTML = '';
    similarityDiv.style.maxHeight = similarityDiv.dataset.originalHeight;
    similarityDiv.style.overflowY = 'auto';

    mostSimilar.forEach(script => {
        const scriptItem = document.createElement("div")
        scriptItem.style.minWidth = '0';
        scriptItem.style.cursor = "pointer";
        scriptItem.style.border = "1px solid #ccc";
        scriptItem.style.padding = "2px 8px";
        scriptItem.style.borderRadius = "4px";
        str = getString(script)
        scriptItem.textContent = script[0].title + ' (' + script[1]*100 + '%) - ' + str;
        similarityDiv.appendChild(scriptItem);
        scriptItem.onclick = (e) => {
            e.stopPropagation();
            compareScripts(script[0], script[4], script[2], script[3])
        }
    })
}

function getString(script) {
    addString = ""
    removeString = ""
    console.log(script[2], script[3])
    if (script[2].length == 0) { addString = ""}
    else { addString = "Adds: " + script[2]}
    if (script[3].length == 0) { removeString = ""}
    else { removeString = " / Removes: " + script[3]}
    return addString + removeString
}

function updateText(script) {
    const displayAreaDiv = document.getElementById('textDiv')
    let scriptContent;
    if (script == 'TB') scriptContent = scriptsData.filter(s => s.title == "Trouble Brewing")[0]
    else if (script == 'BMR') scriptContent = scriptsData.filter(s => s.title == "Bad Moon Rising")[0]
    else if (script == 'SnV') scriptContent = scriptsData.filter(s => s.title == "Sects and Violets")[0]

    displayAreaDiv.textContent = script;
    renderCharacterList(scriptContent);
}

function compareScripts(newScript, baseScript, added, removed) {
    const displayAreaDiv = document.getElementById('textDiv')
    displayAreaDiv.textContent = baseScript.title + ' → ' + newScript.title;
    renderCharacterList(baseScript, added, removed);
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
    const teamDivs = ['TFDiv', 'OutsidersDiv', 'MinionDiv', 'DemonDiv'];
    teamDivs.forEach(id => {
        document.getElementById(id).innerHTML = '';
    });

    // Union des perso de base + perso ajoutés = liste complète à afficher
    const fullList = [...new Set([...baseScript.characters, ...(added || [])])];

    fullList.forEach(char => {
        const charTeam = allTokens.filter(c => c.id == char).map(c => c.team)[0];
        let div = null;
        if (charTeam == 'townsfolk') div = document.getElementById('TFDiv');
        else if (charTeam == 'outsider') div = document.getElementById('OutsidersDiv');
        else if (charTeam == 'minion') div = document.getElementById('MinionDiv');
        else if (charTeam == 'demon') div = document.getElementById('DemonDiv');
        if (!div) return;

        const isAdded = (added || []).includes(char);
        const isRemoved = (removed || []).includes(char);

        const charItem = document.createElement("div")
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
        }

        div.appendChild(charItem);
    });
}
