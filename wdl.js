function generateKeyboard(str, i0, j0, shift) {
  return str.split('')
  .map((c, i) => ({[c]: [i0, j0 + i, shift]}))
  .reduce((acc, x) => ({...acc, ...x}));
}

const keyboard = {
  ...generateKeyboard("`1234567890-=", 0, 0, false),
  ...generateKeyboard("~!@#$%^&*()_+", 0, 0, true),
  ...generateKeyboard("qwertyuiop[]\\", 1, 1.5, false),
  ...generateKeyboard("QWERTYUIOP{}|", 1, 1.5, true),
  ...generateKeyboard("asdfghjkl;'", 2, 1.75, false),
  ...generateKeyboard("ASDFGHJKL:\"", 2, 1.75, true),
  ...generateKeyboard("zxcvbnm,./", 3, 2.25, false),
  ...generateKeyboard("ZXCVBNM<>?", 3, 2.25, true),
};

const alphaNumPattern = /[A-Za-zÀ-ÖØ-öø-ÿ0-9\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;
const alphaNumGlobalPattern = /[A-Za-zÀ-ÖØ-öø-ÿ0-9\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/g;
const nonAlphaNumWeight = 0.2;
const closeChars = [
  new Set(['"', '“', '”', '„', '“', '”']),
  new Set(["'", '‘', '’', '‚', ',', '‘', '’', '`']),
  new Set(['?', '？']),
  new Set(['!', '！']),
  new Set(['<', '《', '«']),
  new Set(['>', '》', '»']),
  new Set(['[', '【', '「', '『']),
  new Set([']', '】', '」', '』'])
];

function cost(c1, c2) {
  if (c1 === c2) {
    return 0;
  }
  if (c1.normalize("NFD").charAt(0) === c2.normalize("NFD").charAt(0) ||
      closeChars.find(set => set.has(c1) && set.has(c2))) {
    return 0.05;
  }
  let p1 = keyboard[c1];
  let p2 = keyboard[c2];
  if (!p1 || !p2) {
    return 1;
  }
  let dist = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2) + (p1[2]
      !== p2[2]);
  return dist / (dist + 1);
}

module.exports = function wdl(s1, s2, useDamerau = true) {
  s1 = s1.normalize();
  s2 = s2.normalize();
  if (s1.length === 0) {
    let c = s2.match(alphaNumGlobalPattern)?.length ?? 0;
    return c + nonAlphaNumWeight * (s2.length - c);
  }

  if (s2.length === 0) {
    let c = s1.match(alphaNumGlobalPattern)?.length ?? 0;
    return c + nonAlphaNumWeight * (s1.length - c);
  }

  let d = [[0]];

  for (let i = 0; i < s1.length; ++i) {
    d[i + 1] = [d[i][0] + (alphaNumPattern.test(s1.charAt(i)) ? 1
        : nonAlphaNumWeight)];
  }

  for (let j = 0; j < s2.length; ++j) {
    d[0][j + 1] = d[0][j] + (alphaNumPattern.test(s2.charAt(j)) ? 1
        : nonAlphaNumWeight);
  }

  for (let i = 0; i < s1.length; ++i) {
    for (let j = 0; j < s2.length; ++j) {
      let c1 = s1.charAt(i);
      let c2 = s2.charAt(j);
      let subCostIncrement = cost(c1, c2);

      const delCost = d[i][j + 1] + (alphaNumPattern.test(c1) ? 1
          : nonAlphaNumWeight);
      const insCost = d[i + 1][j] + (alphaNumPattern.test(c2) ? 1
          : nonAlphaNumWeight);
      const subCost = d[i][j] + subCostIncrement;

      let min = Math.min(delCost, insCost, subCost);

      if (useDamerau && min > 0) {
        if (i > 0 && j > 0
            && s1.charAt(i) === s2.charAt(j - 1)
            && s1.charAt(i - 1) === s2.charAt(j)) {
          const transCost = d[i - 1][j - 1] + subCostIncrement;

          if (transCost < min) {
            min = transCost;
          }
        }
      }

      d[i + 1][j + 1] = min;
    }
  }

  return d[s1.length][s2.length];
};
