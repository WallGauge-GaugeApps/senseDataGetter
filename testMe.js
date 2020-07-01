const Sense = require('./senseDataGetter');
const actObj = require('./actObj.json');

const sense = new Sense(actObj.email, actObj.password, false);
var solarPowered = null;
sense.on('authenticated', () => {
    console.log('We are logged in and authenticated!')
    console.log('Reading Trends...');
    sense.getTrends('week')
        .then((data) => {
            solarPowered = data.solar_powered
            console.log('This week ' + solarPowered + '% of the power was from renewable energy.');
            sense.openWebSocket();
        })
    
    setInterval(()=>{
        sense.getTrends('week')
        .then((data) => {
            solarPowered = data.solar_powered
            console.log('Update. This week ' + solarPowered + '% of the power was from renewable energy.');
        })
    },10*60*1000)

    setInterval(()=>{
        console.log('Reconnecting to sense.com...')
        sense.closeWebSoc();
        sense.authenticate();
        sense.openWebSocket();
    },60*60*1000)
})

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
