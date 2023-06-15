const {JSDOM} = require("jsdom");
const jquery = require("jquery");

const utils = require("./utils");
const wdl = require("./wdl");

const fieldPattern = /^\s*.*?:\s*(.*\S)\s*$/;
const repeatPattern = /\b(\w+)\s*\1\b/g;
const whitespacePattern = /\s+/g;
const yearPattern = /\d{4}/;
const occurrencePattern = /(\w+day)s at (\d{2}):(\d{2}) \(\w+\)/;
const airedPattern = /(\w+) (\d+), (\d+) to (\w+) (\d+), (\d+)/;
const statusMap = utils.fallbackObject({
  "Not": "Not Yet Released",
  "Currently": "Releasing",
  "Finished": "Finished"
}, "Special");
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
const animeSelector = `
  div.js-categories-seasonal
  > table
  > tbody
  > tr
  > td:nth-child(2)
  > div.title
  > a.fw-b
`.replace(/\s+/g, " ");
const mangaSelector = `
  div.js-categories-seasonal
  > table
  > tbody
  > tr:has(
    > td:nth-child(3):contains("Manga"),
    > td:nth-child(3):contains("One-shot")
  )
  > td:nth-child(2)
  > a.fw-b
`.replace(/\s+/g, " ");
const lightSelector = `
  div.js-categories-seasonal
  > table
  > tbody
  > tr:has(
    > td:nth-child(3):contains("Light Novel")
  )
  > td:nth-child(2)
  > a.fw-b
`.replace(/\s+/g, " ");

async function fromLink(link) {
  let $ = jquery((await JSDOM.fromURL(link)).window);
  let title = $('h1.title-name').text();
  if (!title) {
    title = $('span.h1-title > span[itemprop="name"]').clone().children()
    .remove().end().text();
  }
  let leftside = $('div.leftside');
  let synonyms = leftside.children('h2:contains("Alternative Titles")').next();
  let alts = [
    title,
    ...synonyms.text().match(fieldPattern)[1].split(','),
    ...[
      ...synonyms.nextUntil('div.js-alternative-titles, br')
      .filter('div.spaceit_pad'),
      ...leftside.find('div.js-alternative-titles > div.spaceit_pad')
    ].map(e => e.textContent.match(fieldPattern)[1])
  ];
  let jp = leftside
  .find('div.spaceit_pad:has(> span.dark_text:contains("Japanese:"))')
  .text().match(fieldPattern)[1];
  return {title, alts, jp, link, $, leftside};
}

async function fromId(id, category) {
  return fromLink(`https://myanimelist.net/${category}/${id}`);
}

async function getEntry(query, category, selector) {
  let $ = jquery((await JSDOM.fromURL(`https://myanimelist.net/${category}.php?` +
      new URLSearchParams({q: query}))).window);
  let links = $(selector).slice(0, 5).map((i, a) => a.href);
  if (!links.length) {
    return null;
  }
  let entry = (await Promise.all(links.map(async (i, link) => {
    let result = await fromLink(link);
    let distance = Math.min(...result.alts.map(alt => wdl(query, alt)));
    return {...result, distance};
  }))).reduce((acc, entry) => entry.distance < acc.distance ? entry : acc);
  if (entry.distance / query.length > 0.5) {
    return null;
  }
  return entry;
}

async function processEntry(entry) {
  return entry ? {
    ...entry,
    format: (entry.leftside
    .children('div.spaceit_pad:has(> span.dark_text:contains("Type:"))')
    .text().match(fieldPattern) ?? [])[1],
    status: (statusMap)[(entry.leftside
    .children('div.spaceit_pad:has(> span.dark_text:contains("Status:"))')
    .text().match(fieldPattern) ?? [])[1]?.split(' ')[0]],
    genres: (entry.leftside
    .children('div.spaceit_pad:has(> span.dark_text:contains("Genres:"))')
    .text().replace(repeatPattern, "$1").replace(whitespacePattern, " ")
    .match(fieldPattern) ?? [])[1]?.split(/\s*,\s*/),
    description: entry.$('[itemprop="description"]').html(),
  } : null;
}

async function anime(entry) {
  try {
    let result = await processEntry(entry);
    if (!result) {
      return null;
    }
    let [, d, h, m] = result.leftside
    .children('div.spaceit_pad:has(> span.dark_text:contains("Broadcast:"))')
    .text().match(occurrencePattern);
    let next = utils.nextOccurrence(days.indexOf(d), parseInt(h), parseInt(m),
        "+0900");
    let episodes = parseInt((result.leftside
    .children('div.spaceit_pad:has(> span.dark_text:contains("Episodes:"))')
    .text().match(fieldPattern) ?? [])[1]);
    return Object.assign(result, {
      year: (result.leftside
      .children('div.spaceit_pad:has(> span.dark_text:contains("Aired:"))')
      .text().match(yearPattern) ?? [])[0],
      episodes,
      ...(result.status === "Releasing" && !isNaN(episodes) && (() => {
        let [,,,, y2, m2, d2] = result.leftside
        .children('div.spaceit_pad:has(> span.dark_text:contains("Aired:"))')
        .text().match(airedPattern);
        return {
          next,
          nextEpisode: episodes -
              Math.floor((new Date(`${y2} ${m2} ${d2} UTC+0900`) -
                  next.now) / (1000 * 60 * 60 * 24 * 7))
        }
      })())
    });
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function manga(entry) {
  try {
    let result = await processEntry(entry);
    if (!result) {
      return null;
    }
    return Object.assign(result, {
      volumes: parseInt(result.leftside
      .children('div.spaceit_pad:has(> span.dark_text:contains("Volumes:"))')
      .text().match(fieldPattern)[0]),
      chapters: parseInt(result.leftside
      .children('div.spaceit_pad:has(> span.dark_text:contains("Chapters:"))')
      .text().match(fieldPattern)[0])
    });
  } catch (e) {
    console.error(e);
    return null;
  }
}
async function getAnimeEntry(query) {
  return getEntry(query, "anime", animeSelector);
}

async function getMangaEntry(query) {
  return getEntry(query, "manga", mangaSelector);
}

async function getlightEntry(query) {
  return getEntry(query, "manga", lightSelector);
}

module.exports = {
  async animeFromQuery(query) {
    return anime(await getAnimeEntry(query));
  },
  async animeFromId(id) {
    return anime(await fromId(id, "anime"));
  },
  async getAnimeLink(query) {
    return (await getAnimeEntry(query)).link;
  },
  async mangaFromQuery(query) {
    return manga(await getMangaEntry(query));
  },
  async mangaFromId(id) {
    return manga(await fromId(id, "manga"));
  },
  async getMangaLink(query) {
    return (await getMangaEntry(query)).link;
  },
  async lightFromQuery(query) {
    return manga(await getlightEntry(query));
  },
  async lightFromId(id) {
    return manga(await fromId(id, "manga"));
  },
  async getlightLink(query) {
    return (await getlightEntry(query)).link;
  }
};
