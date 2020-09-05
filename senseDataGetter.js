const EventEmitter = require('events');
const fetch = require('node-fetch');
const WS = require('ws');

const apiURL = 'https://api.sense.com/apiservice/api/v1/';
const wssURL = 'wss://clientrt.sense.com/monitors/';
const logPrefix = 'senseDataGetter.js | ';

var webSoc = null;
var powerObj = {
    solarWatts: null,
    gridWatts: 0,
    netWatts: 0,
    alwaysOn: 0,
};

class senseDataGetter extends EventEmitter {
    /**
     * This class provides an interface to the sense.com cloud data.  See the Readme for more information.
     * Construct this class with your sense.com user ID and Password.  
     * Then listen for the authenticated event before calling any class methods.
     * emits:
     *   emit('authenticated')
     *   emit('notAuthenticated')
     *   emit('wsStatus', 'open')
     *   emit('wsStatus', 'close')
     *   emit('wsStatus', 'error', err)
     *   emit('power') - emitted when powerObj data has been recived and parsed
     *   emit('wsData', dObj) - emitted when new data received. 
     * 
     * @param {string} userName 
     * @param {string} userPass 
     * @param {boolean} verboseLogging - optional defaults to false
     */
    constructor(userName = '', userPass = '', verboseLogging = false) {
        super();
        this.verbose = verboseLogging;
        this.power = powerObj;
        this._userName = userName;
        this._userPass = userPass;
        this._authObj = {};
        this.authenticate();
    };

    /**
     * Authenticates with sense.com based on user ID and Password passed to the class during construction.
     * emits:
     *  emit('authenticated')
     * sets this._authObj for use in future api and web socket calls
     */
    authenticate() {
        this._auth()
            .then(authObj => {
                this._authObj = authObj;
                if (!this._authObj.authorized) {
                    console.error('Error user not authenticated!');
                    this.emit('notAuthenticated');
                } else {
                    if (this.verbose) logit('User is Authorized. Emitting authenticated.');
                    this.emit('authenticated');
                };
            })
            .catch(err => {
                console.error('Error with _authenticate.', err);
            });
    };

    /**
     * Terminates web socket
     */
    closeWebSoc() {
        if (webSoc != null) {
            webSoc.terminate();
        } else {
            if (this.verbose) logit("WebSocket not open! Can't close!");
        };
    };

    /**
     * Opens a web socket to sense.com and listens for data
     * emits
     *   emit('wsStatus', 'open')
     *   emit('wsStatus', 'close')
     *   emit('wsStatus', 'error', err)
     *   emit('power') - emitted when powerObj data has been recived and parsed
     *   emit('wsData', dObj) - emitted when new data received. 
     */
    openWebSocket() {
        this.closeWebSoc();
        let wsURL = wssURL + this._authObj.monitors[0].id + '/realtimefeed?access_token=' + this._authObj.access_token;
        webSoc = new WS(wsURL);

        webSoc.on('open', () => {
            if (this.verbose) logit('Web Socket to Sene.com is open.');
            this.emit('wsStatus', 'open');
        });
        webSoc.on('close', () => {
            if (this.verbose) logit('Web Socket to Sene.com is closed.');
            this.emit('wsStatus', 'close');
        });
        webSoc.on('error', (err) => {
            console.error('Web Socket Error ' + err);
            this.emit('wsStatus', 'error', err);
        });
        webSoc.on('message', (data) => {
            let dObj = {};
            dObj = JSON.parse(data);
            if (this.listenerCount('wsData') == 0 && this.verbose) {
                logit('\n____ wsData follows ___________________________________________________________________________________________________\n');
                console.dir(dObj, { depth: null });
            };

            let devicList = dObj.payload.devices;
            let alwaysOn = 0;
            if(Array.isArray(devicList)){
                devicList.forEach((item, index)=>{
                    if(item.id == 'always_on'){
                        alwaysOn = item.w
                    };
                });
            };

            if (dObj.payload.grid_w != undefined) {
                this.power.solarWatts = dObj.payload.d_solar_w;
                this.power.gridWatts = dObj.payload.grid_w;
                this.power.netWatts = dObj.payload.d_w;
                this.power.alwaysOn = alwaysOn;
                this.emit('power');
            };
            this.emit('wsData', dObj);
        });
    };

