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
		"url": "https://discordapp.com/api/webhooks/548045737611755535/DKWtR-TVNttAez9rK5iH-v-bETlBd4GuF2FnRl8rWqz7x0Sw678YLKq5JT5_5uZSpeJj"
	},
	"restart": {
		"errorForgetTime": 600,
		"maxCloseErrors": 3,
		"maxBlockTime": 1800,
		"maxInitTime": 600
	}	
}
```

To run as a service use **systemctl**

```
[Unit]
Description=EtherSync

[Service]
Type=simple
# Another Type option: forking
User=ethersync
WorkingDirectory=/usr/bin
ExecStart=/usr/bin/EtherSync
Restart=on-failure
# Other Restart options: or always, on-abort, etc

[Install]
WantedBy=multi-user.target

```

Copy **EtherSync.service.sample** to **/etc/systemd/system/EtherSync.service** and edit it approprietly.

Now you can start it or stop it with:

- **start**: sudo systemctl start EtherSync
- **stop**: sudo systemctl stop EtherSync
- **print log**: journalctl -e -u EtherSync.service
- **reload conf**: systemctl daemon-reload

Not that if you run your own geth RPC you have to have it running and fully synced
