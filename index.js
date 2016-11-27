const Botkit = require('botkit');
const request = require('request');
// const fetch = require('node-fetch');
// const streamBuffers = require('stream-buffers');

const createDictionary = require('./lib/wotd');

if (!process.env.SLACK_BOT_TOKEN) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

const controller = Botkit.slackbot({
    debug: true,
});

const bot = controller.spawn({
    token: process.env.SLACK_BOT_TOKEN
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
            ({word}) => bot.reply(message, `Today's word is *${word}*`),
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

                downloadMedia(uk)
                    .then(
                        file => {    
                            bot.api.files.upload({
                                file,
                                filename: `${word}-uk.mp3`,
                                title: `${word} - UK`,
                                channels: message.channel
                            },
                            (...params) => console.log('upload result', params))
                        },
                        err => console.error('Error fetching media', err)
                    )
                    .then(
                        null,
                        err => console.error('Error uploading media', err)
                    )
                
            },
            (err) => bot.reply(message, `I'm having trouble finding a word`)
        );
});