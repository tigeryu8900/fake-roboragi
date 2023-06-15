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
  try {
    let win = (await JSDOM.fromURL(
        `https://www.anime-planet.com/${category}/all?` +
        new URLSearchParams({name: query}))).window;
    if (win.location.pathname === `/${category}/all`) {
      return getEntry(jquery(win)(`ul[data-type="${category}"] > li > a`),
          query).link;
    } else {
      return win.location.href;
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}

const animePattern = /\s*(.*?)\s*\((\d+(\+?)) \w+\)/;
const mangaPattern = /Vol:\s*(\d+(\+?))\s*;\s*Ch:\s*(\d+(\+?))/;

module.exports = {
  async animeFromQuery(query) {
    try {
      let win = (await JSDOM.fromURL(`https://www.anime-planet.com/anime/all?` +
          new URLSearchParams({name: query}))).window;
      let $ = jquery(win);
      if (win.location.pathname === "/anime/all") {
        let entry = getEntry($(`ul[data-type="anime"] > li > a`), query);
        if (!entry) {
          return null;
        }
        let frag = entry.frag;
        let [, format, plus, episodes] = frag.querySelector(
            '.type').textContent.match(animePattern);
        let notes = $('.notes p').html();
        return {
          ...entry,
          format,
          year: frag.querySelector('.iconYear').textContent.trim(),
          status: plus ? "Releasing" : "Finished",
          genres: [...frag.querySelectorAll('.tags > ul > li')].map(
              li => li.textContent.trim()),
          description: [...frag.querySelectorAll('p')].map(p => p.innerHTML).join("\n<br>\n") + (notes
              ? `\n<br>\n<br>\n<i>${notes}</i>` : ""),
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
          description: [...$('.entrySynopsis p')].map(p => p.innerHTML).join("\n<br>\n") + (notes
              ? `\n<br>\n<br>\n<i>${notes}</i>` : ""),
          episodes: episodes
        };
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  async getAnimeLink(query) {
    return getLink(query, "anime");
  },
  async mangaFromQuery(query) {
    try {
      let win = (await JSDOM.fromURL(`https://www.anime-planet.com/manga/all?` +
          new URLSearchParams({name: query}))).window;
      let $ = jquery(win);
      if (win.location.pathname === "/manga/all") {
        let entry = getEntry($(`ul[data-type="manga"] > li > a`), query);
        if (!entry) {
          return null;
        }
        let frag = entry.frag;
        let [, volumes, vPlus, chapters, cPlus] = frag.querySelector(
            '.iconVol').textContent.match(mangaPattern);
        let notes = $('.notes p').html();
        return {
          ...entry,
          format: "Manga",
          year: frag.querySelector('.iconYear').textContent.trim(),
          status: (vPlus || cPlus) ? "Releasing" : "Finished",
          genres: [...frag.querySelectorAll('.tags > ul > li')].map(
              li => li.textContent.trim()),
          description: [...frag.querySelectorAll('p')].map(p => p.innerHTML).join("\n<br>\n") + (notes
              ? `\n<br>\n<br>\n<i>${notes}</i>` : ""),
          volumes,
          chapters,
          distance: entry.distance
        };
      } else {
        let [, volumes, vPlus, chapters, cPlus] = $(
            '.entryBar > div:nth-child(1)').text().match(mangaPattern);
        let notes = $('.notes p').html();
        return {
          link: win.location.href,
          title: $('h2.aka').text().slice(11).trim(),
          format: "Manga",
          year: $('.iconYear').text().trim(),
          status: (vPlus || cPlus) ? "Releasing" : "Finished",
          description: [...$('.synopsisManga p')].map(p => p.innerHTML).join("\n<br>\n") + (notes
              ? `\n<br>\n<br>\n<i>${notes}</i>` : ""),
          volumes,
          chapters
        };
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  async getMangaLink(query) {
    return getLink(query, "manga");
  },
};
