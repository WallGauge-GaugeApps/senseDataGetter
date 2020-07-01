const EventEmitter = require('events');
const fetch = require('node-fetch');
const WS = require('ws');

const apiURL = 'https://api.sense.com/apiservice/api/v1/';
const wssURL = 'wss://clientrt.sense.com/monitors/';

var webSoc = null;

var powerObj = {
    solarWatts: null,
    gridWatts: 0,
    netWatts: 0
};

class senseDataGetter extends EventEmitter {
    constructor(userName = '', userPass = '', verboseLogging = false) {
        super();
        this.verbose = verboseLogging;
        this.power = powerObj;
        this._userName = userName;
        this._userPass = userPass;
        this._authObj = {};

        this.authenticate();
    };

    authenticate() {
        this._auth()
            .then(authObj => {
                this._authObj = authObj;
                if (!this._authObj.authorized) {
                    console.error('Error user not authenticated!')
                    throw Error('User not authenticated!')
                } else {
                    if (this.verbose) console.log('User is Authorized. Emitting authenticated.');
                    this.emit('authenticated')
                };
            })
            .catch(err => {
                console.error('Error with _authenticate.', err);
            });
    };

    closeWebSoc() {
        if (webSoc != null) {
            // webSoc.close();
            webSoc.terminate();
            // webSoc = null;
        } else {
            console.log("WebSocket not open! Can't close!")
        }
    };

    openWebSocket() {
        let wsURL = wssURL + this._authObj.monitors[0].id + '/realtimefeed?access_token=' + this._authObj.access_token;
        webSoc = new WS(wsURL);

        webSoc.on('open', () => {
            if (this.verbose) console.log('Web Socket to Sene.com is open.');
            this.emit('wsStatus', 'open');
        });
        webSoc.on('close', () => {
            if (this.verbose) console.log('Web Socket to Sene.com is closed.');
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
                console.log('\n_______________________________________________________________________________________________________\n');
                console.dir(dObj, { depth: null });
            };

            if (dObj.payload.grid_w != undefined) {
                this.power.solarWatts = dObj.payload.d_solar_w
                this.power.gridWatts = dObj.payload.grid_w
                this.power.netWatts = dObj.payload.d_w
                this.emit('power');
            }
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
            console.log('set default start date to ' + startDate)
        };
        let uri = apiURL + 'app/history/trends?monitor_id=' + this._authObj.monitors[0].id + '&device_id=usage&scale=' + scale + '&start=' + startDate
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
                        console.log('\n getTrends follows:');
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
     * Gets a list of discovered devices and returns them in a JSON object
     * @returns {Promise} Promise argument will be a JSON object with call results
     */
    getDevices() {
        let uri = apiURL + 'app/monitors/' + this._authObj.monitors[0].id + '/devices'
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
                        console.log('\n getDevices follows:');
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
        let uri = apiURL + 'app/monitors/' + this._authObj.monitors[0].id + '/devices/' + deviceID
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
                        console.log('\n getDevices follows:');
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
        let uri = apiURL + 'users/' + this._authObj.user_id + '/timeline'
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
                        console.log('\n getTimeline follows:');
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
        let uri = apiURL + 'app/monitors/' + this._authObj.monitors[0].id + '/status'
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
                        console.log('\n getMonitorStatus follows:');
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
            }
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

module.exports = senseDataGetter;