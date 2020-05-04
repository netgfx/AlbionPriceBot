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
var serveIndex = require('serve-index');
var serveStatic = require('serve-static');
const del = require('del');

const app = express()
const port = 8080

app.get('/', (req, res) => res.send('Albion Price Bot is online!'));
app.use('/images', serveIndex('images'));
app.use('/images', express.static('images'));
app.use('/ftp', express.static('/images'), serveIndex('/images', { 'icons': true }));

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

// Admin //
var isLocal = true;
var isMaintenance = false;
var admins = ["MDobs"];

console.log("starting bot...");
const mainURL = 'https://www.albion-online-data.com/api/v2/stats';
const imageURL = "https://gameinfo.albiononline.com/api/gameinfo/items/";
const graphURL = "https://www.albion-online-data.com/api/v2/stats/charts/";
const baseImagePath = isLocal === true ? "./images/" : "http://env-8656818.fr-1.paas.massivegrid.net:8080/images/";

//T4_BAG ? date = 3 - 29 - 2020 & locations=martlock, bridgewatch & qualities=2 & time - scale=6"

const botID = "703966342159794176";
const botName = "PricesBot";



var _message = {};

// init functions //
removeGraphs();

bot.on("message", (message) => {
    console.log(message);
    _message = message;
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
        message.channel.startTyping();
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

        // GRAPH RENDERING //
        let date = moment();
        let _weekOldDate = date.subtract(7, 'days');
        _weekOldDate = _weekOldDate.format("M-D-YYYY");
        // date=4-24-2020
        fetchGraph(what, _weekOldDate, where, quality, enchantment, (data) => {
            console.log(">>>> GRAPH >>>>>> \n", data, data[0].timestamps);

            renderGraph(data, (imgURL) => {

                // LIST RENDERING //

                fetchPrices(what, where, quality, enchantment, (data) => {
                    //console.log(data);

                    if (data.length === 0) {
                        message.channel.send("Nothing found, make sure you use proper commands, for help type -help");
                        message.channel.stopTyping();
                    }

                    data = _.sortBy(data, function(o) {
                        return o.sell_price_min;
                    });

                    // console.log(">>>>> ", data);

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
                        message.channel.stopTyping();
                    } else {
                        //message.channel.send("```" + _.join(topPrices, "\n") + "```");
                        message.channel.send(formatEmbed(embedPrices, what, enchantment, baseImagePath + imgURL));
                        message.channel.stopTyping();
                    }
                });

            });
        });

    } else {
        message.channel.send("Sorry didn't catch that, make sure you use proper commands, for help type **-help**");
        message.channel.stopTyping();
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
function formatEmbed(items, name, enchantment, graphURL) {

    console.log("EMBED: ");
    console.log(graphURL);

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

    const file = new Discord.MessageAttachment(graphURL);

    return { files: [file], embed: itemEmbed }
}

/**
 *
 *
 */
function renderGraph(data, callback) {
    var chartObj = makeGraphJSON(data);

    // create a new view instance for a given Vega JSON spec
    // create a new view instance for a given Vega JSON spec
    var view = new vega.View(vega.parse(chartObj), { renderer: 'none' });


    // generate static PNG file from chart
    view.toCanvas()
        .then(function(canvas) {
            // process node-canvas instance
            // for example, generate a PNG stream to write
            //var stream = canvas.createPNGStream();

            let uniqueId = _.uniqueId("-img");
            let imgurl = './images/prices' + uniqueId + '.jpg';
            fs.writeFile(imgurl, canvas.toBuffer('image/jpeg', { quality: 1.0 }), err => {
                console.log(err);

                if (callback) {
                    callback('prices' + uniqueId + '.jpg');
                }
            })
        })
        .catch(function(err) { console.error(err); });

    // view
    //     .toCanvas()
    //     .then(function(canvas) {
    //         // process node-canvas instance for example, generate a PNG stream to write var
    //         // stream = canvas.createPNGStream();
    //         console.log('Writing PNG to file...');
    //         let uniqueId = _.uniqueId("-img");
    //         fs.writeFile('./images/prices' + uniqueId + '.png', canvas.toBuffer())
    //     })
    //     .catch(function(err) {
    //         console.log("Error writing PNG to file:")
    //         console.error(err)
    //     });
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

    //console.log(options.hostname + options.path);

    axios.get(options.hostname + options.path)
        .then(response => {
            //console.log(response.data.url);
            //console.log(response.data.explanation);

            if (callback) {
                callback(response.data);
            }

        })
        .catch(error => {
            console.log(error);
            _message.channel.stopTyping();
        });
}

/**
 *
 *
 * @param {*} items
 * @param {*} locations
 * @param {*} qualities
 * @param {*} tier
 * @param {*} callback
 */
function fetchGraph(items, date, locations, qualities, tier, callback) {

    if (qualities <= 0) {
        qualities = 1;
    }
    const options = {
        hostname: graphURL,
        path: escape(items + tier) + "?date=" + date + "&locations=" + locations + "&qualities=" + qualities + "&time-scale=6",
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
            _message.channel.stopTyping();
        });
}

