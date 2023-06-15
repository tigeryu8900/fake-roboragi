const {JSDOM} = require("jsdom");
const jquery = require("jquery");

const wdl = require("./wdl");

function getEntry(entries, query) {
  let entry = [...entries].reduce(
      (acc, a) => {
        let frag = JSDOM.fragment(a.title.trim());
        let english = frag.querySelector('h5').textContent.trim();
        let romaji = frag.querySelector('h6').textContent.slice(11).trim();
        let distance = Math.min(wdl(query, english), wdl(query, romaji));
        return (distance < acc.distance) ? {
          link: a.href,
          title: romaji,
          frag,
          distance
        } : acc;
      }, {distance: Infinity}
  );
  return entry.distance / query.length < 0.5 ? entry : null;
}

async function getLink(query, category) {
  let win = (await JSDOM.fromURL(`https://www.anime-planet.com/${category}/all?` +
      new URLSearchParams({name: query}))).window;
  if (win.location.pathname === `/${category}/all`) {
    return getEntry(jquery(win)(`ul[data-type="${category}"] > li > a`), query).link;
  } else {
    return win.location.href;
  }
}

const animePattern = /\s*(.*?)\s*\((\d+(\+?)) \w+\)/;
const mangaPattern = /Vol:\s*(\d+(\+?))\s*;\s*Ch:\s*(\d+(\+?))/;

module.exports = {
  async animeFromQuery(query) {
    let win = (await JSDOM.fromURL(`https://www.anime-planet.com/anime/all?` +
        new URLSearchParams({name: query}))).window;
    let $ = jquery(win);
    if (win.location.pathname === "/anime/all") {
      let entry = getEntry($(`ul[data-type="anime"] > li > a`), query);
      if (!entry) {
        return null;
      }
      let frag = entry.frag;
      let [, format, plus, episodes] = frag.querySelector('.type').textContent.match(animePattern);
      return {
        ...entry,
        format,
        year: frag.querySelector('.iconYear').textContent.trim(),
        status: plus ? "Releasing" : "Finished",
        genres: [...frag.querySelectorAll('.tags > ul > li')].map(li => li.textContent.trim()),
        description: frag.querySelector('p').innerHTML,
        episodes: parseInt(episodes),
        distance: entry.distance
      };
    } else {
      let [, format, plus, episodes] = $('.type').text().match(animePattern);
      let notes = $('.notes p').html();
      return {
        link: win.location.href,
        title: $('h2.aka').text().slice(11).trim(),
        format,
        year: $('.iconYear').text().trim(),
        status: plus ? "Releasing" : "Finished",
        description: $('.entrySynopsis p').html() + notes ? `\n<br>\n<br>\n<i>${notes}</i>` : "",
        episodes: episodes
      };
    }
  },
  async getAnimeLink(query) {
    return getLink(query, "anime");
  },
  async mangaFromQuery(query) {
    let win = (await JSDOM.fromURL(`https://www.anime-planet.com/manga/all?` +
        new URLSearchParams({name: query}))).window;
    let $ = jquery(win);
    if (win.location.pathname === "/manga/all") {
      let entry = getEntry($(`ul[data-type="manga"] > li > a`), query);
      if (!entry) {
        return null;
      }
      let frag = entry.frag;
      let [, volumes, vPlus, chapters, cPlus] = frag.querySelector('.type').textContent.match(mangaPattern);
      return {
        ...entry,
        format: "Manga",
        year: frag.querySelector('.iconYear').textContent.trim(),
        status: (vPlus || cPlus) ? "Releasing" : "Finished",
        genres: [...frag.querySelectorAll('.tags > ul > li')].map(li => li.textContent.trim()),
        description: frag.querySelector('p').innerHTML,
        volumes,
        chapters,
        distance: entry.distance
      };
    } else {
      let [, volumes, vPlus, chapters, cPlus] = frag.querySelector('.type').textContent.match(mangaPattern);
      let notes = $('.notes p').html();
      return {
        link: win.location.href,
        title: $('h2.aka').text().slice(11).trim(),
        format: "Manga",
        year: $('.iconYear').text().trim(),
        status: (vPlus || cPlus) ? "Releasing" : "Finished",
        description: $('.entrySynopsis p').html() + notes ? `\n<br>\n<br>\n<i>${notes}</i>` : "",
        volumes,
        chapters
      };
    }
  },
  async getMangaLink(query) {
    return getLink(query, "manga");
  },
};
