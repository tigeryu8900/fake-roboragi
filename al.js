const wdl = require("./wdl");
const utils = require("./utils");

const uri = "https://graphql.anilist.co";

const queryBody = `{
  id
  idMal
  title {
    romaji
    english
    native
  }
  type
  status
  format
  episodes
  chapters
  volumes
  description
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  genres
  synonyms
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
}`;

const animeQuery = `query ($search: String) {
  Page {
    media(search: $search, type: ANIME) ${queryBody}
  }
}`;

const mangaQuery = `query ($search: String) {
  Page {
    media(search: $search, type: MANGA, format_in: [MANGA, ONE_SHOT]) ${queryBody}
  }
}`;

const lightQuery = `query ($search: String) {
  Page {
    media(search: $search, type: MANGA, format: NOVEL) ${queryBody}
  }
}`;

const idQuery = `query ($id: Int) {
  Page {
    media(id: $id) ${queryBody}
  }
}`;

const statusMap = utils.fallbackObject({
  'FINISHED': 'Finished',
  'RELEASING': 'Releasing',
  'NOT_YET_RELEASED': 'Not Yet Released',
  'CANCELLED': 'Special'
}, "Special");

const formatMap = utils.fallbackObject({
  'TV': 'TV',
  'TV_SHORT': 'TV Short',
  'MOVIE': 'Movie',
  'SPECIAL': 'Special',
  'OVA': 'OVA',
  'ONA': 'ONA',
  'MUSIC': 'Music',
  'MANGA': 'Manga',
  'NOVEL': 'Novel',
  'ONE_SHOT': 'One Shot'
}, "Special");

function preprocess(match, query) {
  return utils.preprocess(match, query, [
    ...Object.values(match.title).filter(title => typeof title === "string"),
    ...match.synonyms
  ]);
};

// const anime1 = {
//   preprocess(match, query) {
//     let alts = [
//       ...Object.values(match.title).filter(title => typeof title === "string"),
//       ...match.synonyms
//     ];
//     return {
//       alts,
//       distance: Math.min(...alts.map(alt => wdl(query, alt))),
//       match
//     };
//   },
//   transformProcessed(preprocessed) {
//     let match = preprocessed.match;
//     let next = new Date(match.nextAiringEpisode?.airingAt * 1000);
//     return {
//       title: match.title.romaji,
//       jp: match.title.native,
//       alts: preprocessed.alts,
//       link: `https://anilist.co/anime/${match.id}`,
//       malLink: `https://myanimelist.net/anime/${match.idMal}`,
//       format: formatMap[match.format],
//       year: match.startDate.year,
//       status: statusMap[match.status],
//       genres: match.genres.join(", "),
//       description: match.description,
//       episodes: match.episodes,
//       ...match.nextAiringEpisode && {
//         nextEpisode: match.nextAiringEpisode.episode,
//         next: {
//           days: Math.floor(
//               match.nextAiringEpisode.timeUntilAiring / (60 * 60 * 24)),
//           hours: Math.floor(
//               match.nextAiringEpisode.timeUntilAiring / (60 * 60)) % 24,
//           minutes: Math.floor(match.nextAiringEpisode.timeUntilAiring / 60)
//               % 60,
//           url: `https://www.timeanddate.com/worldclock/fixedtime.html?iso=${
//               next.getUTCFullYear().toString().padStart(4, '0')
//           }${
//               (next.getUTCMonth() + 1).toString().padStart(2, '0')
//           }${
//               next.getUTCDate().toString().padStart(2, '0')
//           }T${
//               next.getUTCHours().toString().padStart(2, '0')
//           }${
//               next.getUTCMinutes().toString().padStart(2, '0')
//           }`
//         }
//       },
//       distance: preprocessed.distance
//     };
//   },
//   transform(match, query) {
//     return this.transformProcessed(this.preprocess(match, query));
//   }
// };

function anime(entry, query="") {
  if (!entry.preprocessed) {
    entry = preprocess(entry, query);
  }
  let match = entry.match;
  let next = new Date(match.nextAiringEpisode?.airingAt * 1000);
  return {
    title: match.title.romaji,
    jp: match.title.native,
    alts: entry.alts,
    link: `https://anilist.co/anime/${match.id}`,
    malLink: `https://myanimelist.net/anime/${match.idMal}`,
    format: formatMap[match.format],
    year: match.startDate.year,
    status: statusMap[match.status],
    genres: match.genres,
    description: match.description,
    episodes: match.episodes,
    ...match.nextAiringEpisode && {
      nextEpisode: match.nextAiringEpisode.episode,
      next: {
        days: Math.floor(
            match.nextAiringEpisode.timeUntilAiring / (60 * 60 * 24)),
        hours: Math.floor(
            match.nextAiringEpisode.timeUntilAiring / (60 * 60)) % 24,
        minutes: Math.floor(match.nextAiringEpisode.timeUntilAiring / 60)
            % 60,
        url: `https://www.timeanddate.com/worldclock/fixedtime.html?iso=${
            next.getUTCFullYear().toString().padStart(4, '0')
        }${
            (next.getUTCMonth() + 1).toString().padStart(2, '0')
        }${
            next.getUTCDate().toString().padStart(2, '0')
        }T${
            next.getUTCHours().toString().padStart(2, '0')
        }${
            next.getUTCMinutes().toString().padStart(2, '0')
        }`
      }
    },
    distance: entry.distance
  };
}

