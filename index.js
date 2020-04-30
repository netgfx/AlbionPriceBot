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
const vegaLite = require('vega-lite');
const fs = require('fs');

const app = express()
const port = 3000

app.get('/', (req, res) => res.send('Albion Price Bot is online!'));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

console.log("starting bot...");
const mainURL = 'https://www.albion-online-data.com/api/v2/stats';
const imageURL = "https://gameinfo.albiononline.com/api/gameinfo/items/";
const graphURL = "https://www.albion-online-data.com/api/v2/stats/charts/";

//T4_BAG ? date = 3 - 29 - 2020 & locations=martlock, bridgewatch & qualities=2 & time - scale=6"

const botID = "703966342159794176";
const botName = "PricesBot";

// Admin //
var isMaintenance = false;
var admins = ["MDobs"];

bot.on("message", (message) => {
    console.log(message);

    if (message.author.username === botName) {
        return;
    }

    // check if in maintenance mode, if yes only answer to admins //

    if (isMaintenance === true) {
        if (admins.indexOf(message.author.username) !== -1) {
            // continue
        } else {
            message.channel.send(":tools: This Bot is currently in Maintenance mode, we will boost nanites to work faster! :tools:");
            return;
        }
    }

    if (message.content === "ping") {
        message.channel.send("pong");
    } else if (message.content === "-help") {
        message.channel.send("```Available Commands:\n-help <Help list>\n-ping <test>\n-fetch-[items]-[locations]-[quality]-[enchantment] <e.g: -fetch-t4_bag-marlock,bridgewatch-0-@1>\n-fetchbuy-[items]-[locations]-[quality]-[enchantment] <e.g: -fetchbuy-t4_bag-marlock,bridgewatch-0-@1>\n-items-all <Show link to all item names>\n-items-[part of name] <e.g: t4_>```");
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

    } else if (message.content.indexOf("-fetch-") !== -1) {
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
                        topPrices.push(formatPrice(cityLocations[0]));
                        topPrices.push(formatPrice(cityLocations[1]));
                        topPrices.push(formatPrice(cityLocations[2]));
                        //
                        embedPrices.push(cityLocations[0]);
                        embedPrices.push(cityLocations[1]);
                        embedPrices.push(cityLocations[2]);
                    } else if (cityLocations.length >= 2) {
                        topPrices.push(formatPrice(cityLocations[0]));
                        topPrices.push(formatPrice(cityLocations[1]));
                        //
                        embedPrices.push(cityLocations[0]);
                        embedPrices.push(cityLocations[1]);
                    } else if (cityLocations.length === 1) {
                        topPrices.push(formatPrice(cityLocations[0]));
                        //
                        embedPrices.push(cityLocations[0]);
                    }
                });

                console.log(topPrices);
            } else {
                if (data.length >= 3) {
                    topPrices.push(formatPrice(data[0]));
                    topPrices.push(formatPrice(data[1]));
                    topPrices.push(formatPrice(data[2]));
                    //
                    embedPrices.push(cityLocations[0]);
                    embedPrices.push(cityLocations[1]);
                    embedPrices.push(cityLocations[2]);
                } else if (data.length >= 2) {
                    topPrices.push(formatPrice(data[0]));
                    topPrices.push(formatPrice(data[1]));
                    //
                    embedPrices.push(cityLocations[0]);
                    embedPrices.push(cityLocations[1]);
                } else if (data.length === 1) {
                    topPrices.push(formatPrice(data[0]));
                    //
                    embedPrices.push(cityLocations[0]);
                }

                //console.log(topPrices);
            }

            if (topPrices.length === 0) {
                message.channel.send("Nothing found, make sure you use proper commands, for help type **-help**");
            } else {
                //message.channel.send("```" + _.join(topPrices, "\n") + "```");
                message.channel.send(formatEmbed(embedPrices, what, enchantment));
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
function formatEmbed(items, name, enchantment) {

    console.log("EMBED: ");
    console.log(items);

    var itemEmbed = new Discord.MessageEmbed()
        .setColor('#ffffff')
        .setTitle('Prices for ' + name)
        //.setAuthor('Some name', 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
        //.setDescription()
        .setThumbnail(imageURL + name + enchantment)
        //.addFields({ name: 'Locations', value: " ", inline: true }, { name: 'Min Sell Price', value: ' ', inline: true }, { name: 'Last Updated', value: ' ', inline: true })
        //.addField('Inline field title', 'Some value here', true)
        //.setImage('https://i.imgur.com/wSTFkRM.png')
        .setTimestamp()
        .setFooter('Made by Netgfx');

    let citiesStr = "";
    let pricesStr = "";
    let dateStr = "";

    let citiesBuyStr = "";
    let pricesBuyStr = "";
    let dateBuyStr = "";

    _.forEach(items, item => {
        let diff = moment(new Date(item.sell_price_min_date));
        let diffBuy = moment(new Date(item.buy_price_min_date));
        console.log(item.city, item.sell_price_min, formatQuality(item.quality));
        citiesStr = citiesStr + item.city + " (" + formatQuality(item.quality) + ") " + "\n  ";
        pricesStr = pricesStr + item.sell_price_min + "\n  ";
        dateStr = dateStr + diff.fromNow() + "\n  ";

        if (item.buy_price_max > 0) {
            citiesBuyStr = citiesBuyStr + item.city + " (" + formatQuality(item.quality) + ") " + "\n  ";
            pricesBuyStr = pricesBuyStr + item.buy_price_max + "\n  ";
            dateBuyStr = dateBuyStr + diffBuy.fromNow() + "\n";
        }
        //itemEmbed.addField("&#8203;", item.city, true);
        //itemEmbed.addField("&#8203;", item.sell_price_min, true);
        //itemEmbed.addField("&#8203;", diff.fromNow()); //moment(new Date(item.sell_price_min_date)).format("MMM-D-YYYY"));
    });

    console.log(citiesStr, citiesBuyStr, pricesStr, pricesBuyStr, dateStr, dateBuyStr);
    itemEmbed.addField("Locations", citiesStr + "\n", true);
    itemEmbed.addField("‏‏‎Min Sell Price", pricesStr + "\n", true);
    itemEmbed.addField("‏‏‎Last Updated", dateStr + "\n", true);
    //
    //itemEmbed.addField(' \n', ' \n', false);
    //

    if (citiesBuyStr !== "" && pricesBuyStr !== "" && dateBuyStr !== "") {
        itemEmbed.addField("Locations", citiesBuyStr, true);
        itemEmbed.addField("‏‏‎Max Buy Price", pricesBuyStr, true);
        itemEmbed.addField("‏‏‎Last Updated", dateBuyStr, true);
    }


    return itemEmbed;
}

/**
 *
 *
 */
function renderGraph() {
    var chartObj = makeGraphJSON(data);

    // create a new view instance for a given Vega JSON spec
    // create a new view instance for a given Vega JSON spec
    var view = new vega
        .View(vega.parse(chartObj))
        .renderer('none')
        .initialize();

    // generate static PNG file from chart
    view
        .toCanvas()
        .then(function(canvas) {
            // process node-canvas instance for example, generate a PNG stream to write var
            // stream = canvas.createPNGStream();
            console.log('Writing PNG to file...');
            let uniqueId = _.uniqueId("-img");
            fs.writeFile('./images/prices' + uniqueId + '.png', canvas.toBuffer())
        })
        .catch(function(err) {
            console.log("Error writing PNG to file:")
            console.error(err)
        });
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

/**
 *
 *
 * @param {*} data
 */
function makeGraphJSON(data) {
    var obj = {};

    // make data for: values, colors
    var colors = {
        "bridgewatch": "#FFCA05",
        "lymhurst": "#B5E617",
        "fortsterling": "#FFFFFF",
        "thetford": "#A547A5",
        "martlock": "#03A3E7"
    };

    var cityColors = [m1];

    obj = {
        "$schema": "https://vega.github.io/schema/vega/v5.json",
        "description": "A basic line chart example.",
        "width": 500,
        "height": 200,
        "padding": 5,

        "signals": [{
            "name": "interpolate",
            "value": "linear"
        }],

        "data": [{
            "name": "table",
            "values": [
                // { "x": 0, "y": 28, "c": 0 }, { "x": 0, "y": 20, "c": 1 },
                // { "x": 1, "y": 43, "c": 0 }, { "x": 1, "y": 35, "c": 1 },
                // { "x": 2, "y": 81, "c": 0 }, { "x": 2, "y": 10, "c": 1 },
                // { "x": 3, "y": 19, "c": 0 }, { "x": 3, "y": 15, "c": 1 },
                // { "x": 4, "y": 52, "c": 0 }, { "x": 4, "y": 48, "c": 1 },
                // { "x": 5, "y": 24, "c": 0 }, { "x": 5, "y": 28, "c": 1 },
                // { "x": 6, "y": 87, "c": 0 }, { "x": 6, "y": 66, "c": 1 },
                // { "x": 7, "y": 17, "c": 0 }, { "x": 7, "y": 27, "c": 1 },
                // { "x": 8, "y": 68, "c": 0 }, { "x": 8, "y": 16, "c": 1 },
                // { "x": 9, "y": 49, "c": 0 }, { "x": 9, "y": 25, "c": 1 }
            ]
        }],

        "scales": [{
                "name": "x",
                "type": "point",
                "range": "width",
                "domain": { "data": "table", "field": "x" }
            },
            {
                "name": "y",
                "type": "linear",
                "range": "height",
                "nice": true,
                "zero": true,
                "domain": { "data": "table", "field": "y" }
            },
            {
                "name": "color",
                "type": "ordinal",
                "round": true,
                "range": cityColors,
                "domain": { "data": "table", "field": "city" }
            },
            {
                "name": "symbolColor",
                "type": "ordinal",
                "range": "category",
                "domain": { "data": "table", "field": "city" },
                "round": true
            }
        ],
        "legends": [{
            "fill": "color",
            "title": "Cities",
            "orient": "right",
            "encode": {
                "symbols": { "enter": { "fillOpacity": { "value": 1 } } },
                "labels": { "update": { "text": { "field": "value" } } }
            }
        }],
        "axes": [
            { "orient": "bottom", "scale": "x" },
            { "orient": "left", "scale": "y" }
        ],

        "marks": [{
            "type": "group",
            "from": {
                "facet": {
                    "name": "series",
                    "data": "table",
                    "groupby": "city"
                }
            },
            "marks": [{
                "type": "line",
                "from": { "data": "series" },
                "encode": {
                    "enter": {
                        "x": { "scale": "x", "field": "x" },
                        "y": { "scale": "y", "field": "y" },
                        "stroke": { "scale": "color", "field": "city" },
                        "strokeWidth": { "value": 2 }
                    },
                    "update": {
                        "interpolate": { "signal": "interpolate" },
                        "strokeOpacity": { "value": 1 }
                    },
                    "hover": {
                        "strokeOpacity": { "value": 0.5 }
                    }
                }
            }]
        }]
    }


    return obj;

}

bot.login(key.key);