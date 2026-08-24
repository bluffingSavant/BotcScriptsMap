function getScriptsWebHTML() {
  return `
    <section class="bg-white dark:bg-[#1f2937] grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-2 gap-8 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
      <div id="scriptsWebDiv" style="height: 600px;"></div>
      <div class="flex flex-col justify-between" style="height: 600px;">
        <h4 class="font-semibold text-gray-700 dark:text-gray-200 items-center justify-center" id="combination"></h4>
        <div id="statsWindow" style="width: 100%; height: 100%; overflow-y: auto;">
        </div>
      </div>
    </section>
    <section class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 p-5">
      <div id="myList" style="width: 100%"></div>
    </section>
  `;
}

let scriptsData = null;
let scriptsByCharacter = {};

function buildScriptsByCharacter() {
  scriptsByCharacter = {};
  scriptsData.forEach(script => {
    script.characters.forEach(charId => {
      if (!scriptsByCharacter[charId]) scriptsByCharacter[charId] = [];
      scriptsByCharacter[charId].push(script);
    });
  });
}
async function getScriptsData() {
  if (scriptsData) return scriptsData;
  const response = await fetch("botc_scripts/all_scripts.json");
  if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
  const jsonData = await response.json();
  scriptsData = jsonData;
  totalScripts = scriptsData.length;
}


async function getLinks() {
  const counts = {};
  const scriptsOfPair = {};
  try {
    const scripts = scriptsData.map(item => {return [item.characters, item.pk]});

    for (let index = 0; index < scripts.length; index++) {
      const list_of_char = scripts[index][0];
      for (let i = 0; i < list_of_char.length; i++) {
        for (let j = i + 1; j < list_of_char.length; j++) {
          const character1 = list_of_char[i];
          const character2 = list_of_char[j];
          const pairKey = [character1, character2].sort().join('-');
          counts[pairKey] = (counts[pairKey] || 0) + 1;
          scriptsOfPair[pairKey] = scriptsOfPair[pairKey] || [];
          scriptsOfPair[pairKey].push(scripts[index][1]); // Store the index of the script where this pair appears
        }
      }
    }
    const newMap = Object.entries(counts);
    const sortedMap = newMap.sort((item1, item2) => item2[1] - item1[1]);
    allLinks = sortedMap;
    allScriptsOfPair = scriptsOfPair;
  } catch (err) {
    console.error("Error while loading links between characters:", err);
  }
}

async function getCharacters() {
  try {
    const roles = await fetch("official_data/roles.json")
      .then(response => response.json())
      .then(json => json.map(item => ({ id: item.id, team: item.team })));
    allTokens = roles;
  } catch (err) {
    console.error("Erreur lors du chargement de rolesData:", err);
    return [];
  }
}

// Génère une image SVG en data URI avec le texte courbé le long d'un cercle
function makeCurvedTextDataUri(text, diameter, opts = {}) {
  const {
    fontSize = Math.max(6, diameter * 0.14),
    color = "#1630c2",
    fontFamily = "sans-serif",
    radiusRatio = 0.35
  } = opts;

  const size = diameter;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * radiusRatio;
  const pathId = `textPath-${Math.random().toString(36).slice(2)}`;

  // Chemin qui démarre à gauche et va vers la droite en passant par le BAS
  // (sweep-flag = 1 pour aller dans le sens horaire par le bas)
  const d = `M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs><path id="${pathId}" d="${d}" /></defs>
      <text font-family="${fontFamily}" font-size="${fontSize}" fill="${color}">
        <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${text}</textPath>
      </text>
    </svg>
  `;

  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}

// ===== ÉTAT GLOBAL (cache + sélection courante) =====
let allLinks = [];
let scriptsOfPair = {};
let selectedCharacters = new Set();

