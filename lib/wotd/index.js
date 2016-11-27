const fetch = require('node-fetch');
const cheerio = require('cheerio');

const DICTIONARY_HOME = 'https://dictionary.cambridge.org/dictionary/english/';

const get = url => (
  fetch(url)
      .then(res => res.text())
);

const wotd = doc => (
  doc('.wotd-hw').text()
);

const wordOnPage = doc => (
  doc('.headword').slice(0,1).text()
);

const link = doc => (
  doc('a.a--rev.a--b').attr('href')
);

const audio = (doc, region, format='mp3') => (
  doc(`.pron-info .audio_play_button.${region}`).attr(`data-src-${format}`)
);

const gtranslate = (word) => (
  `https://translate.google.com/#en/de/${encodeURIComponent(word)}`
);

const word = url => {
  return get(url)
    .then(
      html => {
        const doc = cheerio.load(html);
        const word = wordOnPage(doc);
        return {
          word,
          link: url,
          uk: audio(doc, 'uk'),
          us: audio(doc, 'us'),
          gtranslate: gtranslate(word),
        };
      }
    )
}

const forSpecificWord = wrd => {
  return word(`https://dictionary.cambridge.org/dictionary/english/${wrd}`);
}

const today = () => {
  return get(DICTIONARY_HOME)
    .then(
      html => {
        const doc = cheerio.load(html);
        const url = link(doc);

        return word(url);
      },
      err => console.error('Error loading URL', err)
    )
    .then(
      null,
      err => console.error('Error processing page', err)
    )
}

module.exports = () => (
    {
        wordOfTheDay: today,
        word: forSpecificWord,
    }
);