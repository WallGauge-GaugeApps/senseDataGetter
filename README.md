# senseDataGetter

The senseDataGetter is a node.js class for accessing data from a [sense.com](https://sense.com) home energy monitor. 

This class uses the unofficial and undocumented sense API to access your sense home monitor’s data from the Sense.com cloud.  Please understand that unofficial means it may stop working at any time.  

I created this class based on the following three git hub projects:

* Blandman’s [unofficial-sense api](https://github.com/blandman/unofficial-sense)
* Barbed's [sense-energy-node](https://github.com/brbeaird/sense-energy-node)
* Frankwin's [SenseApiPostman](https://github.com/Frankwin/SenseApiPostman)  

Additionally the sense.com support forum has several post where people have posted projects based on the sense API.  They even have an [Official API post](https://community.sense.com/t/official-api/2848) where RyanAtSense acknowledges people are using the API and does not take issue with it.  Based on this I believe Sense is okay with us using the API but just won’t support it.

## Installation

* type `git clone https://github.com/WallGauge-GaugeApps/senseDataGetter.git`
* type `cd senseDataGetter`
* type `npm install`

Now to give the testMe app your Sense.com login information create an actObj.json file. 

* type `nano actObj.json`
* Then cut and paste the following (including the brackets '{}'), update with your information and save.
  * {"email": "yourEmailAddress", "password": “your Sense Password"}

## Test

* type `node testMe.js` to test the senseDataGetter class

## Raspberry Pi workaround for SSL signature type

If you are running this on a Raspberry Pi and your kernel is v4.19.118 and Distro is buster or newer you will get a web socket error saying you are using the wrong SSL signature type.  This is because the sense API uses a default SSL security level of 1 and buster’s default is set to 2.  You can change this by creating a file to override this SSL setting.  I recommend only doing this at the account level don’t change it for all apps on your Pi.  

Create a file called `opensslMod.cnf` with the following text: <br>
`.include /usr/lib/ssl/openssl.cnf` <br>
`[system_default_sect]` <br>
`MinProtocol = TLSv1.2` <br>
`CipherString = DEFAULT@SECLEVEL=1` <br>

Now add this file to your path with the following export command:
Type `export OPENSSL_CONF=~/senseDataGetter/opensslMod.cnf`
This will override the CipherString setting but keep all you other settings in your existing /usr/lib/ssl file.

## Usage

Please see the testMe.js for examples on how to call and use this class.