const TEAM_COLORS = {
  townsfolk: '#93c5fd',
  outsider: '#1e3a8a',
  minion: '#fca5a5',
  demon: '#991b1b',  
  loric: '#35b90d',
  fabled: '#c2c50b',
  traveller: 'linear-gradient(to left, rgba(255,0,0,1) 50%, rgba(0,0,255,1) 50%)'
};
const TRAVELLER_GRADIENT_BG = "linear-gradient(to left, rgba(255,0,0,0.15) 50%, rgba(0,0,255,0.15) 50%)";
const TRAVELLER_GRADIENT_BORDER = "linear-gradient(to left, red 50%, blue 50%) 1";

const TEAM_BG_COLORS = {
  townsfolk: 'rgba(147, 197, 253, 0.15)',
  outsider: 'rgba(30, 58, 138, 0.15)',
  minion: 'rgba(252, 165, 165, 0.15)',
  demon: 'rgba(153, 27, 27, 0.15)',
  loric: '#1341054f',
  fabled: '#4b4d064d',
  traveller: 'linear-gradient(to left, rgba(255,0,0,0.2) 50%, rgba(0,0,255,0.2) 50%)'
};

const TEAM_LABELS = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsider',
  minion: 'Minion',
  demon: 'Demon',
  loric: 'Loric',
  fabled: 'Fabled',
  traveller: 'Traveller'
};

async function initScriptsWeb() {
  if (!window.chartInstances) window.chartInstances = {};
  getScriptsData();
  const div = document.getElementById('scriptsWebDiv');
  if (!div) return;

  const diagram = new go.Diagram("scriptsWebDiv", {
    "undoManager.isEnabled": true
  });
  diagram.layout = new go.ForceDirectedLayout({
    defaultElectricalCharge: 50, defaultSpringLength: 20
  });
  diagram.allowCopy = false;
  diagram.initialScale = 0.5
  diagram.nodeTemplate =
    new go.Node("Spot", { locationSpot: go.Spot.Center })
      .add(
        new go.Shape("Circle", { fill: "#FFFFF0F0", stroke: null, strokeWidth: 3 })
          .bind("desiredSize", "size", go.Size.parse)
      )
      .add(
        new go.Picture({
          source: "",
          imageStretch: go.GraphObject.Uniform,
          alignment: go.Spot.Bottom,
          alignmentFocus: go.Spot.Bottom
        })
          .bind("desiredSize", "size", (sizeStr) => {
            const sz = go.Size.parse(sizeStr);
            return new go.Size(sz.width * 0.8, sz.height * 0.8);
          })
          .bind("source", "key", (key) => `icons/${key}.svg`)
      )
      .add(
        new go.Picture({ alignment: go.Spot.Center, alignmentFocus: go.Spot.Center })
          .bind("desiredSize", "size", go.Size.parse)
          .bind("source", "", (data) => {
            const sz = go.Size.parse(data.size);
            const diameter = Math.max(sz.width, sz.height);
            return makeCurvedTextDataUri(data.key, diameter);
          })
      );

  diagram.linkTemplate =
    new go.Link({ layerName: "Background" })
      .add(new go.Shape({ strokeWidth: 2, stroke: "#ffffff" })
        .bind("strokeWidth", "thickness")
      )
      .add(new go.TextBlock({ segmentOffset: new go.Point(0, -10), stroke: "white" })
        .bind("text", "label")
      );

  selectedCharacters = new Set(allTokens.slice(0, 3).map(t => t.id));

  window.chartInstances.scriptsWeb = diagram;
  buildScriptsByCharacter();
  renderCharacterLists(diagram);
  renderScriptsList(diagram);
  updateGraph(diagram);

  function animateStars() {
    const spread = new go.Animation();
    spread.duration = 500;
    const center = diagram.documentBounds.center;
    diagram.nodes.each(n => spread.add(n, "position", center, n.position));
    spread.start();
  }

  diagram.addDiagramListener("InitialLayoutCompleted", animateStars);

  window.redoLayout = () => {
    const am = diagram.animationManager;
    const center = diagram.documentBounds.center;
    am.isEnabled = false;
    diagram.commit(d => {
      d.nodes.each(n => n.position = center);
      d.layoutDiagram(true);
    });
    am.isEnabled = true;
    animateStars();
    diagram.zoomToFit();
  };

  diagram.div.style.backgroundColor = "#04092e";
}

