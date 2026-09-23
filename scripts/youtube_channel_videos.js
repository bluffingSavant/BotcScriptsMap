/**
 * Récupère les vidéos des chaînes YouTube BOTC et écrit le résultat en JSON
 * sur stdout. Prévu pour tourner en CI (GitHub Actions), PAS dans le navigateur.
 *
 * Usage :
 *   API_KEY=xxxx node scripts/youtube_channel_videos.js > youtube_data/youtube_videos.json
 *
 * Les logs de progression vont sur stderr pour ne pas polluer le JSON de stdout.
 */

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Merci de définir API_KEY en variable d'environnement.");
  process.exit(1);
}

const CHANNEL_HANDLES = ["@BloodontheClocktower", "@NoRollsBarred", "@Adventure_Emporium", "@Mt-Unpleasant", "@The_Megavoid"];
const BASE = "https://www.googleapis.com/youtube/v3";

// Playlists dont TOUTES les vidéos doivent être attribuées à un script précis,
// indépendamment de ce que dit la description (utile pour les playlists du
// type "toutes les parties jouées sur tel script"). Le titre doit correspondre
// exactement au titre affiché sur YouTube (insensible à la casse).
const PLAYLIST_SCRIPT_OVERRIDES = [
  { channelHandle: "@iljitsch", playlistTitle: "BoTC Trouble Brewing", scriptName: "Trouble Brewing" },
  { channelHandle: "@iljitsch", playlistTitle: "BoTC Bad Moon Rising", scriptName: "Bad Moon Rising" },
  { channelHandle: "@iljitsch", playlistTitle: "BoTC Sects & Violets", scriptName: "Sects and Violets" },
  // Ajoute d'autres entrées ici, par ex. :
  // { channelHandle: "@BloodontheClocktower", playlistTitle: "BoTC Bad Moon Rising", scriptName: "Bad Moon Rising" },
];

const log = (msg) => console.error(msg);

// Cherche, dans les playlists d'une chaîne, celle dont le titre correspond
// exactement (insensible à la casse) à `title`. Renvoie son ID ou null.
async function findPlaylistIdByTitle(channelId, title) {
  const normalizedTarget = title.trim().toLowerCase();
  let pageToken = "";

  do {
    const url = `${BASE}/playlists?part=snippet&channelId=${channelId}&maxResults=50&pageToken=${pageToken}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(`Erreur API: ${data.error.message}`);

    const match = (data.items || []).find(
      (item) => item.snippet.title.trim().toLowerCase() === normalizedTarget
    );
    if (match) return match.id;

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return null;
}

async function getChannelIdFromHandle(handle) {
  const url = `${BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) throw new Error(`Erreur API pour ${handle}: ${data.error.message}`);
  if (!data.items || data.items.length === 0) throw new Error(`Handle introuvable: ${handle}`);

  return data.items[0].id;
}

async function getUploadsPlaylistId(channelId) {
  const url = `${BASE}/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("Channel not found or no contentDetails available for channelId: " + channelId);
  }

  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getAllVideoIds(playlistId) {
  const videos = [];
  let pageToken = "";

  do {
    const url = `${BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&pageToken=${pageToken}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(`Erreur API: ${data.error.message}`);

    for (const item of data.items) {
      videos.push({
        videoId: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.contentDetails.videoPublishedAt,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      });
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return videos;
}

async function enrichWithVideoDetails(videos) {
  const enriched = [];

  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50);
    const ids = batch.map((v) => v.videoId).join(",");
    const url = `${BASE}/videos?part=statistics,contentDetails,snippet&id=${ids}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(`Erreur API: ${data.error.message}`);

    const detailsById = Object.fromEntries(data.items.map((v) => [v.id, v]));

    for (const video of batch) {
      const details = detailsById[video.videoId];
      enriched.push({
        ...video,
        duration: details?.contentDetails?.duration,
        viewCount: details?.statistics?.viewCount,
        likeCount: details?.statistics?.likeCount,
        commentCount: details?.statistics?.commentCount,
        tags: details?.snippet?.tags || [],
        categoryId: details?.snippet?.categoryId,
      });
    }
  }

  return enriched;
}

async function getChannelVideos(handle) {
  log(`=== ${handle} ===`);
  log("Résolution du handle...");
  const channelId = await getChannelIdFromHandle(handle);

  log("Récupération de la playlist uploads...");
  const uploadsId = await getUploadsPlaylistId(channelId);

  log("Récupération des vidéos...");
  const videos = await getAllVideoIds(uploadsId);
  log(`${videos.length} vidéos trouvées.`);

  log("Enrichissement des métadonnées...");
  const enriched = await enrichWithVideoDetails(videos);

  return { handle, channelId, videos: enriched };
}

// Récupère les vidéos des playlists listées dans PLAYLIST_SCRIPT_OVERRIDES et
// les fusionne dans `results`, en leur ajoutant un champ `scriptOverride`.
// Si une vidéo de playlist existe déjà (récupérée via les uploads normaux),
// on ajoute simplement le scriptOverride sur l'entrée existante plutôt que
// de dupliquer la vidéo.
async function applyPlaylistOverrides(results) {
  for (const override of PLAYLIST_SCRIPT_OVERRIDES) {
    const channelResult = results[override.channelHandle];
    if (!channelResult) {
      log(`Chaîne inconnue pour l'override "${override.playlistTitle}": ${override.channelHandle}`);
      continue;
    }

    log(`=== Playlist "${override.playlistTitle}" (${override.channelHandle}) ===`);
    const playlistId = await findPlaylistIdByTitle(channelResult.channelId, override.playlistTitle);

    if (!playlistId) {
      log(`Playlist introuvable: "${override.playlistTitle}"`);
      continue;
    }

    log("Récupération des vidéos de la playlist...");
    const playlistVideos = await getAllVideoIds(playlistId);
    log(`${playlistVideos.length} vidéos trouvées, enrichissement...`);
    const enrichedPlaylistVideos = await enrichWithVideoDetails(playlistVideos);

    const existingById = new Map(channelResult.videos.map((v) => [v.videoId, v]));

    for (const video of enrichedPlaylistVideos) {
      const existing = existingById.get(video.videoId);
      if (existing) {
        existing.scriptOverride = override.scriptName;
      } else {
        video.scriptOverride = override.scriptName;
        channelResult.videos.push(video);
        existingById.set(video.videoId, video);
      }
    }
  }
}

async function main() {
  const results = {};
  for (const handle of CHANNEL_HANDLES) {
    results[handle] = await getChannelVideos(handle);
  }

  await applyPlaylistOverrides(results);

  // Seul le JSON final part sur stdout : c'est ce qui sera redirigé vers le fichier.
  process.stdout.write(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Erreur:", err.message);
  process.exit(1);
});