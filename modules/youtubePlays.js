let youtubeVideosData = null;

async function loadYoutubeVideosData() {
  if (youtubeVideosData) return youtubeVideosData;

  const response = await fetch("youtube_data/youtube_videos.json");
  if (!response.ok) throw new Error(`HTTP error ${response.status}`);

  youtubeVideosData = await response.json();
  return youtubeVideosData;
}

// ============================================================
// Script identification
// ============================================================

// Extract the script ID from a botcscripts.com URL.
function extractScriptId(description) {
  if (!description) return null;

  const match = description.match(/botcscripts\.com\/script\/(\d+)/i);
  return match ? Number(match[1]) : null;
}


// Extract a script name from old YouTube descriptions.
//
// Old videos sometimes contain text such as:
// "Trouble Brewing character sheet here: https://..."
//
// The URL is obsolete, but the script name is still present.
function extractScriptNameFromDescription(description) {
  if (!description) return null;

  // Match the text immediately before "character sheet here:"
  //
  // Example:
  // "Trouble Brewing character sheet here: https://..."
  //
  // The non-greedy match allows descriptions containing additional text.
  const match = description.match(
    /(?:^|\n|\r)(.*?)\s+character\s+sheet\s+here\s*:/i
  );

  if (!match) return null;

  const scriptName = match[1].trim();

  return scriptName || null;
}


// Build an index from script ID to script title.
function buildScriptsTitleIndex() {
  const index = new Map();

  (scriptsData || []).forEach((script) => {
    if (script.script_id_original == null) return;

    const title = script.title;

    if (!title) return;

    index.set(Number(script.script_id_original), title);
  });

  return index;
}


// Build a second index from normalized script title to the actual
// title stored in scriptsData.
//
// This makes matching robust to differences in capitalization,
// spaces and punctuation.
function buildScriptsNameIndex() {
  const index = new Map();

  (scriptsData || []).forEach((script) => {
    if (!script.title) return;

    const normalizedTitle = normalizeScriptName(script.title);

    if (!normalizedTitle) return;

    index.set(normalizedTitle, script.title);
  });

  return index;
}