/**
 *
 *
 */
async function removeGraphs() {
    const fsPromises = require('fs').promises;

    const directory = './images/';

    // await fsPromises.rmdir(directory, {
    //     recursive: true
    // });

    const deletedPaths = await del(['images/*.jpg', 'images/*.png']);

    console.log('Deleted files in images:\n', deletedPaths.join('\n'));
}

/**
 *
 *
 * @param {*} data
 */
function makeGraphJSON(data) {
    var obj = {};

    // make data for: values, colors
    /**
     * 
     * {city: "lymhurst", timestamp: 2020-02-01, price_avg: 10}
     * 
     */
    let _dataList = [];
    _.forEach(data, o => {
        let items = o.data;
        for (var i = 0; i < o.data.timestamps.length; i++) {

            _dataList.push({
                city: o.location,
                timestamp: moment(new Date(items.timestamps[i])).format("M-D-YY HH:mm"),
                price: items.prices_avg[i],
                xLabel: moment(new Date(items.timestamps[i])).format('M-D')
            });
        }
    });

    _dataList = _.sortBy(_dataList, [function(o) { return o.city; }]);

    console.log("DATA GRAPH: \n", _dataList);

    var colors = {
        "bridgewatch": "#FFCA05",
        "caerleon": "#c1c1c1",
        "lymhurst": "#B5E617",
        "fortsterling": "#FFFFFF",
        "thetford": "#A547A5",
        "martlock": "#03A3E7"
    };

    var colorRanges = [
        "#FFCA05",
        "#010101",
        "#c1c1c1",
        "#B5E617",
        "#03A3E7",
        "#A547A5"
    ];

    var cityColors = colorRanges;

    obj = {
        "$schema": "https://vega.github.io/schema/vega/v5.json",
        "description": "A basic line chart example.",
        "width": 500,
        "height": 200,
        "background": "#ffffff",
        "padding": 5,

        "signals": [{
                "name": "interpolate",
                "value": "basis"
            },
            {
                "name": "xL",
                "update": "data('table')"
            }
        ],

        "data": [{
            "name": "table",
            "values": _dataList
        }],

        "scales": [{
                "name": "x",
                "type": "point",
                "range": "width",
                "domain": { "data": "table", "field": "timestamp" }
            },
            {
                "name": "y",
                "type": "linear",
                "range": "height",
                "nice": true,
                "zero": true,
                "domain": { "data": "table", "field": "price" }
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
            },
            {
                "name": "xLabels",
                "type": "ordinal",
                "domain": { "data": "table", "field": "timestamp" },
                "range": { "signal": "xL" }
            },
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
        "axes": [{
                "scale": "x",
                "orient": "bottom",
                "encode": {
                    "labels": { "update": { "text": { "signal": "scale('xLabels', datum.value).xLabel" } } }
                }
            },
            { "orient": "left", "scale": "y" }
        ],

        "marks": [{
            "type": "group",
            "from": {
                "facet": {
                    "name": "series",
                    "data": "table",
                    "groupby": ["city"]
                }
            },
            "marks": [{
                "type": "line",
                "from": { "data": "series" },
                "encode": {
                    "enter": {
                        "x": { "scale": "x", "field": "timestamp" },
                        "y": { "scale": "y", "field": "price" },
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