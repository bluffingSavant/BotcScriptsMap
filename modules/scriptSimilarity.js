function getScriptsSimilarityHTML() {
  return `
    <section class="bg-white dark:bg-[#1f2937] grid grid-cols-3 sm:grid-cols-3 xl:grid-cols-3 gap-0 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
        <div id="TB" onclick="updateText('TB')" class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
            <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <img src="icons/scripts/TB_logo.webp" alt="Trouble Brewing"></div></div>
        </div>
        <div id="BMR" onclick="updateText('BMR')" class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
            <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <img src="icons/scripts/BMR_logo.webp" alt="Bad Moon Rising"></div></div>
        </div>
        <div id="SnV" onclick="updateText('SnV')"class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5 card-hover">
            <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <img src="icons/scripts/SnV_logo.webp" alt="Sects and Violets"></div></div>
        </div>
    </section>
    <section class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
      <div id="displayAreaDiv" style="width: 100%; height: 600px;">
        <h3 id="textDiv" class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">This is placeholder text.</h3>
        <section class="grid grid-cols-4 sm:grid-cols-4 xl:grid-cols-4 gap-6">
            <div id="TFDiv" class="text-sm text-gray-400 dark:text-gray-500 font-medium rounded-2xl border ">Townsfolk</div>
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

function updateText(script) {
    const displayAreaDiv = document.getElementById('textDiv')
    if (script=='TB') {
        scriptContent = scriptsData.filter(s => s.title == "Trouble Brewing")[0]
    }
    else if (script=='BMR') {
        scriptContent = scriptsData.filter(s => s.title == "Bad Moon Rising")[0]
    }
    else if (script == 'SnV'){
        scriptContent = scriptsData.filter(s => s.title == "Sects and Violets")[0]
    }
    displayAreaDiv.textContent = script;

    const teamDivs = ['TFDiv', 'OutsidersDiv', 'MinionDiv', 'DemonDiv'];
    teamDivs.forEach(id => {
        document.getElementById(id).innerHTML = '';
    });

    listOfChar = scriptContent.characters;
    listOfChar.forEach(char => {
        charTeam = allTokens.filter(c => c.id == char)
        charTeam = charTeam.map(char => char.team)[0];
        var div = null;
        if (charTeam == 'townsfolk') { div = document.getElementById('TFDiv')}
        else if (charTeam == 'outsider') { div = document.getElementById('OutsidersDiv')}
        else if (charTeam == 'minion') { div = document.getElementById('MinionDiv')}
        else if (charTeam == 'demon') { div = document.getElementById('DemonDiv')};
        const charItem = document.createElement("div")
        charItem.style.flex = '1';
        charItem.style.minWidth = '0';
        charItem.style.backgroundColor = TEAM_BG_COLORS[charTeam];
        charItem.style.border = `1px solid ${TEAM_COLORS[charTeam]}`;
        charItem.style.borderRadius = '10px';
        charItem.style.padding = '10px';
        charItem.textContent = char;
        div.appendChild(charItem);
    });
}