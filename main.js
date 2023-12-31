const fs = require("fs");
const NRAW = require("node-reddit-api-wrapper");
const {NodeHtmlMarkdown} = require("node-html-markdown");
const markdownEscape = str => require('markdown-escape')(String(str));

require("dotenv").config();

const AL = require("./al");
const AP = require("./ap");
const KIT = require("./kit");
const MAL = require("./mal");

const mentionStr = "u/" + process.env.REDDIT_USERNAME;

const userBlacklist = ["AutoModerator"];
const subredditBlacklist = ["anime"];

let promise = Promise.resolve();

const methods = {
  anime: {
    AL: {
      query: AL.animeFromQuery,
      link: AL.getAnimeLink
    },
    AP: {
      query: AP.animeFromQuery,
      link: AP.getAnimeLink
    },
    KIT: {
      query: KIT.animeFromQuery,
      link: KIT.getAnimeLink
    },
    MAL: {
      query: MAL.animeFromQuery,
      link: MAL.getAnimeLink
    },
  },
  manga: {
    AL: {
      query: AL.mangaFromQuery,
      link: AL.getMangaLink
    },
    AP: {
      query: AP.mangaFromQuery,
      link: AP.getMangaLink
    },
    KIT: {
      query: KIT.mangaFromQuery,
      link: KIT.getMangaLink
    },
    MAL: {
      query: MAL.mangaFromQuery,
      link: MAL.getMangaLink
    },
  },
  light: {
    AL: {
      query: AL.lightFromQuery,
      link: AL.getlightLink
    },
    AP: {
      query: AP.mangaFromQuery,
      link: AP.getMangaLink
    },
    KIT: {
      query: KIT.mangaFromQuery,
      link: KIT.getMangaLink
    },
    MAL: {
      query: MAL.lightFromQuery,
      link: MAL.getlightLink
    },
  }
};

async function storeEntryHelper(entries, data, type, linksLambda) {
  if (entries.has(data.link)) {
    let entry = entries.get(data.link);
    if (entry.type.toUpperCase() === type) {
      entry.type = type;
    }
  } else {
    entries.set(data.link, {type, links: await linksLambda(), data});
  }
}

async function storeEntry(entries, query, type) {
  let method = methods[type.toLowerCase()];
  let data = await method.AL.query(query);
  if (data) {
    await storeEntryHelper(entries, data, type, async () => ({
      AL: data.link,
      KIT: await method.KIT.link(query),
      MAL: data.malLink,
      AP: await method.AP.link(query)
    }));
  } else if ((data = await method.KIT.query(query))) {
    await storeEntryHelper(entries, data, type, async () => ({
      KIT: data.link,
      MAL: await method.MAL.link(query),
      AP: await method.AP.link(query),
    }));
  } else if ((data = await method.MAL.query(query))) {
    await storeEntryHelper(entries, data, type, async () => ({
      MAL: data.link,
      AP: await method.AP.link(query),
    }));
  } else if ((data = await method.AP.query(query))) {
    await storeEntryHelper(entries, data, type, async () => ({
      AP: data.link,
    }));
  }
}

function entryToText(entry, mode) {
  let expanded = mode === 0 && entry.type === entry.type.toUpperCase();
  let links = entry.links;
  let data = entry.data;
  let linkTexts = [];
  if (links.AL) {
    linkTexts.push(`[AL](${markdownEscape(links.AL)})`);
  }
  if (links.AP) {
    linkTexts.push(`[A-P](${markdownEscape(links.AP)})`);
  }
  if (links.KIT) {
    linkTexts.push(`[KIT](${markdownEscape(links.KIT)})`);
  }
  if (links.MAL) {
    linkTexts.push(`[MAL](${markdownEscape(links.MAL)})`);
  }
  if (expanded) {
    let info = [];
    if (data.format) {
      info.push(`**${markdownEscape(data.format)}**`);
    }
    if (data.year) {
      info.push(`**${markdownEscape(String(data.year))}**`);
    }
    if (data.status) {
      info.push(`**Status:** ${markdownEscape(data.status)}`);
    }
    if (data.episodes) {
      info.push(`**Episodes:** ${markdownEscape(data.episodes)}`);
    }
    if (data.volumes) {
      info.push(`**Volumes:** ${markdownEscape(data.volumes)}`);
    }
    if (data.chapters) {
      info.push(`**Chapters:** ${markdownEscape(data.chapters)}`);
    }
    if (data.genres) {
      info.push(`**Genres:** ${markdownEscape(data.genres.join(", "))}`);
    }
    return `
**${markdownEscape(data.title)}** - (${linkTexts.join(", ")})
${
        data.jp ? `
^(${markdownEscape(data.jp)})
` : ""
    }
^(${info.join(" \\| ")})
${
        data.next && data.nextEpisode ? String.raw`
^([Episode ${
            markdownEscape(data.nextEpisode)
        } airs in ${
            markdownEscape(data.next.days)
        } days, ${
            markdownEscape(data.next.hours)
        } hours, ${
            markdownEscape(data.next.minutes)
        } minutes](${markdownEscape(data.next.url)}))
` : ""
    }
${NodeHtmlMarkdown.translate(`<blockquote>${data.description}</blockquote>`)}
`;
  } else if (mode === 1) {
    let info = [];
    if (data.format) {
      info.push(`${markdownEscape(data.format)}`);
    }
    if (data.status) {
      info.push(`Status: ${markdownEscape(data.status)}`);
    }
    if (data.episodes) {
      info.push(`Episodes: ${markdownEscape(data.episodes)}`);
    }
    if (data.volumes) {
      info.push(`Volumes: ${markdownEscape(data.volumes)}`);
    }
    if (data.chapters) {
      info.push(`Chapters: ${markdownEscape(data.chapters)}`);
    }
    if (data.genres) {
      info.push(`Genres: ${markdownEscape(data.genres.join(", "))}`);
    }
    return `
**${markdownEscape(entry.title)}** - (${linkTexts.join(", ")})

^(${info.join(" \\| ")})`;
  } else {
    return `
**${markdownEscape(entry.title)}** - (${linkTexts.join(", ")})`;
  }
}

