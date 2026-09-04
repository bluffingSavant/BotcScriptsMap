let youtubeVideosData = null;

async function loadYoutubeVideosData() {
  if (youtubeVideosData) return youtubeVideosData;
  const response = await fetch("youtube_data/youtube_videos.json");
  if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
  youtubeVideosData = await response.json();
  return youtubeVideosData;
}

// --- Extraction ID + lookup titre (via scriptsData déjà chargé par scriptWeb.js) ---

function extractScriptId(description) {
  if (!description) return null;
  const match = description.match(/botcscripts\.com\/script\/(\d+)/i);
  return match ? Number(match[1]) : null;
}

function buildScriptsTitleIndex() {
  const index = new Map();
  (scriptsData || []).forEach((script) => {
    index.set(script.script_id_original, script.title);
  });
  return index;
}

function extractScriptName(description, scriptsIndex) {
  const scriptId = extractScriptId(description);
  if (scriptId === null) return null;
  return scriptsIndex.get(scriptId) || null;
}

// --- Groupement ---

function groupVideosByScript(source, scriptsIndex) {
  const allVideos = [];
  for (const handle in source) {
    const channelVideos = source[handle].videos || [];
    channelVideos.forEach((video) => allVideos.push({ ...video, channel: handle }));
  }

  const groups = new Map();
  allVideos.forEach((video) => {
    const scriptName = extractScriptName(video.description, scriptsIndex);

    // On ne garde que les vidéos dont le script a été identifié.
    if (!scriptName) return;

    if (!groups.has(scriptName)) groups.set(scriptName, []);
    groups.get(scriptName).push(video);
  });

  groups.forEach((videos) => videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)));

  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

// --- Rendu HTML ---

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderVideoRow(video) {
  const date = video.publishedAt ? new Date(video.publishedAt).toLocaleDateString("fr-FR") : "";
  const channelBadge = video.channel ? ` · ${escapeHtml(video.channel)}` : "";

  return `
    <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noopener"
       class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <img src="${video.thumbnail || ""}" alt="" class="w-16 h-10 object-cover rounded-md flex-shrink-0" />
      <div class="min-w-0">
        <p class="text-sm text-gray-700 dark:text-gray-200 truncate">${escapeHtml(video.title)}</p>
        <p class="text-xs text-gray-400">${date}${channelBadge}</p>
      </div>
    </a>`;
}

function renderScriptGroup(scriptName, videos) {
  return `
    <details class="group border border-gray-100/80 dark:border-gray-700 rounded-xl mb-2 overflow-hidden">
      <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#111827] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <span class="font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(scriptName)}</span>
        <span class="flex items-center gap-2">
          <span class="text-xs text-gray-400">${videos.length} video${videos.length > 1 ? "s" : ""}</span>
          <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </summary>
      <div class="divide-y divide-gray-100 dark:divide-gray-700">
        ${videos.map(renderVideoRow).join("")}
      </div>
    </details>`;
}

// ===== SHELL HTML (called by renderPage() in main.js) =====
function getListYoutubeHTML() {
  return `
    <section class="grid grid-cols-1 gap-6">
      <div class="bg-white dark:bg-[#1f2937] p-5 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 card-hover">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-semibold text-gray-700 dark:text-gray-200">Videos by script (retrieved from BloodOnTheClocktower, NoRollsBarred and Adventure_Emporium)</h4>
          <span id="youtubeScriptCount" class="text-xs text-gray-400"></span>
        </div>
        <div id="youtubeList">
          <p class="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    </section>
  `;
}

// ===== INIT (called by initPage() in main.js) =====
async function initListYoutube() {
  const listDiv = document.getElementById("youtubeList");
  const countSpan = document.getElementById("youtubeScriptCount");
  if (!listDiv) return;

  try {
    const [source] = await Promise.all([loadYoutubeVideosData(), getScriptsData()]);

    const scriptsIndex = buildScriptsTitleIndex();
    const groupedScripts = groupVideosByScript(source, scriptsIndex);

    if (countSpan) {
      countSpan.textContent = `${groupedScripts.length} script${groupedScripts.length > 1 ? "s" : ""}`;
    }
    listDiv.innerHTML = groupedScripts.map(([name, videos]) => renderScriptGroup(name, videos)).join("");
  } catch (err) {
    console.error("Error while loading YouTube videos:", err);
    listDiv.innerHTML = `<p class="text-sm text-red-400">Impossible to load videos (${escapeHtml(err.message)}).</p>`;
  }
}