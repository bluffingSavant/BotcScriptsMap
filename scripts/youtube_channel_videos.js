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
// indépendamment de ce que dit la description. Utile en particulier pour des
// playlists créées par un tiers, qui piochent des vidéos sur plusieurs chaînes
// différentes — la chaîne d'origine réelle de chaque vidéo est de toute façon
// retrouvée via l'API (voir ownerChannelTitle plus bas), pas via cette config.
//
// `playlistId` s'obtient dans l'URL YouTube de la playlist :
//   https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxx
//                                          ^^^^^^^^^^^^^^^^^^ c'est ça
const PLAYLIST_SCRIPT_OVERRIDES = [
  { playlistId: "PLtnTSHgF3XLausN3H0hk-cR91ZEXesxEE", scriptName: "Trouble Brewing" },
  { playlistId: "PLtnTSHgF3XLZhho-8S-Jq6yuRFrW1hwZZ", scriptName: "Bad Moon Rising" },
  { playlistId: "PLtnTSHgF3XLaGfq3WmWuvjPzw-OAywtkX", scriptName: "Sects and Violets" },
  // Ajoute d'autres entrées ici, par ex. :
  // { playlistId: "PLyyyyyyyyyyyyyyyyy", scriptName: "Bad Moon Rising" },
];

const log = (msg) => console.error(msg);

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
        // Chaîne qui a réellement publié la vidéo (utile pour les playlists
        // "agrégateur" qui piochent des vidéos sur plusieurs chaînes).
        ownerChannelTitle: item.snippet.videoOwnerChannelTitle || null,
        ownerChannelId: item.snippet.videoOwnerChannelId || null,
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
//
// Ces playlists peuvent être créées par un tiers indépendant et piocher des
// vidéos sur des chaînes qui ne sont pas dans CHANNEL_HANDLES : chaque vidéo
// garde donc sa vraie chaîne d'origine (`ownerChannelTitle`, déjà capturé par
// getAllVideoIds), pas celle du curateur de la playlist.
//
// Le dédoublonnage se fait sur l'ensemble des vidéos déjà récupérées, toutes
// chaînes confondues : si une vidéo de la playlist a déjà été vue ailleurs
// (upload normal d'une des chaînes suivies), on ajoute juste le
// scriptOverride sur l'entrée existante plutôt que de la dupliquer.
async function applyPlaylistOverrides(results) {
  const existingById = new Map();
  for (const handle in results) {
    for (const video of results[handle].videos) {
      existingById.set(video.videoId, video);
    }
  }

  // Bucket dédié aux vidéos qui ne proviennent d'aucune des chaînes suivies.
  if (!results._playlists) {
    results._playlists = { videos: [] };
  }

  for (const override of PLAYLIST_SCRIPT_OVERRIDES) {
    log(`=== Playlist ${override.playlistId} -> script "${override.scriptName}" ===`);

    log("Récupération des vidéos de la playlist...");
    const playlistVideos = await getAllVideoIds(override.playlistId);
    log(`${playlistVideos.length} vidéos trouvées, enrichissement...`);
    const enrichedPlaylistVideos = await enrichWithVideoDetails(playlistVideos);

    for (const video of enrichedPlaylistVideos) {
      const existing = existingById.get(video.videoId);
      if (existing) {
        existing.scriptOverride = override.scriptName;
        // On préfère la vraie chaîne d'origine si on ne l'avait pas déjà.
        if (!existing.ownerChannelTitle && video.ownerChannelTitle) {
          existing.ownerChannelTitle = video.ownerChannelTitle;
          existing.ownerChannelId = video.ownerChannelId;
        }
      } else {
        video.scriptOverride = override.scriptName;
        results._playlists.videos.push(video);
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