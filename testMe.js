const Sense = require('./senseDataGetter');
const actObj = require('./actObj.json');

const sense = new Sense(actObj.email, actObj.password, false);
var solarPowered = null;
var reconnectCont = 0
const reconnet = 6
sense.on('authenticated', () => {
    console.log('We are logged in and authenticated!')
    console.log('Reading Trends...');
    sense.getTrends('week')
        .then((data) => {
            solarPowered = data.solar_powered
            console.log('This week ' + solarPowered + '% of the power was from renewable energy.');
            sense.openWebSocket();
        })

    setInterval(() => {
        reconnectCont++
        if (reconnectCont < reconnet) {
            sense.getTrends('week')
                .then((data) => {
                    solarPowered = data.solar_powered
                    console.log('Update. This week ' + solarPowered + '% of the power was from renewable energy.');
                })
                .catch((err)=>{
                    console.error('Error trying to getTrends from sense.com', err)
                });
        } else {
            reconnectCont = 0;
            console.log('-------- Reconnecting to sense.com ---------');
            sense.closeWebSoc();
            sense.authenticate();
            sense.openWebSocket();
        };
    }, 10 * 60 * 1000);
});

sense.on('power', () => {
    console.log((new Date()).toLocaleTimeString() +
        ' | Home Load:' + sense.power.netWatts +
        ', Solar In: ' + sense.power.solarWatts +
        ', Grid In: ' + sense.power.gridWatts +
        ' | ' + solarPowered + '% of the this week\'s power was from renewable energy.');
    sense.closeWebSoc();
    setTimeout(() => {
        sense.openWebSocket();
    }, 60000);
});