// Normalize script names before comparing them.
function normalizeScriptName(name) {
  if (!name) return "";

  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


// Identify a script using its ID first, then fall back to the
// script name found in the description.
function extractScriptName(description, scriptsIndex, scriptsNameIndex) {
  if (!description) return null;

  // ----------------------------------------------------------
  // First attempt: script ID
  // ----------------------------------------------------------

  const scriptId = extractScriptId(description);

  if (scriptId !== null) {
    const scriptName = scriptsIndex.get(scriptId);

    if (scriptName) {
      return scriptName;
    }
  }

  // ----------------------------------------------------------
  // Second attempt: script name
  // ----------------------------------------------------------

  const descriptionScriptName =
    extractScriptNameFromDescription(description);

  if (!descriptionScriptName) return null;

  const normalizedName =
    normalizeScriptName(descriptionScriptName);

  return scriptsNameIndex.get(normalizedName) || null;
}


// ============================================================
// Grouping
// ============================================================

function groupVideosByScript(source, scriptsIndex, scriptsNameIndex) {
  const allVideos = [];

  for (const handle in source) {
    const channelVideos = source[handle].videos || [];

    channelVideos.forEach((video) => {
      allVideos.push({
        ...video,
        channel: handle
      });
    });
  }

  const groups = new Map();

  allVideos.forEach((video) => {
    const scriptName = extractScriptName(
      video.description,
      scriptsIndex,
      scriptsNameIndex
    );

    // Keep only videos for which the script was identified.
    if (!scriptName) return;

    if (!groups.has(scriptName)) {
      groups.set(scriptName, []);
    }

    groups.get(scriptName).push(video);
  });

  // Sort videos within each script by publication date.
  groups.forEach((videos) => {
    videos.sort(
      (a, b) =>
        new Date(b.publishedAt) - new Date(a.publishedAt)
    );
  });

  // ----------------------------------------------------------
  // Sort scripts
  // ----------------------------------------------------------

  const base3Scripts = [
    "Trouble Brewing",
    "Bad Moon Rising",
    "Sects and Violets"
  ];

  const base3Normalized = new Map(
    base3Scripts.map((name, index) => [
      normalizeScriptName(name),
      index
    ])
  );

  return [...groups.entries()].sort((a, b) => {
    const nameA = normalizeScriptName(a[0]);
    const nameB = normalizeScriptName(b[0]);

    const base3A = base3Normalized.get(nameA);
    const base3B = base3Normalized.get(nameB);

    // Base 3 scripts always come first.
    if (base3A !== undefined && base3B !== undefined) {
      return base3A - base3B;
    }

    if (base3A !== undefined) return -1;
    if (base3B !== undefined) return 1;

    // All remaining scripts are sorted by number of videos.
    return b[1].length - a[1].length;
  });
}


// ============================================================
// HTML rendering
// ============================================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


function renderVideoRow(video) {
  const date = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString("fr-FR")
    : "";

  const channelBadge = video.channel
    ? ` · ${escapeHtml(video.channel)}`
    : "";

  return `
    <a href="https://www.youtube.com/watch?v=${video.videoId}"
       target="_blank"
       rel="noopener"
       class="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">

      <img
        src="${video.thumbnail || ""}"
        alt=""
        class="w-16 h-10 object-cover rounded-md flex-shrink-0"
      />

      <div class="min-w-0">
        <p class="text-sm text-gray-700 dark:text-gray-200 truncate">
          ${escapeHtml(video.title)}
        </p>

        <p class="text-xs text-gray-400">
          ${date}${channelBadge}
        </p>
      </div>
    </a>
  `;
}


function renderScriptGroup(scriptName, videos) {
  return `
    <details class="group border border-gray-100/80 dark:border-gray-700 rounded-xl mb-2 overflow-hidden">

      <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#111827] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">

        <span class="font-semibold text-gray-700 dark:text-gray-200">
          ${escapeHtml(scriptName)}
        </span>

        <span class="flex items-center gap-2">

          <span class="text-xs text-gray-400">
            ${videos.length} video${videos.length > 1 ? "s" : ""}
          </span>

          <svg
            class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>

        </span>

      </summary>

      <div class="divide-y divide-gray-100 dark:divide-gray-700">
        ${videos.map(renderVideoRow).join("")}
      </div>

    </details>
  `;
}


// ============================================================
// Page shell
// ============================================================

function getListYoutubeHTML() {
  return `
    <section class="grid grid-cols-1 gap-6">

      <div class="bg-white dark:bg-[#1f2937] p-5 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700 card-hover">

        <div class="flex items-center justify-between mb-3">

          <h4 class="font-semibold text-gray-700 dark:text-gray-200">
            Videos by script (retrieved from BloodOnTheClocktower, NoRollsBarred and Adventure_Emporium)
          </h4>

          <span
            id="youtubeScriptCount"
            class="text-xs text-gray-400"
          ></span>

        </div>

        <div id="youtubeList">
          <p class="text-sm text-gray-400">
            Loading...
          </p>
        </div>

      </div>

    </section>
  `;
}


// ============================================================
// Initialization
// ============================================================

async function initListYoutube() {
  const listDiv = document.getElementById("youtubeList");
  const countSpan = document.getElementById("youtubeScriptCount");

  if (!listDiv) return;

  try {
    const [source] = await Promise.all([
      loadYoutubeVideosData(),
      getScriptsData()
    ]);

    const scriptsIndex = buildScriptsTitleIndex();
    const scriptsNameIndex = buildScriptsNameIndex();

    const groupedScripts = groupVideosByScript(
      source,
      scriptsIndex,
      scriptsNameIndex
    );

    if (countSpan) {
      countSpan.textContent =
        `${groupedScripts.length} script${groupedScripts.length > 1 ? "s" : ""}`;
    }

    listDiv.innerHTML = groupedScripts
      .map(([name, videos]) => renderScriptGroup(name, videos))
      .join("");

  } catch (err) {
    console.error("Error while loading YouTube videos:", err);

    listDiv.innerHTML = `
      <p class="text-sm text-red-400">
        Unable to load videos (${escapeHtml(err.message)}).
      </p>
    `;
  }
}