// ===== STATE =====
let currentPage = 'scriptsWeb';
let darkMode = localStorage.getItem('darkMode') === 'true' || false;
let chartsInitialized = {};
// ===== DARK MODE =====
function applyDarkMode() {
  if (darkMode) {
    document.documentElement.classList.add('dark');
    document.getElementById('darkIcon').className = 'fas fa-sun text-lg';
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('darkIcon').className = 'fas fa-moon text-lg';
  }
  localStorage.setItem('darkMode', darkMode);
}

function toggleDark() {
  darkMode = !darkMode;
  applyDarkMode();
}

// ===== SEARCH =====
function openSearch() {
  document.getElementById('searchOverlay').classList.remove('hidden');
  document.getElementById('searchInput').focus();
}

function closeSearch(e) {
  if (e && e.target !== e.currentTarget && !e.target.closest('#searchOverlay')) return;
  document.getElementById('searchOverlay').classList.add('hidden');
}

// close with escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSearch(e);
});

// ===== PAGE SWITCHER =====
function switchPage(page) {
  currentPage = page;
  document.getElementById('pageTitle').innerText = page.charAt(0).toUpperCase() + page.slice(1);
  renderPage(page);
  // highlight sidebar (simple)
  document.querySelectorAll('nav a').forEach(el => {
    el.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/30', 'text-indigo-700', 'dark:text-indigo-300');
    el.classList.add('text-gray-600', 'dark:text-gray-300');
  });
  // find matching link (by onclick)
  document.querySelectorAll('nav a').forEach(el => {
    if (el.textContent.trim().toLowerCase() === page) {
      el.classList.add('bg-indigo-50', 'dark:bg-indigo-900/30', 'text-indigo-700', 'dark:text-indigo-300');
      el.classList.remove('text-gray-600', 'dark:text-gray-300');
    }
  });
}

// ===== RENDER PAGES =====
function renderPage(page) {
  const container = document.getElementById('pageContent');
  // destroy old charts if any
  if (window.chartInstances) {
    Object.values(window.chartInstances).forEach(chart => {
      if (!chart) return;
      if (typeof chart.destroy === 'function') {
        // Chart.js (bar, doughnut, line...)
        chart.destroy();
      } else if (chart instanceof go.Diagram) {
        // GoJS : pas de .destroy(), on détache le div pour libérer proprement
        chart.div = null;
      }
    });
    window.chartInstances = {};
  }
  let html = '';
  switch (page) {
    case 'dashboard': html = getDashboardHTML(); break;
    case 'homepage': html = getHomepageHTML(); break;
    case 'scriptsWeb': html = getScriptsWebHTML(); break;
    default: html = getScriptsWebHTML();
  }
  container.innerHTML = html;
  setTimeout(() => {
    initPage(page); // pense aussi à utiliser initPage ici, pas initChartsForPage directement
  }, 50);
}

function initPage(page) {
  if (page === 'dashboard') {
    initChartsForPage('dashboard');
  } else if (page === 'scriptsWeb') {
    initScriptsWeb('scriptsWeb');
  }
}


// ===== INIT =====
applyDarkMode();
renderPage('homepage');

// close dropdown on escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('profileDropdown')?.classList.add('hidden');
  }
});


// Au chargement de la page
window.addEventListener('DOMContentLoaded', async () => {
  // 1. injecter le HTML du dashboard dans le DOM (à adapter selon ton code existant)
  //document.getElementById('mainContent').innerHTML = getDashboardHTML();

  // 2. charger les données
  await Promise.all([loadScriptsData(), loadRolesData(), getScriptsData()]);

  // 3. mettre à jour les stats et les graphiques
  updateDashboardStats();
  initChartsForPage('dashboard');
  initScriptsWeb('scriptsWeb');
});