function applyToggleStyle(item, team) {
  const isSelected = selectedCharacters.has(item.dataset.key);
  item.style.backgroundColor = isSelected ? TEAM_COLORS[team] : "";
  if (team === "traveller") { 
    item.style.backgroundImage = isSelected ? TEAM_COLORS[team] : "";
  }
}

// ===== Reconstruit le modèle GoJS à partir de selectedCharacters =====
function updateGraph(diagram) {
  const keys = allTokens
    .filter(character => selectedCharacters.has(character.id))
    .map(character => ({ key: character.id, size: "150 150" }));
  const links = allLinks
    .filter(([pair]) => {
      const [ch1, ch2] = pair.split('-');
      return selectedCharacters.has(ch1) && selectedCharacters.has(ch2);
    })
    .map(([pair, count]) => {
      const [ch1, ch2] = pair.split('-');
      return { from: ch1, to: ch2, thickness: 8, label: count };
    });
  diagram.model = new go.GraphLinksModel(keys, links);
}


function renderCharacterLists(diagram) {
  const listDiv = document.getElementById("myList");
  listDiv.innerHTML = '';
  listDiv.style.display = 'flex';
  listDiv.style.gap = '16px';
  listDiv.style.alignItems = 'flex-start';
  const teams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'loric', 'fabled'];

  teams.forEach(team => {
    const column = document.createElement('div');
    column.style.flex = '1';
    column.style.minWidth = '0';
    column.style.height = "400px";
    column.style.overflowY ="auto";
    column.style.backgroundColor = TEAM_BG_COLORS[team];
    column.style.border = `1px solid ${TEAM_COLORS[team]}`;
    if (team === "traveller") { 
      column.style.backgroundImage = TEAM_BG_COLORS[team];
    }
    column.style.borderRadius = '10px';
    column.style.padding = '10px';

    const heading = document.createElement('h5');
    heading.textContent = TEAM_LABELS[team];
    heading.style.textAlign = "center";
    if (team === "traveller") {
      heading.textContent = '';
      const mid = Math.floor(TEAM_LABELS[team].length / 2);
      const firstHalf = document.createElement('span');
      firstHalf.textContent = TEAM_LABELS[team].slice(0, mid);
      firstHalf.style.color = 'blue';

      const secondHalf = document.createElement('span');
      secondHalf.textContent = TEAM_LABELS[team].slice(mid);
      secondHalf.style.color = 'red';

      heading.appendChild(firstHalf);
      heading.appendChild(secondHalf);
    }
    heading.style.color = TEAM_COLORS[team];
    heading.style.fontWeight = 'bold';
    heading.style.marginBottom = '6px';
    column.appendChild(heading);

    const charactersInTeam = allTokens.filter(c => c.team === team)
                                      .sort((a, b) => a.id.localeCompare(b.id));;
    charactersInTeam.forEach(character => {
      const item = document.createElement("div");
      item.style.color = "#fff"
      item.textContent = character.id;
      item.style.textAlign = "center";
      item.dataset.key = character.id;
      item.style.padding = "8px";
      item.style.cursor = "pointer";
      item.style.borderRadius = "6px";
      item.style.marginBottom = "4px";
      item.style.userSelect = "none";
      applyToggleStyle(item, team);

      item.onclick = () => {
        if (selectedCharacters.has(character.id)) {
          selectedCharacters.delete(character.id);
        } else {
          selectedCharacters.add(character.id);
        }
        applyToggleStyle(item, team);
        updateGraph(diagram);
        updateScriptsList();
      };

      column.appendChild(item);
    });

    listDiv.appendChild(column);
  });

  diagram.addDiagramListener("ChangedSelection", () => {
    const selectedNodeKeys = new Set();
    diagram.selection.each(part => {
      if (part instanceof go.Node) selectedNodeKeys.add(part.data.key);
    });
  });
}

