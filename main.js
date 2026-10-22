// ===== STATE =====
let currentPage = 'homepage';
let darkMode = localStorage.getItem('darkMode') === 'true' || false;
let chartsInitialized = {};
const pageHashes = {
  homepage: '#homepage',
  'script similarity': '#script-similarity',
  dashboard: '#dashboard',
  'character combinations': '#character-combinations',
  'played on youtube': '#played-on-youtube'
};
const pagesByHash = Object.fromEntries(
  Object.entries(pageHashes).map(([page, hash]) => [hash, page])
);
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
function switchPage(page, updateUrl = true) {
  if (updateUrl && pageHashes[page] && window.location.hash !== pageHashes[page]) {
    window.location.hash = pageHashes[page];
  }
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

window.addEventListener('hashchange', () => {
  const page = pagesByHash[window.location.hash];
  if (page && page !== currentPage) {
    switchPage(page, false);
  }
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
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
        chart.div = null;
      }
    });
    window.chartInstances = {};
  }
  let html = '';
  switch (page) {
    case 'homepage': html = getHomepageHTML(); break;
    case 'dashboard': html = getDashboardHTML(); break;
    case 'character combinations': html = getScriptsWebHTML(); break;
    case 'script similarity': html = getScriptsSimilarityHTML(); break;
    case 'played on youtube': html = getListYoutubeHTML(); break;
    default: html = getHomepageHTML();
  }
  container.innerHTML = html;
  setTimeout(() => {
    initPage(page);
  }, 50);
}

async function initPage(page) {
  if (page == 'homepage') {
    initHomePage();
  }
  else if (page === 'dashboard') {
    await Promise.all([getScriptsData(), loadRolesData()]);
    await loadScriptsData();
    if (currentPage !== page) return;
    initChartsForPage();
  } else if (page === 'character combinations') {
    await Promise.all([getScriptsData(), getCharacters()]);
    await getLinks();
    if (currentPage !== page) return;
    initScriptsWeb();
  }
  else if (page === 'script similarity') {
    await Promise.all([getScriptsData(), getBase3Data(), getCharacters()]);
    if (currentPage !== page) return;
    initSlider();
  }
  else if (page === 'played on youtube') {
    await initListYoutube();
  }
}


// ===== INIT =====
applyDarkMode();
switchPage(pagesByHash[window.location.hash] || 'homepage', false);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('profileDropdown')?.classList.add('hidden');
  }
});

let allTokens = [];
let totalScripts = 0;
