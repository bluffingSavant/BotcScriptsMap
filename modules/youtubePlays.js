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
// Video collection & tagging
// ============================================================

// Flatten the per-channel source object into a single list of
// videos, each carrying its channel handle.
function collectAllVideos(source) {
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

  return allVideos;
}


// Attach the identified script name to each video, dropping videos
// for which no script could be identified.
function tagVideosWithScript(videos, scriptsIndex, scriptsNameIndex) {
  const tagged = [];

  videos.forEach((video) => {
    const scriptName = extractScriptName(
      video.description,
      scriptsIndex,
      scriptsNameIndex
    );

    if (!scriptName) return;

    tagged.push({ ...video, scriptName });
  });

  return tagged;
}


function sortVideosByDateDesc(videos) {
  return [...videos].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );
}


// ============================================================
// Grouping & sorting
// ============================================================

const BASE3_SCRIPTS = [
  "Trouble Brewing",
  "Bad Moon Rising",
  "Sects and Violets"
];

const BASE3_ORDER = new Map(
  BASE3_SCRIPTS.map((name, index) => [normalizeScriptName(name), index])
);

// Group already-tagged videos by script name. Returns a Map of
// scriptName -> videos[], each video list sorted by date desc.
function groupByScript(videos) {
  const groups = new Map();

  videos.forEach((video) => {
    if (!groups.has(video.scriptName)) {
      groups.set(video.scriptName, []);
    }

    groups.get(video.scriptName).push(video);
  });

  groups.forEach((vids, key) => {
    groups.set(key, sortVideosByDateDesc(vids));
  });

  return groups;
}


// Base3 scripts first (in their canonical order), then the rest
// sorted by number of videos, descending.
function compareScriptEntriesByCount([nameA, videosA], [nameB, videosB]) {
  const base3A = BASE3_ORDER.get(normalizeScriptName(nameA));
  const base3B = BASE3_ORDER.get(normalizeScriptName(nameB));

  if (base3A !== undefined && base3B !== undefined) return base3A - base3B;
  if (base3A !== undefined) return -1;
  if (base3B !== undefined) return 1;

  return videosB.length - videosA.length;
}


function compareScriptEntriesAlpha([nameA], [nameB]) {
  return normalizeScriptName(nameA).localeCompare(normalizeScriptName(nameB));
}


// Group tagged videos by script and sort the groups according to
// the requested mode ("count" or "alpha").
function getSortedScriptEntries(videos, mode) {
  const groups = groupByScript(videos);
  const entries = [...groups.entries()];

  entries.sort(
    mode === "alpha" ? compareScriptEntriesAlpha : compareScriptEntriesByCount
  );

  return entries;
}


// Group tagged videos by channel, then by script within each
// channel. A script appears once per channel that has videos for
// it (so the same script can appear under several channels).
// Channels are sorted alphabetically; scripts within a channel use
// the same base3-first / count-desc order as the "count" sort.
function getChannelGroupedEntries(videos) {
  const byChannel = new Map();

  videos.forEach((video) => {
    if (!byChannel.has(video.channel)) {
      byChannel.set(video.channel, []);
    }

    byChannel.get(video.channel).push(video);
  });

  const channelEntries = [...byChannel.entries()].map(
    ([channel, channelVideos]) => [
      channel,
      getSortedScriptEntries(channelVideos, "count")
    ]
  );

  channelEntries.sort((a, b) => a[0].localeCompare(b[0]));

  return channelEntries;
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


function renderChannelGroup(channel, scriptEntries) {
  const videoCount = scriptEntries.reduce(
    (sum, [, videos]) => sum + videos.length,
    0
  );

  return `
    <details class="group border border-gray-200 dark:border-gray-600 rounded-xl mb-3 overflow-hidden">

      <summary class="cursor-pointer list-none flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-[#0b1220] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">

        <span class="font-bold text-gray-800 dark:text-gray-100">
          ${escapeHtml(channel)}
        </span>

        <span class="flex items-center gap-2">

          <span class="text-xs text-gray-400">
            ${videoCount} video${videoCount > 1 ? "s" : ""}
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

      <div class="p-2">
        ${scriptEntries.map(([name, videos]) => renderScriptGroup(name, videos)).join("")}
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

        <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">

          <h4 class="font-semibold text-gray-700 dark:text-gray-200">
            Videos by script (retrieved from BloodOnTheClocktower, NoRollsBarred and Adventure_Emporium)
          </h4>

          <div class="flex items-center gap-3">

            <span
              id="youtubeScriptCount"
              class="text-xs text-gray-400"
            ></span>

            <select
              id="youtubeSortSelect"
              class="text-xs bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-600 dark:text-gray-300"
            >
              <option value="count">Sort : number of videos</option>
              <option value="channel">Sort : YouTube channel</option>
              <option value="alpha">Sort : alphabetical order</option>
            </select>

          </div>

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

// Videos tagged with their identified script, kept in memory so
// changing the sort mode doesn't require re-fetching or re-matching.
let taggedYoutubeVideos = null;

function renderYoutubeList(mode) {
  const listDiv = document.getElementById("youtubeList");
  const countSpan = document.getElementById("youtubeScriptCount");

  if (!listDiv || !taggedYoutubeVideos) return;

  if (mode === "channel") {
    const channelEntries = getChannelGroupedEntries(taggedYoutubeVideos);

    if (countSpan) {
      const scriptCount = new Set(
        taggedYoutubeVideos.map((v) => v.scriptName)
      ).size;

      countSpan.textContent =
        `${scriptCount} script${scriptCount > 1 ? "s" : ""} · ` +
        `${channelEntries.length} chaîne${channelEntries.length > 1 ? "s" : ""}`;
    }

    listDiv.innerHTML = channelEntries
      .map(([channel, scriptEntries]) => renderChannelGroup(channel, scriptEntries))
      .join("");

    return;
  }

  const scriptEntries = getSortedScriptEntries(taggedYoutubeVideos, mode);

  if (countSpan) {
    countSpan.textContent =
      `${scriptEntries.length} script${scriptEntries.length > 1 ? "s" : ""}`;
  }

  listDiv.innerHTML = scriptEntries
    .map(([name, videos]) => renderScriptGroup(name, videos))
    .join("");
}


async function initListYoutube() {
  const listDiv = document.getElementById("youtubeList");
  const sortSelect = document.getElementById("youtubeSortSelect");

  if (!listDiv) return;

  try {
    const [source] = await Promise.all([
      loadYoutubeVideosData(),
      getScriptsData()
    ]);

    const scriptsIndex = buildScriptsTitleIndex();
    const scriptsNameIndex = buildScriptsNameIndex();

    const allVideos = collectAllVideos(source);
    taggedYoutubeVideos = tagVideosWithScript(
      allVideos,
      scriptsIndex,
      scriptsNameIndex
    );

    renderYoutubeList(sortSelect ? sortSelect.value : "count");

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        renderYoutubeList(sortSelect.value);
      });
    }

  } catch (err) {
    console.error("Error while loading YouTube videos:", err);

    listDiv.innerHTML = `
      <p class="text-sm text-red-400">
        Unable to load videos (${escapeHtml(err.message)}).
      </p>
    `;
  }
}