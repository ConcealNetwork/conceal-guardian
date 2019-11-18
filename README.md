# Conceal Node Guardian

## About

Conceal Node Guardian is a process that monitors the `conceald` daemon. It is catching daemon errors, monitors the block count and, in case of an error, it restarts the daemon and notifies on Discord via web hook, sends an e-mail, or both.

It also has an ability to connect to a pool with other nodes for the purpose of infrastructure monitoring or running a remote node with fee listing.

## Table of Contents
  * [Installation](#installation)
     * [Node.js](#nodejs)
     * [Precompiled binaries](#precompiled-binaries)
  * [Configuration](#configuration)
  * [Running](#running)
     * [Node.js](#nodejs-1)
     * [Running as a System Service](#running-as-a-system-service)
        * [Linux](#linux)
        * [macOS](#macos)
     * [Precompiled binaries](#precompiled-binaries-1)
  * [API](#api)

## Installation

Conceal Node Guardian can be installed to run with Node.js or used as precompiled binary.

### Node.js

Ensure that requirements are installed:

* [Node.js](https://nodejs.org/) (version 6 or higher)
* [npm](https://www.npmjs.com/)

Or use [nvm](https://github.com/creationix/nvm) (Node Version Manager) to manage your Node.js installations.

Clone or download this repository and install project dependencies:

```bash
$ git clone https://github.com/ConcealNetwork/conceal-guardian.git
$ cd conceal-guardian
$ npm install
```

### Precompiled binaries

Please refer to [installation page](INSTALL.md) for detailed instructions how to install the Guardian with precompiled binaries.

## Configuration

The Guardian can be configured manually by creating `config.json` file in the project's root directory or by using interactive setup (refer to [installation page](INSTALL.md) for instructions how to run interactive setup).

You can use [sample configuration](config.json.sample) and modify it for your needs.

```
{
   "node":{
      "args":[
         "--rpc-bind-ip",
         "127.0.0.1",
         "--rpc-bind-port",
         "16000"
      ],
      "path":"C:\\Wallets\\Conceal-CLI\\conceald.exe",
      "port":16000,
      "name":"TestNode",
      "bindAddr":"0.0.0.0",
      "feeAddr":"your fee CCX address"
   },
   "error":{
      "notify":{
         "discord":{
            "url":"put the discord web hook url in here"
         },
         "email":{
            "smtp":{
               "host":"conceal.network",
               "port":25,
               "secure":false
            },
            "auth":{
               "username":"your SMTP username",
               "password":"your SMTP password"
            },
            "message":{
               "from":"no-reply@conceal.network",
               "to":"test.email@gmail.com",
               "subject":"Guardian error occured"
            }
         }
      }
   },
   "restart":{
      "errorForgetTime":600,
      "maxCloseErrors":3,
      "maxBlockTime":1800,
      "maxInitTime":600
   },
   "api":{
      "port":8080
   },
   "pool":{
      "notify":{
         "url":"URL to the guardian pool service if you want to register there",
         "interval":30
      }
   },
   "url": {
      "host": your custom hostname (usually an URL)
      "port": your custom port
   }
}
```

* **node**
  * args: The arguments that get appended to the monitored process.
  * path: The path of the process. If omited it uses the same path where the guardian is located
  * port: The port on which conceald is running
  * name: Name of the node. If omited it uses the hostname.
  * feeAddr: The CCX address on which the transaction fee will be sent in case of remote node.
  * bindAddr: The address on which you listen. 127.0.0.1 for localhost only. 0.0.0.0 for outside accesible node.
* **error**
  * **notify**
    * **discord**
      * url: the ulr of the Discord web hook, where the error reports are send.
    * **email**
      * **smtp**
         * host: SMTP hostname 
         * port: SMTP port (default is 25) 
         * secure: do you want secure connection (usually false)
      * **auth**
         * username: SMTP username 
         * password: SMTP password
      * **message**
         * from: From field of the message
         * to: To field of the message
         * subject: Subject of the message
* **restart**
  * errorForgetTime: The time in seconds after which the error is forgoten and error count decreased by 1.
  * maxCloseErrors: Maximum number of errors. After that the guardian stops as there is a serious issue with the daemon.
  * maxBlockTime: Maximum time in seconds between block number increase. If afrer this time the block is still the same its considered an error.
  * maxInitTime: Maximum time in secords in which the node should be initialized.
* **api**
  * port: port of the api on which to listen. If not specified the guardian will not listen for incoming requests
* **pool**
  * **notify**
    * url: the url of the Conceal Guardian Pool. The Guardian is sending its data to pool for public listing
    * interval: the interval in seconds in which the data is being sent
* **url**
  * host: if you want to have a custom hostname, specify it here and it will override the automatically assigned one
  * port: if you want to have a custom port, specify it here and it will override the automatically assigned one

## Running

Depending on how Guardian is installed, there are 2 ways to run it, with Node.js or by using precompiled binaries. In both cases, you can install it as a system service and run it that way too.

### Node.js

Navigate to project's folder and run `index.js` file:

```bash
$ cd conceal-guardian
$ node index.js
```
  
To run as a service you can use the build in service controls described on [installation page](https://github.com/ConcealNetwork/conceal-guardian/blob/master/SETUP.md). Or you can do it the manual way. On linux you can use **systemctl**
=======

### Running as a System Service

#### Linux

On Linux, you can use `Systemd` with following configuration:

```
[Unit]
Description=Node Guardian

[Service]
Type=simple
# Another Type option: forking
User=nodeguard
WorkingDirectory=/usr/bin
ExecStart=/usr/bin/node /path/to/guardian/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Edit the file accordingly and save it as `/etc/systemd/system/ccx-guardian.service`.

To enable the service and run it on startup, run:

```bash
$ sudo systemctl daemon-reload
$ sudo systemctl enable ccx-guardian.service
```

You can control system service with following commands:

```bash
# start
$ sudo systemctl start ccx-guardian

# stop
$ sudo systemctl stop ccx-guardian

# status
$ sudo systemctl status ccx-guardian

# print log
$ journalctl -e -u ccx-guardian.service

# reload configuration
$ sudo systemctl daemon-reload
```

#### macOS

On macOS, use `launchd` to configure service. Use following configuration:

```plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>

    <key>Label</key>
    <string>conceal.guardian</string>

    <key>RunAtLoad</key>
    <true/>

    <key>ProgramArguments</key>
    <array>
      <string>/usr/local/bin/node</string>
      <string>/path/to/guardian/index.js</string>
    </array>

  </dict>
</plist>
```

Edit the file accordingly and save it as `~/Library/LaunchAgents/conceal.guardian.plist`.

Start it with:

```bash
launchctl load ~/Library/LaunchAgents/conceal.guardian.plist
```

If you want to unload it, run:

```bash
launchctl unload ~/Library/LaunchAgents/conceal.guardian.plist
```

### Precompiled binaries

Please refer to [installation page](INSTALL.md) for detailed instructions how to run the Guardian with precompiled binaries.

## API

The Guardian has an option to run HTTP server providing some general info about the node.  
API serves a single endpoint - `/getInfo`.

Sample request:

```bash
# Assuming API port in config.json is set to 8000
$ curl http://127.0.0.1:8000/getInfo
```

Sample response:

```
{
   "id":"7b6e8b0c-039c-48a9-959f-2f379f897a78",
   "os":"linux",
   "name":"Solaris",
   "nodeHost":"80.241.210.162",
   "nodePort":16000,
   "status":{
      "errors":0,
      "startTime":"2019-04-08T15:32:03.011Z"
   },
   "blockchain":{
      "alt_blocks_count":4,
      "block_major_version":7,
      "block_minor_version":0,
      "difficulty":411075551,
      "fee_address":"ccx7ZuCP9NA2KmnxbyBn9QgeLSATHXHRAXVpxgiaNxsH4GwMvQ92SeYhEeF2tJHADHbW4bZMFHvFf8GpucLrRyw49q4Gkc3AXM",
      "full_deposit_amount":10158060988835,
      "full_deposit_interest":54938177048,
      "grey_peerlist_size":1120,
      "height":220877,
      "incoming_connections_count":37,
      "last_block_difficulty":442618488,
      "last_block_reward":7500300,
      "last_block_timestamp":1555001815,
      "last_known_block_index":220876,
      "outgoing_connections_count":7,
      "status":"OK",
      "top_block_hash":"bd7ec15e292b293561cd8e153d42a4c6ab83006165faf0e37727cd7f527d4b1b",
      "tx_count":315644,
      "tx_pool_size":0,
      "version":"5.3.0",
      "white_peerlist_size":97
   },
   "location":{
      "ip":"80.241.210.162",
      "data":{
         "country":"DE",
         "countryCode":"DE",
         "region":"Bavaria",
         "regionCode":"",
         "city":"Munich",
         "postal":"81549",
         "ip":"80.241.210.162",
         "latitude":48.1089,
         "longitude":11.6074,
         "timezone":""
      }
   }
}
```