    /**
     * Reads the sense trend data.
     * @param {'hour'|'day'|'week'|'month'|'year'} scale The time scale for the trend report
     * @param {string} startDate date and time in ISO string format: 2020-06-30T13:52:17.120Z - defaults to now
     * @returns {Promise} Promise argument will be a JSON object with call results
     */
    getTrends(scale = 'week', startDate = 'Date().toISOString()') {
        if (startDate == 'Date().toISOString()') {
            startDate = new Date().toISOString()
            logit('set default start date to ' + startDate)
        };
        let uri = apiURL + 'app/history/trends?monitor_id=' + this._authObj.monitors[0].id + '&device_id=usage&scale=' + scale + '&start=' + startDate;
        return new Promise((resolve, reject) => {
            let callObj = {
                method: 'GET',
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Bearer " + this._authObj.access_token
                }
            };
            fetch(uri, callObj)
                .then(res => res.json())
                .then(json => {
                    if (this.verbose) {
                        logit('\n getTrends follows:');
                        console.dir(json, { depth: null });
                    }
                    resolve(json);
                })
                .catch(err => {
                    console.error('Error calling getTrends.', err);
                    reject(err);
                })
        });
    };

    /**
     * Gets a list of discovered devices and returns data as a JSON object
     * @returns {Promise} Promise argument will be a JSON object with call results
     */
    getDevices() {
        let uri = apiURL + 'app/monitors/' + this._authObj.monitors[0].id + '/devices';
        return new Promise((resolve, reject) => {
            let callObj = {
                method: 'GET',
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Bearer " + this._authObj.access_token
                }
            };
            fetch(uri, callObj)
                .then(res => res.json())
                .then(json => {
                    if (this.verbose) {
                        logit('\n getDevices follows:');
                        console.dir(json, { depth: null });
                    }
                    resolve(json);
                })
                .catch(err => {
                    console.error('Error calling getDevices.', err);
                    reject(err);
                })
        });
    };

    /**
     * Gets the details about a discovered device.  
     * @param {string} deviceID - The device.id from the getDevices() call
     * @returns {Promise} Promise argument will be a JSON object with call results
     */
    getDeviceDetails(deviceID = 'solar') {
        let uri = apiURL + 'app/monitors/' + this._authObj.monitors[0].id + '/devices/' + deviceID;
        return new Promise((resolve, reject) => {
            let callObj = {
                method: 'GET',
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Bearer " + this._authObj.access_token
                }
            };
            fetch(uri, callObj)
                .then(res => res.json())
                .then(json => {
                    if (this.verbose) {
                        logit('\n getDevices follows:');
                        console.dir(json, { depth: null });
                    }
                    resolve(json);
                })
                .catch(err => {
                    console.error('Error calling getDevices.', err);
                    reject(err);
                })
        });
    };

    /**
     * Gets the sense timeline. A list of events the sense home monitor has reported.
     * 
     * @returns {Promise} Promise argument will be a JSON object with call results
     */
    getTimeline() {
        let uri = apiURL + 'users/' + this._authObj.user_id + '/timeline';
        return new Promise((resolve, reject) => {
            let callObj = {
                method: 'GET',
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Bearer " + this._authObj.access_token
                }
            };
            fetch(uri, callObj)
                .then(res => res.json())
                .then(json => {
                    if (this.verbose) {
                        logit('\n getTimeline follows:');
                        console.dir(json, { depth: null });
                    }
                    resolve(json);
                })
                .catch(err => {
                    console.error('Error calling getTimeline.', err);
                    reject(err);
                })
        });
    };

    /**
     * gets the sense home power monitor's configuration
     * 
     * @returns {Promise} Promise argument will be a JSON object with call results
     */
    getMonitorStatus() {
        let uri = apiURL + 'app/monitors/' + this._authObj.monitors[0].id + '/status';
        return new Promise((resolve, reject) => {
            let callObj = {
                method: 'GET',
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Bearer " + this._authObj.access_token
                }
            };
            fetch(uri, callObj)
                .then(res => res.json())
                .then(json => {
                    if (this.verbose) {
                        logit('\n getMonitorStatus follows:');
                        console.dir(json, { depth: null });
                    }
                    resolve(json);
                })
                .catch(err => {
                    console.error('Error calling getMonitorStatus.', err);
                    reject(err);
                })
        });
    };

    _auth() {
        return new Promise((resolve, reject) => {
            let callObj = {
                method: 'POST',
                body: 'email=' + this._userName + '&password=' + this._userPass,
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            };
            fetch(apiURL + 'authenticate', callObj)
                .then(res => res.json())
                .then(json => {
                    if (this.verbose) console.dir(json, { depth: null });
                    resolve(json);
                })
                .catch(err => {
                    reject(err);
                })
        });
    };
};

function logit(txt = '') {
    console.debug(logPrefix + txt);
};

module.exports = senseDataGetter;