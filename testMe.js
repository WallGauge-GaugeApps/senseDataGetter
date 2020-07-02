const Sense = require('./senseDataGetter');
const actObj = require('./actObj.json');

var getpowerTimer = null;
var solarPowered = null;
var minCount = 0;
const reconnectInterval = 4;    // in minutes  60
const getTrendInterval = 2;     // in minutes  5


const sense = new Sense(actObj.email, actObj.password, false);

var nextReconnectInterval = reconnectInterval;
var nextGetTrendInterval =getTrendInterval;

setInterval(() => {
    minCount++;
    if (nextGetTrendInterval == minCount) {
        nextGetTrendInterval += reconnectInterval;
        getTrend();
    } else if (nextReconnectInterval == minCount) {
        nextReconnectInterval += getTrendInterval;
        reconnectToSense();
    } else {
        sense.openWebSocket();
    }
}, 60000)

function reconnectToSense() {
    console.log('-------- Reconnecting to sense.com ---------');
    sense.closeWebSoc();
    sense.authenticate();
    sense.openWebSocket();
}

function getTrend() {
    sense.getTrends('week')
        .then((data) => {
            solarPowered = data.solar_powered
            console.log('Update. This week ' + solarPowered + '% of the power was from renewable energy.');
        })
        .catch((err) => {
            console.error('Error trying to getTrends from sense.com', err)
        });
}

// setInterval(() => {
//     minCount++
//     if (minCount < reconnectInterval) {
//         sense.getTrends('week')
//             .then((data) => {
//                 solarPowered = data.solar_powered
//                 console.log('Update. This week ' + solarPowered + '% of the power was from renewable energy.');
//             })
//             .catch((err) => {
//                 console.error('Error trying to getTrends from sense.com', err)
//             });
//     } else {
//         minCount = 0;
//         console.log('-------- Reconnecting to sense.com ---------');
//         clearTimeout(getpowerTimer);
//         sense.closeWebSoc();
//         sense.authenticate();
//         sense.openWebSocket();
//     };
// }, 1 * 60 * 1000);

sense.on('authenticated', () => {
    console.log('We are logged in and authenticated!')
    console.log('Reading Trends...');
    sense.getTrends('week')
        .then((data) => {
            solarPowered = data.solar_powered
            console.log('This week ' + solarPowered + '% of the power was from renewable energy.');
            sense.openWebSocket();
        })
});

sense.on('power', () => {
    console.log((new Date()).toLocaleTimeString() +
        ' | Home Load:' + sense.power.netWatts +
        ', Solar In: ' + sense.power.solarWatts +
        ', Grid In: ' + sense.power.gridWatts +
        ' | ' + solarPowered + '% of the this week\'s power was from renewable energy.');
    sense.closeWebSoc();
});