function animeLink(entry) {
  let match = entry.preprocessed ? entry.match : entry;
  return `https://anilist.co/anime/${match.id}`;
}

// function anime0(match, query) {
//   let alts = [
//     ...Object.values(match.title).filter(title => typeof title === "string"),
//     ...match.synonyms
//   ];
//   let next = new Date(match.nextAiringEpisode?.airingAt * 1000);
//   return {
//     title: match.title.romaji,
//     jp: match.title.native,
//     alts,
//     link: `https://anilist.co/anime/${match.id}`,
//     malLink: `https://myanimelist.net/anime/${match.idMal}`,
//     format: formatMap[match.format],
//     year: match.startDate.year,
//     status: statusMap[match.status],
//     genres: match.genres.join(", "),
//     description: match.description,
//     episodes: match.episodes,
//     ...match.nextAiringEpisode && {
//       nextEpisode: match.nextAiringEpisode.episode,
//       next: {
//         days: Math.floor(
//             match.nextAiringEpisode.timeUntilAiring / (60 * 60 * 24)),
//         hours: Math.floor(
//             match.nextAiringEpisode.timeUntilAiring / (60 * 60)) % 24,
//         minutes: Math.floor(match.nextAiringEpisode.timeUntilAiring / 60)
//             % 60,
//         url: `https://www.timeanddate.com/worldclock/fixedtime.html?iso=${
//             next.getUTCFullYear().toString().padStart(4, '0')
//         }${
//             (next.getUTCMonth() + 1).toString().padStart(2, '0')
//         }${
//             next.getUTCDate().toString().padStart(2, '0')
//         }T${
//             next.getUTCHours().toString().padStart(2, '0')
//         }${
//             next.getUTCMinutes().toString().padStart(2, '0')
//         }`
//       }
//     },
//     distance: Math.min(...alts.map(alt => wdl(query, alt)))
//   };
// }

// const manga1 = {
//   preprocess(match, query) {
//     let alts = [
//       ...Object.values(match.title).filter(title => typeof title === "string"),
//       ...match.synonyms
//     ];
//     return {
//       alts,
//       distance: Math.min(...alts.map(alt => wdl(query, alt))),
//       match
//     };
//   }
// };
//
// function manga0(match, query) {
//   let alts = [
//     ...Object.values(match.title).filter(title => typeof title === "string"),
//     ...match.synonyms
//   ];
//   return {
//     title: match.title.romaji,
//     jp: match.title.native,
//     alts,
//     link: `https://anilist.co/manga/${match.id}`,
//     malLink: `https://myanimelist.net/manga/${match.idMal}`,
//     format: formatMap[match.format],
//     year: match.startDate.year,
//     status: statusMap[match.status],
//     genres: match.genres.join(", "),
//     description: match.description,
//     volumes: match.volumes,
//     chapters: match.chapters,
//     distance: Math.min(...alts.map(alt => wdl(query, alt)))
//   };
// }

function manga(entry, query="") {
  if (!entry.preprocessed) {
    entry = preprocess(entry);
  }
  let match = entry.match;
  return {
    title: match.title.romaji,
    jp: match.title.native,
    alts: entry.alts,
    link: `https://anilist.co/manga/${match.id}`,
    malLink: `https://myanimelist.net/manga/${match.idMal}`,
    format: formatMap[match.format],
    year: match.startDate.year,
    status: statusMap[match.status],
    genres: match.genres.join(", "),
    description: match.description,
    volumes: match.volumes,
    chapters: match.chapters,
    distance: entry.distance
  };
}

function mangaLink(entry) {
  let match = entry.preprocessed ? entry.match : entry;
  return `https://anilist.co/manga/${match.id}`;
}

async function fromQuery(query, q, transformer) {
  try {
    let res = await fetch(uri, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        query: q,
        variables: {
          search: query
        }
      })
    });
    let matches = (await res.json()).data.Page.media;
    if (matches.length === 0) {
      return null;
    }
    let entry = matches.map(match => preprocess(match, query)).reduce(
        (acc, entry) => entry.distance < acc.distance ? entry : acc);
    if (entry.distance / query.length > 0.5) {
      return null;
    }
    return transformer(entry);
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function fromId(id) {
  try {
    let res = await fetch(uri, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        query: idQuery,
        variables: {
          id: id
        }
      })
    });
    let match = (await res.json()).data.Page.media[0];
    if (match) {
      return anime(match, match.title);
    } else {
      return null;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}

module.exports = {
  async animeFromQuery(query) {
    return fromQuery(query, animeQuery, anime);
  },
  async animeFromId(id) {
    return fromId(id, anime);
  },
  async getAnimeLink(query) {
    return fromQuery(query, animeQuery, animeLink);
  },
  async mangaFromQuery(query) {
    return fromQuery(query, mangaQuery, manga);
  },
  async mangaFromId(id) {
    return fromId(id, manga);
  },
  async getMangaLink(query) {
    return fromQuery(query, mangaQuery, mangaLink);
  },
  async lightFromQuery(query) {
    return fromQuery(query, lightQuery, manga);
  },
  async lightFromId(id) {
    return fromId(id, manga);
  },
  async getlightLink(query) {
    return fromQuery(query, animeQuery, mangaLink);
  }
}

// (async () => {
//   let result = await module.exports.animeFromQuery("oshi no ko");
//   console.log();
// })().then(() => process.exit());
