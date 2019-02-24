# ConcealNodeGuard

## 1. About

ConcealNodeGuard is a guardian process that monitors over the conceald daemon. It can catch daemon errors and also monitors if the block count is increasing. In case an error is detected or the block count is stale it restarts the daemon and notifies the devs on the Discord over a web hook.

## 2. Installation

To install and run it you first need to install dependencies. There are two:

* [nodejs](https://nodejs.org/en/)
* [npm](https://www.npmjs.com/)

You can see how to install it [here](https://nodejs.org/en/download/package-manager/).

When you have it installed you can run the guardian by simply doing:

1. npm install
2. node index.js

Before doing that however its wise to check the **config.json** and set the correct settings. Sample of config.json

```
{
	"node": {
		"args": ["--rpc-bind-ip", "127.0.0.1", "--rpc-bind-port", "16000"],
		"path": "C:\\Wallets\\Conceal-CLI\\conceald.exe",
		"port": 16000,
		"name": "TestNode"
	},
	"notify": {
		"url": "URL to your Discord WebHook"
	},
	"restart": {
		"errorForgetTime": 600,
		"maxCloseErrors": 3,
		"maxBlockTime": 1800,
		"maxInitTime": 600
	}	
}
```

The explanation of config options:

* **node**
  * args: The arguments that get appended to the monitored process.
  * path: The path of the process. If omited it uses the same path where the guardian is located
  * port: The port on which conceald is running
  * name: Name of the node. If omited it uses the hostname.
* **notify**
  * url: the ulr of the Discord web hook, where the error reports are send.
* **restart**
  * errorForgetTime: The time in seconds after which the error is forgoten and error count decreased by 1.
  * maxCloseErrors: Maximum number of errors. After that the guardian stops as there is a serious issue with the daemon.
  * maxBlockTime: Maximum time in seconds between block number increase. If afrer this time the block is still the same its considered an error.
  * maxInitTime: Maximum time in secords in which the node should be initialized.
  
To run as a service use **systemctl**

```
[Unit]
Description=NodeGuardian

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

Copy **NodeGuardian.service.sample** to **/etc/systemd/system/NodeGuardian.service** and edit it approprietly.

Now you can start it or stop it with:

- **start**: sudo systemctl start NodeGuardian
- **stop**: sudo systemctl stop NodeGuardian
- **status**: sudo systemctl status NodeGuardian
- **print log**: journalctl -e -u NodeGuardian.service
- **reload conf**: systemctl daemon-reload
