const wdl = require("./wdl");
module.exports = {
  fallbackObject(object, fallback) {
    return new Proxy(object, {
      get(target, name) {
        return target.hasOwnProperty(name) ? target[name] : fallback;
      }
    });
  },
  nextOccurrence(day, hours, minutes, offset="+0900") {
    let now = new Date(Date.now());
    let next = new Date(now);
    next.setUTCDate(next.getUTCDate() + (7 - next.getUTCDay() + day) % 7);
    next.setUTCHours(hours);
    next.setUTCMinutes(minutes);
    next.setUTCSeconds(0);
    next.setUTCMilliseconds(0);
    next = new Date(next.toISOString().slice(0, -1) + offset);
    if (next < now) {
      next.setUTCDate(next.getUTCDate() + 7);
    }
    let diff = next - now;
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor(diff / (1000 * 60 * 60)) % 24,
      minutes: Math.floor(diff / (1000 * 60)) % 60,
      date: next,
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
      }`,
      now
    }
  },
  preprocess(match, query, alts) {
    return {
      alts,
      distance: Math.min(...alts.map(alt => wdl(query, alt))),
      match,
      preprocessed: true
    }
  }
};
