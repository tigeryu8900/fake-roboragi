const wdl = require("./wdl");
const utils = require("./utils");
const {attributeNames} = require("jsdom/lib/jsdom/living/attributes");

const uri = "https://kitsu.io/api/edge";
const headers = {
  "Accept": "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json"
};
const statusMap = utils.fallbackObject({
  current: "Releasing",
  finished: "Finished"
}, "Not Yet Released");
const genresMapPromise = (async () => {
  let res = await fetch(uri + "/genres");
  return {...(await res.json()).data.map(genre => ({
    [genre.id]: genre.attributes.name
  }))};
})();

function preprocess(match, query) {
  return utils.preprocess(match, query, [
    ...Object.values(match.attributes.titles),
    match.attributes.canonicalTitle,
    ...match.attributes.abbreviatedTitles
  ]);
}

async function anime(entry, query="") {
  if (!entry.preprocessed) {
    entry = preprocess(entry, query);
  }
  let match = entry.match;
  let attributes = match.attributes;
  let genresRes = await fetch(match.relationships.genres.self);
  let genresMap = await genresMapPromise;
  return {
    title: attributes.titles.en_jp,
    jp: attributes.titles.ja_jp,
    alts: entry.alts,
    link: `https://kitsu.io/anime/${attributes.slug}`,
    format: attributes.subtype,
    year: parseInt(attributes.startDate.match(/\d{4}/)[0]),
    status: statusMap[match.status],
    genres: (await genresRes.json()).data.map(genre => genresMap[genre.id]),
    description: attributes.description,
    episodes: match.episodes,
    distance: entry.distance
  }
}

function animeLink(entry) {
  let match = entry.preprocessed ? entry.match : entry;
  return `https://kitsu.io/anime/${match.attributes.slug}`;
}

async function manga(entry, query="") {
  if (!entry.preprocessed) {
    entry = preprocess(entry);
  }
  let match = entry.match;
  let attributes = match.attributes;
  let genresRes = await fetch(match.relationships.genres.self);
  let genresMap = await genresMapPromise;
  return {
    title: attributes.titles.en_jp,
    jp: attributes.titles.ja_jp,
    alts: entry.alts,
    link: `https://kitsu.io/manga/${attributes.slug}`,
    format: attributes.subtype,
    year: parseInt(attributes.startDate.match(/\d{4}/)[0]),
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
  return `https://kitsu.io/manga/${match.attributes.slug}`;
}

async function fromQuery(query, category, transformer) {
  try {
    let res = await fetch(uri + `/${category}?` + new URLSearchParams({
      "filter[text]": query
    }), {
      method: "get",
      headers: {
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json"
      }
    });
    let matches = (await res.json()).data;
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

async function fromId(id, category, transformer) {
  try {
    let res = await fetch(uri + `/${category}/${id}`, {
      method: "get",
      headers: {
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json"
      }
    });
    let match = (await res.json()).data;
    if (!match) {
      return null;
    }
    return transformer(preprocess(match, ""));
  } catch (e) {
    console.error(e);
    return null;
  }
}

module.exports = {
  async animeFromQuery(query) {
    return fromQuery(query, "anime", anime);
  },
  async animeFromId(id) {
    return fromId(id, "anime", anime);
  },
  async getAnimeLink(query) {
    return fromQuery(query, "anime", animeLink);
  },
  async mangaFromQuery(query) {
    return fromQuery(query, "manga", manga);
  },
  async mangaFromId(id) {
    return fromId(id, "manga", manga);
  },
  async getMangaLink(query) {
    return fromQuery(query, "manga", mangaLink);
  },
};
