function getDashboardHTML() {
  return `
    </section>
    <!-- charts -->
    <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="bg-white dark:bg-[#1f2937] p-5 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 col-span-1 xl:col-span-2 card-hover">
        <div class="flex items-rr justify-between mb-3"><h4 class="font-semibold text-gray-700 dark:text-gray-200">Top 5 characters</h4></div>
        <div class="chart-container chart-container--dashboard">
            <canvas id="barChartDash" style="width:100%;height:100%;"></canvas>
        </div>
      </div>
    </section>
  `;
}

function getTop(array, nb_values){
  const newMap = Object.entries(array);
  const sortedMap = newMap.sort((item1, item2) => item2[1] - item1[1]);
  const topMap = sortedMap.slice(0,nb_values)
  const top = Object.fromEntries(topMap);
  return top;
}

let rolesData = null;
let scriptsDataCounts = null;
async function loadScriptsData() {
  if (scriptsDataCounts) return scriptsDataCounts;

  try {
    const scripts = scriptsData.map(item => item.characters);
    const counts = {};
    for (let index = 0; index < scripts.length; index++) {
      const list_of_char = scripts[index];
      for (let char_index = 0; char_index < list_of_char.length; char_index++) {
        const character = list_of_char[char_index];
        counts[character] = (counts[character] || 0) + 1;
      }
    }
    scriptsDataCounts = counts;
    return scriptsDataCounts;
  } catch (err) {
    console.error("Erreur lors du chargement de scriptsData:", err);
    scriptsDataCounts = {};
    return scriptsDataCounts;
  }
}

function updateDashboardStats() {
  const el = document.getElementById('statTotalScripts');
  if (el) {
    el.textContent = totalScripts.toLocaleString('fr-FR');
  }
}



function getTeam(character) {
  if (!rolesData) return "other";
  const role = rolesData.find(r => r.id === character);
  return role ? role.team : "other";
}

async function loadRolesData() {
  if (rolesData) return rolesData;

  try {
    const response = await fetch("official_data/roles.json");
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    rolesData = await response.json();
    return rolesData;
  } catch (err) {
    console.error("Erreur lors du chargement de rolesData:", err);
    rolesData = [];
    return rolesData;
  }
}


function initChartsForPage() {
  if (!window.chartInstances) window.chartInstances = {};
  const barCtx = document.getElementById('barChartDash');
  if (barCtx) {
    const topValues = getTop(scriptsDataCounts, 10);
    const teamColors = {
      townsfolk: '#93c5fd',
      outsider: '#1e3a8a',
      minion: '#fca5a5',
      demon: '#991b1b',
      fabled: '#cea624',
      loric: '#168a2f'
    };

    const labels = Object.keys(topValues);
    const backgroundColors = labels.map(character => {
      const team = getTeam(character);
      return teamColors[team] || teamColors.other;
    });

    const bar = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Occurences',
          data: Object.values(topValues),
          backgroundColor: backgroundColors,
          borderRadius: 8,
          barPercentage: 0.65
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
          x: { grid: { display: false } }
        }
      }
    });

    window.chartInstances.barDash = bar;
  }

  
  const doughCtx = document.getElementById('doughnutDash');
  if (doughCtx) {
    const dough = new Chart(doughCtx, {
      type: 'doughnut',
      data: {
        labels: ['Mobile', 'Desktop', 'Tablet'],
        datasets: [{
          data: [48, 35, 17],
          backgroundColor: ['#6366f1', '#22d3ee', '#fbbf24'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '75%'
      }
    });
    window.chartInstances.doughDash = dough;
  }

  const lineCtx = document.getElementById('lineDash');
  if (lineCtx) {
    const line = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'This week',
          data: [320, 450, 380, 520, 490, 680, 720],
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.05)',
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2
        }, {
          label: 'Last week',
          data: [280, 390, 340, 460, 430, 590, 640],
          borderColor: '#d1d5db',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 1.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
          x: { grid: { display: false } }
        }
      }
    });
    window.chartInstances.lineDash = line;
  }
  
}