function renderScriptsList(diagram) {
  const statsDiv = document.getElementById("statsWindow");
  if (!statsDiv) return;

  statsDiv.style.display = 'flex';
  statsDiv.style.gap = '16px';
  statsDiv.style.alignItems = 'flex-start';

  // Ce listener n'est attaché qu'une seule fois
  diagram.addDiagramListener("ChangedSelection", () => {
    const selectedNodeKeys = new Set();
    diagram.selection.each(part => {
      if (part instanceof go.Node) selectedNodeKeys.add(part.data.key);
    });

    statsDiv.querySelectorAll('[data-key]').forEach(child => {
      child.style.outline = selectedNodeKeys.has(child.dataset.key)
        ? "2px solid orange"
        : "none";
    });
  });

  updateScriptsList();
}

function scriptsContainingAll(charIds) {
  if (charIds.length === 0) return [];
  const sets = charIds.map(c => scriptsByCharacter[c] || []);
  const [first, ...rest] = sets;
  return first.filter(script =>
    rest.every(set => set.some(s => s.script_id_original === script.script_id_original))
  );
}

function updateScriptsList() {
  const statsDiv = document.getElementById("statsWindow");
  if (!statsDiv) return;
  statsDiv.innerHTML = '';
  
  const heading = document.getElementById('combination');
  heading.style.textAlign = "center";
  const chars = [...selectedCharacters];
  if (chars.length < 2) {
    heading.textContent = 'Please select at least 2 characters.';
    return;
  }

  const scripts = scriptsContainingAll(chars);
  if (scripts.length === 0) {
    heading.textContent = 'No available script with these characters together.';
    heading.style.fontWeight = 'bold';
    heading.style.marginBottom = '6px';
    heading.style.color = "#fff";
    heading.style.cursor = 'default';
    return;
  }
  const groupName = [...chars].sort().join(' + ');

  const column = document.createElement('div');
  column.style.flex = '1';
  column.style.minWidth = '0';
  column.style.borderRadius = '10px';
  column.style.padding = '10px';
  column.style.border = '1px solid #ddd';

  heading.textContent = groupName;
  heading.style.fontWeight = 'bold';
  heading.style.marginBottom = '6px';
  heading.style.color = "#fff"
  heading.style.userSelect = 'none';

  const scriptsContainer = document.createElement('div');

  scripts.forEach(script => {
    const item = document.createElement("div");
    item.style.display = "grid";
    item.style.gridTemplateColumns = "1fr auto";
    item.style.alignItems = "center";
    item.style.padding = "8px";
    item.style.color = "#fff"
    item.style.borderRadius = "6px";
    item.style.marginBottom = "4px";
    item.style.userSelect = "none";
    item.dataset.key = script.id;

    const textGroup = document.createElement("div");
    textGroup.style.display = "grid";
    textGroup.style.gridTemplateColumns = "400px 1fr";
    textGroup.style.alignItems = "baseline";
    textGroup.style.gap = "8px";

    const label = document.createElement("span");
    const author = document.createElement("span");
    label.textContent = script.title;
    label.style.fontWeight = "bold";
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    label.style.whiteSpace = "nowrap";
    author.textContent = "by " + script.author;

    textGroup.appendChild(label);
    textGroup.appendChild(author);
    item.appendChild(textGroup);

    const openBtn = document.createElement("button");
    openBtn.textContent = "open";
    openBtn.style.marginLeft = "8px";
    openBtn.style.padding = "2px 8px";
    openBtn.style.fontSize = "12px";
    openBtn.style.color = "#000"
    openBtn.style.borderRadius = "4px";
    openBtn.style.border = "1px solid #ccc";
    openBtn.style.cursor = "pointer";
    openBtn.style.background = "#fff";
    openBtn.onclick = (e) => {
      e.stopPropagation();
      const url = `https://www.botcscripts.com/script/${script.script_id_original}/${script.version}`;
      window.open(url, "_blank");
    };
    item.appendChild(openBtn);

    scriptsContainer.appendChild(item);
    });

  column.appendChild(scriptsContainer);
  statsDiv.appendChild(column);
}

