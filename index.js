var items = require("./items.js");
var key = require("./key.js");
const Discord = require("discord.js");
const bot = new Discord.Client();
const https = require('https');
const axios = require('axios');
var _ = require('lodash');
const express = require('express');
var moment = require('moment');
// START vega-demo.js
const vega = require('vega');
const fs = require('fs');

const app = express()
const port = 3000

app.get('/', (req, res) => res.send('Albion Price Bot is online!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

console.log("starting bot...");
const mainURL = 'https://www.albion-online-data.com/api/v2/stats';
const imageURL = "https://gameinfo.albiononline.com/api/gameinfo/items/";
const botID = "703966342159794176";
const botName = "PricesBot";

bot.on("message", (message) => {
    console.log(message);

    if (message.author.username === botName) {
        return;
    }

    if (message.content === "ping") {
        message.channel.send("pong");
    } else if (message.content === "-help") {
        message.channel.send("```Available Commands:\n-help <Help list>\n-ping <test>\n-fetchsell-[items]-[locations]-[quality]-[enchantment] <e.g: -fetchsell-t4_bag-marlock,bridgewatch-0-@1>\n-fetchbuy-[items]-[locations]-[quality]-[enchantment] <e.g: -fetchbuy-t4_bag-marlock,bridgewatch-0-@1>\n-items-all <Show link to all item names>\n-items-[part of name] <e.g: t4_>```");
    } else if (message.content === "-items-all") {
        message.channel.send("https://github.com/broderickhyman/ao-bin-dumps/blob/master/formatted/items.txt");
    } else if (message.content.indexOf("-items-") !== -1) {
        let itemSearchPart = message.content.replace("-items-", "");
        let searchResults = searchItem(itemSearchPart);

        let finalResultsString = _.join(searchResults, "\n");

        if (finalResultsString === "") {
            message.channel.send("Nothing found, make sure you use proper commands, for help type -help");
        } else {
            message.channel.send("```" + finalResultsString + "```");
        }

    } else if (message.content.indexOf("-fetchbuy-") !== -1) {
        let splitMessage = message.content.split("-");
        console.log(splitMessage);
        let what = splitMessage[2] || "t2_bag";
        let where = splitMessage[3] || "all";
        let quality = splitMessage[4] || 0; // 0-5, 0 is ALL qualities
        let enchantment = splitMessage[5] || ""; // @1, @2, @3
        message.channel.send("Sell prices for **" + what + "** at **" + where + "** ...");
        // fix for all cities //
        if (where === "all") {
            where = "bridgewatch,martlock,lymhurst,thetford,fortsterling,caerleon";
        }

        fetchPrices(what, where, quality, enchantment, (data) => {
            console.log(data);

            if (data.length === 0) {
                message.channel.send("Nothing found, make sure you use proper commands, for help type -help");
            }

            data = _.sortBy(data, function(o) {
                return o.buy_price_max;
            });

            console.log(">>>>> ", data);
            let graphPrices = [];
            let topPrices = [];
            let locations = where.split(",");
            //console.log(locations);
            if (locations.length > 1) {
                _.forEach(locations, (o) => {
                    let cityLocations = _.filter(data, (d) => {

                        if (d.city.replace(" ", "").toLowerCase() === o.toLowerCase() && d.buy_price_min > 0) {
                            return true;
                        } else {
                            return false;
                        }
                    });

                    console.log("LOCATIONS: ", cityLocations);
                    if (cityLocations.length >= 3) {
                        topPrices.push(formatBuyPrice(cityLocations[2]));
                        topPrices.push(formatBuyPrice(cityLocations[1]));
                        topPrices.push(formatBuyPrice(cityLocations[0]));
                        graphPrices.push(cityLocations[0]);
                        graphPrices.push(cityLocations[1]);
                        graphPrices.push(cityLocations[2]);
                    } else if (cityLocations.length >= 2) {
                        topPrices.push(formatBuyPrice(cityLocations[1]));
                        topPrices.push(formatBuyPrice(cityLocations[0]));
                        graphPrices.push(cityLocations[0]);
                        graphPrices.push(cityLocations[1]);
                    } else if (cityLocations.length === 1) {
                        topPrices.push(formatBuyPrice(cityLocations[0]));
                        graphPrices.push(cityLocations[0]);
                    }
                });

                console.log(topPrices);


            } else {
                if (data.length >= 3) {
                    topPrices.push(formatBuyPrice(data[2]));
                    topPrices.push(formatBuyPrice(data[1]));
                    topPrices.push(formatBuyPrice(data[0]));
                    graphPrices.push(cityLocations[0]);
                    graphPrices.push(cityLocations[1]);
                    graphPrices.push(cityLocations[2]);
                } else if (data.length >= 2) {
                    topPrices.push(formatBuyPrice(data[1]));
                    topPrices.push(formatBuyPrice(data[0]));
                    graphPrices.push(cityLocations[0]);
                    graphPrices.push(cityLocations[1]);
                } else if (data.length === 1) {
                    topPrices.push(formatBuyPrice(data[0]));
                    graphPrices.push(cityLocations[0]);
                }

                console.log(topPrices);
            }

            if (topPrices.length === 0) {
                message.channel.send("Nothing found, make sure you use proper commands, for help type **-help**");
            } else {
                message.channel.send("```" + _.join(topPrices, "\n") + "```");
            }

            embedPrices(graphPrices, what);
        });

    } else if (message.content.indexOf("-fetchsell-") !== -1) {
        let splitMessage = message.content.split("-");
        console.log(splitMessage);
        let what = splitMessage[2] || "t2_bag";
        let where = splitMessage[3] || "all";
        let quality = splitMessage[4] || 0; // 0-5, 0 is ALL qualities
        let enchantment = splitMessage[5] || ""; // @1, @2, @3
        message.channel.send("prices for **" + what + "** at **" + where + "** ...");

        // fix for all cities //
        if (where === "all") {
            where = "bridgewatch,martlock,lymhurst,thetford,fortsterling,caerleon";
        }

        fetchPrices(what, where, quality, enchantment, (data) => {
            console.log(data);

            if (data.length === 0) {
                message.channel.send("Nothing found, make sure you use proper commands, for help type -help");
            }

            data = _.sortBy(data, function(o) {
                return o.sell_price_min;
            });

            console.log(">>>>> ", data);

            let topPrices = [];
            let embedPrices = [];
            let locations = where.split(",");
            //console.log(locations);
            if (locations.length > 1) {
                _.forEach(locations, (o) => {
                    let cityLocations = _.filter(data, (d) => {
                        console.log(d.city.replace(" ", "").toLowerCase(), o.toLowerCase(), d.sell_price_min, d.quality, quality);
                        if (d.city.replace(" ", "").toLowerCase() === o.toLowerCase() && d.sell_price_min > 0) {
                            return true;
                        } else {
                            return false;
                        }
                    });

                    console.log("LOCATIONS: ", cityLocations);
                    if (cityLocations.length >= 3) {
                        topPrices.push(formatPrice(cityLocations[2]));
                        topPrices.push(formatPrice(cityLocations[1]));
                        topPrices.push(formatPrice(cityLocations[0]));
                    } else if (cityLocations.length >= 2) {
                        topPrices.push(formatPrice(cityLocations[1]));
                        topPrices.push(formatPrice(cityLocations[0]));
                    } else if (cityLocations.length === 1) {
                        topPrices.push(formatPrice(cityLocations[0]));
                    }
                });

                console.log(topPrices);
            } else {
                if (data.length >= 3) {
                    topPrices.push(formatPrice(data[2]));
                    topPrices.push(formatPrice(data[1]));
                    topPrices.push(formatPrice(data[0]));
                } else if (data.length >= 2) {
                    topPrices.push(formatPrice(data[1]));
                    topPrices.push(formatPrice(data[0]));
                } else if (data.length === 1) {
                    topPrices.push(formatPrice(data[0]));
                }

                console.log(topPrices);
            }

            if (topPrices.length === 0) {
                message.channel.send("Nothing found, make sure you use proper commands, for help type **-help**");
            } else {
                message.channel.send("```" + _.join(topPrices, "\n") + "```");
            }
        });
    } else {
        message.channel.send("Sorry didn't catch that, make sure you use proper commands, for help type **-help**");
    }
});

// HELPER FUNCTIONS 

// searches all items for the given parameters
function searchItem(item) {
    let results = [];
    _.forEach(items.items, (o, key) => {
        console.log(o, key);
        if (o.toUpperCase().indexOf(item.toUpperCase()) !== -1) {
            results.push(key);
        }
    });

    return results;
}

// formats the price to be humanly readable
function formatPrice(item) {
    let diff = moment(new Date(item.sell_price_min_date));
    return "CITY: " + item.city + " -- " + "MIN PRICE: " + item.sell_price_min + " -- " + formatQuality(item.quality) + " -- UPDATED: " + diff.fromNow();
}

function formatBuyPrice(item) {
    let diff = moment(new Date(item.buy_price_min_date));
    return "CITY: " + item.city + " -- " + "MAX BUY ORDER: " + item.buy_price_max + " -- " + formatQuality(item.quality) + " -- UPDATED: " + diff.fromNow();
}

/**
 *
 *
 * @param {*} items
 * @param {*} name
 * @returns
 */
function formatEmbed(items, name) {

    var itemEmbed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Some title')
        .setURL('https://discord.js.org/')
        //.setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
        .setDescription('Price for ' + name)
        .setThumbnail(imageURL + name)
        .addFields({ name: 'Locations', value: "", inline: true }, { name: 'Min Sell Price', value: '', inline: true }, { name: 'Last Updated', value: '', inline: true }, { name: '\u200B', value: '\u200B' })
        //.addField('Inline field title', 'Some value here', true)
        //.setImage('https://i.imgur.com/wSTFkRM.png')
        .setTimestamp()
        .setFooter('Made by Netgfx');

    _.forEach(items, o => {
        itemEmbed.addField("", item.city, true);
        itemEmbed.addField("", item.buy_price_min, true);
        itemEmbed.addField("", formatQuality(item.quality));
    });

    return itemEmbed;
}

/**
 *
 *
 */
function renderGraph() {

}

// format quality
function formatQuality(quality) {
    if (quality === 1) {
        return "Normal";
    } else if (quality === 2) {
        return "Good";
    } else if (quality === 3) {
        return "Outstanding";
    } else if (quality === 4) {
        return "Excellent";
    } else if (quality === 5) {
        return "Masterpiece";
    }
}

// fetches prices for requested items, locations, qualities
function fetchPrices(items, locations, qualities, tier, callback) {

    const options = {
        hostname: mainURL,
        path: '/prices/' + escape(items + tier) + "?locations=" + locations + "&qualities=" + qualities,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }

    console.log(options.hostname + options.path);

    axios.get(options.hostname + options.path)
        .then(response => {
            console.log(response.data.url);
            console.log(response.data.explanation);

            if (callback) {
                callback(response.data);
            }

        })
        .catch(error => {
            console.log(error);
        });
}

bot.login(key.key);