const {JSDOM} = require("jsdom");
const jquery = require("jquery");

const wdl = require("./wdl");

async function getLink(query, category) {
  try {
    let $ = jquery(
        (await JSDOM.fromURL(`https://www.anime-planet.com/${category}/all?` +
            new URLSearchParams({name: query}))).window);
    // [...$(`ul[data-type="${category}"] > li > a`)]
    // .map(e => [$(e).find('.cardName').text(), e.href])
    // .reduce((acc, x) => ({...acc, [x[0]]: x[1]}), {})
    let entry = [...$(`ul[data-type="${category}"] > li > a`)].reduce(
        (acc, a) => {
          let distance = wdl(query, $(a).find('.cardName').text());
          return (distance < acc.distance) ? {
            link: a.href,
            distance
          } : acc;
        }, {distance: Infinity});
    if (!entry) {
      return null;
    }
    return entry.distance / query.length < 0.5 ? entry.link : null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  async getAnimeLink(query) {
    return getLink(query, "anime");
  },
  async getMangaLink(query) {
    return getLink(query, "manga");
  },
};
