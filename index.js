const Botkit = require('botkit');
const request = require('request');
// const fetch = require('node-fetch');
// const streamBuffers = require('stream-buffers');

const createDictionary = require('./lib/wotd');

if (!process.env.SLACK_TOKEN) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

const controller = Botkit.slackbot({
    debug: true,
});

const bot = controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM();

const dictionary = createDictionary();

const downloadMedia = url => (
    Promise.resolve(request(url))
    // fetch(url)
    //     .then(response => response.buffer())
    //     .then(buff => {
    //         var stream = new streamBuffers.ReadableStreamBuffer({});
    //         stream.put(buff);
    //         return stream;
    //     })
);

const uploadFileToChannel = (url, word, locale, message) => {
    downloadMedia(url)
        .then(
            file => {    
                bot.api.files.upload({
                    file,
                    filename: `${word}-${locale}.mp3`,
                    title: `${word} - ${locale}`,
                    channels: message.channel
                },
                (err, { ok, file }) => {
                    if (!err && ok === true) {
                    }
                })
            },
            err => console.error('Error fetching media', err)
        )
        .then(
            null,
            err => console.error('Error uploading media', err)
        )
}

controller.hears(['wotd'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });

    dictionary.wordOfTheDay()
        .then(
            ({word, uk, us}) => {

                const replies = [
                    `Today's word is *${word}*`
                ];

                if (!uk && !us) {
                   replies.push(`It's unpronounceable!`);
                }

                bot.reply(message, replies.join(' '));


                if (uk) {
                    uploadFileToChannel(uk, word, 'UK', message);
                }

                if (us) {
                    uploadFileToChannel(us, word, 'US', message);
                }
            },
            (err) => bot.reply(message, `I'm having trouble finding a word`)
        );

});

controller.hears(['how do you say (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {

    const requestedWord = message.match[1];

    if (!requestedWord) {
        return;
    }

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });

    dictionary.word(requestedWord)
        .then(
            ({ word, uk, us }) => {
                bot.reply(message, {
                    text: `How do you say ${word} in <${uk}|UK> or <${us}|US>?`,
                });

               if (!uk && !us) {
                    bot.reply(message, `It's unpronounceable!`);
                }

                if (uk) {
                    uploadFileToChannel(uk, word, 'UK', message);
                }

                if (us) {
                    uploadFileToChannel(us, word, 'US', message);
                }
                
            },
            (err) => bot.reply(message, `I'm having trouble finding a word`)
        );
});