async function messageHandler(message) {
  try {
    console.log("handling message", message);
    let body = message.body();
    let isSelf = message.data.author === process.env.REDDIT_USERNAME;
    if (!(message instanceof NRAW.T1) || body.search("!sauce") < 0 || (!isSelf
        && body.search(mentionStr) < 0) || userBlacklist.includes(
        message.data.author) || subredditBlacklist.includes(
        message.data.subreddit)) {
      return;
    }
    let entries = new Map();
    let count = 0;
    for (let {groups} of body.matchAll(
        /(?<!\{)\{(?<anime>[^{}\n]+)}|\{\{(?<ANIME>[^{}\n]+)}}|(?<!<)<(?<manga>[^<>\n]+)>|<<(?<MANGA>[^<>\n]+)>>|(?<!])](?<light>[^\]\[\n]+)\[|]](?<LIGHT>[^\]\[\n]+)\[\[/g)) {
      if (entries.size > 30) {
        break;
      } else {
        ++count;
      }
      switch (false) {
        case !groups.anime:
          await storeEntry(entries, groups.anime, "anime");
          break;
        case !groups.ANIME:
          await storeEntry(entries, groups.ANIME, "ANIME");
          break;
        case !groups.manga:
          await storeEntry(entries, groups.manga, "manga");
          break;
        case !groups.MANGA:
          await storeEntry(entries, groups.MANGA, "MANGA");
          break;
        case !groups.light:
          await storeEntry(entries, groups.light, "light");
          break;
        case !groups.LIGHT:
          await storeEntry(entries, groups.LIGHT, "LIGHT");
          break;
      }
    }
    let commentReply = "";
    if (entries.size === 0) {
      return;
    } else if (entries.size === 1) {
      commentReply += entryToText(entries.values().next().value, 0);
    } else if (entries.size <= 10) {
      for (let entry of entries.values()) {
        commentReply += entryToText(entry, 1);
      }
    } else {
      for (let entry of entries.values()) {
        commentReply += entryToText(entry, 2);
      }
    }
    commentReply += String.raw`
---

^(**If you want me to comment the sauce, just mention me and include !sauce and the title in Roboragi style in your comment.**)

^(\{anime\}, \<manga\>, \]LN\[${entries.size > 10
        ? String.raw`\(${entries.size}/${count}\)` : ""})`;

    commentReply = commentReply.trim();
    if (isSelf) {
      if (body.search("!!sauce") < 0) {
        await message.append("\n\n---\n\n" + commentReply);
      } else {
        await message.edit(commentReply);
      }
    } else {
      await message.reply(commentReply.trim());
      await message.read();
    }
  } catch (e) {
    console.error(e);
  }
}

(async () => {
  console.log("logging in...");
  const reddit = fs.existsSync("./cookies.json") ?
      NRAW.fromFile("./cookies.json") :
      await NRAW.fromCredentials(process.env.REDDIT_USERNAME,
          process.env.REDDIT_PASSWORD);
  reddit.saveCookies("./cookies.json");
  console.log("logged in");

  let paramsSelf = {
    "sort": "new",
    "before": (await NRAW.Listing.fromPath(reddit,
        `/user/${process.env.REDDIT_USERNAME}/comments.json`,
        {"sort": "new"})).first().data.name
  };

  let paramsUnread = {
    "sort": "new",
    "before": (await reddit.message_unread({"sort": "new"})).first().data.name
  };

  function runner() {
    promise = new Promise(async resolve => {
      let promises = [];
      try {
        await promise;
        for await (let message of await reddit.message_unread(paramsUnread)) {
          paramsUnread.before = message?.data?.name ?? paramsUnread.before;
          promises.push(messageHandler(message));
        }
        for await (let message of await NRAW.Listing.fromPath(reddit,
            `/user/${process.env.REDDIT_USERNAME}/comments.json`, paramsSelf)) {
          paramsSelf.before = message?.data?.name ?? paramsSelf.before;
          promises.push(messageHandler(message));
        }
      } catch (e) {
        console.error(e);
      } finally {
        try {
          await Promise.all(promises);
        } catch (e) {
          console.error(e);
        } finally {
          resolve();
        }
      }
    });
  }

  // runner();

  const intervalId = setInterval(runner, 1000 * 60);

  async function shutdown() {
    process.stdin.setRawMode(false);
    console.log("shutting down...");
    clearInterval(intervalId);
    await promise;
    console.log("saving cookies...");
    reddit.saveCookies("./cookies.json");
    console.log("done");
    process.exit();
  }

  process.stdin.setRawMode(true);
  process.stdin.on('data', data => {
    switch (data.toString()) {
      case "\r":
      case "\n":
      case "\r\n":
        runner();
        break;
      case "\x03":
        shutdown();
        break;
    }
  });

  process.on('SIGINT', shutdown);
  process.on('SIGQUIT', shutdown);
  process.on('SIGTERM', shutdown);
})();
