const Sense = require('./senseDataGetter');
const actObj = require('./actObj.json');

var firstRun = true;
var solarPowered = null;
var minCount = 0;
const reconnectInterval = 60;    // in minutes  60
const getTrendInterval = 10;     // in minutes  10
var nextReconnectInterval = reconnectInterval;
var nextGetTrendInterval = getTrendInterval;
var mainPoller = null;

const sense = new Sense(actObj.email, actObj.password, false);

sense.on('notAuthenticated', () => {
    console.log('Please check your sense login ID and Password.')
    clearInterval(mainPoller);
});

sense.on('authenticated', () => {
    console.log('Authenticated!')
    if (firstRun) startPoller();
    console.log('Getting trend data...');
    sense.getTrends('week')
        .then((data) => {
            solarPowered = data.solar_powered
            console.log('This week ' + solarPowered + '% of the power was from renewable energy.');
            if (firstRun) {
                sense.openWebSocket();
                firstRun = false;
            }
        })
        .catch((err) => {
            console.error('Error getTrends after authenticated', err);
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

function startPoller() {
    console.log('Starting endless poller.');
    console.log('Poller will open and close web socket every 1 minute, read trend data every ' + getTrendInterval + ' minutes, and re-authenticate every ' + reconnectInterval + ' minutes.');
    mainPoller = setInterval(() => {
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
    }, 60000);
};

function reconnectToSense() {
    console.log('-------- Reconnecting to sense.com ---------');
    sense.closeWebSoc();
    sense.authenticate();
    sense.openWebSocket();
};

function getTrend() {
    sense.getTrends('week')
        .then((data) => {
            solarPowered = data.solar_powered
            console.log('Update. This week ' + solarPowered + '% of the power was from renewable energy.');
        })
        .catch((err) => {
            console.error('Error trying to getTrends from sense.com', err)
        });
};