// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const commandLineUsage = require('command-line-usage');
const commandLineArgs = require("command-line-args");
const mainEngine = require("./units/engine.js");
const vsprintf = require("sprintf-js").vsprintf;
const download = require("./units/download.js");
const service = require("./units/service.js");
const setup = require("./units/setup.js");
const utils = require("./units/utils.js");
const path = require("path");
const fs = require("fs");

try {
  var cmdOptions = commandLineArgs([{
    name: "config",
    type: String
  }, {
    name: "node",
    type: String
  }, {
    name: "service",
    type: String
  }, {
    name: "setup",
    type: Boolean
  }, {
    name: "download",
    type: Boolean
  }, {
    name: "help",
    alias: "h",
    type: Boolean
  }]);

} catch (err) {
  console.error("\nUknown command line parameter. Use --help for instructions.");
  process.exit();
}

if (cmdOptions.help) {
  const sections = [
    {
      header: 'Conceal Node Guardian',
      content: 'This is a guardian app for the conceal node daemon. Handles restarts, sends notifications, registers to pool...'
    },
    {
      header: 'Options',
      optionList: [
        {
          name: 'config',
          typeLabel: '{underline file}',
          description: 'The path to configuration file. If empty it uses the config.json in the same directory as the app.'
        },
        {
          name: 'node',
          typeLabel: '{underline file}',
          description: 'The path to node daemon executable. If empty it uses the same directory as the app.'
        },
        {
          name: 'setup',
          description: 'Initiates the interactive config setup for the guardian'
        },
        {
          name: 'service',
          description: 'Controls the service behaviour. Possible values are: "install", "remove", "start", "stop"'
        },
        {
          name: 'help',
          description: 'Shows this help instructions'
        }
      ]
    },
    {
      header: 'Service option values',
      optionList: [
        {
          name: 'install',
          description: 'Install the guardian as a service in the OS.'
        },
        {
          name: 'remove',
          description: 'Removes the guardian as a service from the OS.'
        },
        {
          name: 'start',
          description: 'Starts the guardian as OS service.'
        },
        {
          name: 'stop',
          description: 'Stops the guardian as OS service.'
        }
      ]
    }

  ];
  const usage = commandLineUsage(sections);
  console.log(usage);
} else {
  const rootPath = process.cwd();
  const configFileName = cmdOptions.config || path.join(rootPath, "config.json");

  if (!fs.existsSync(configFileName)) {
    console.log(vsprintf('\n"%s" does not exist! Specify the correct path to the config file or create config.json in the same directory as the application. You can use the config.json.sample as an example', [
      configFileName,
    ]));
  } else {
    // read config option to use them either in engine or setup module
    const configOpts = JSON.parse(fs.readFileSync(cmdOptions.config || path.join(rootPath, "config.json"), "utf8"));

    // check if arguments are specified if not make an empty array
    if (!(configOpts.node && configOpts.node.args)) {
      configOpts.node.args = [];
    }

    if (configOpts.node && configOpts.node.bindAddr) {
      // add bind address to arguments
      configOpts.node.args.push("--rpc-bind-ip");
      configOpts.node.args.push(configOpts.node.bindAddr);
    }

    if (configOpts.node && configOpts.node.port) {
      // add fee address to arguments
      configOpts.node.args.push("--rpc-bind-port");
      configOpts.node.args.push(configOpts.node.port);
    }

    if (configOpts.node && configOpts.node.feeAddr) {
      // add fee address to arguments
      configOpts.node.args.push("--fee-address");
      configOpts.node.args.push(configOpts.node.feeAddr);
    }

    if (cmdOptions.setup) {
      setup.Initialize(configFileName);
    } else if (cmdOptions.service) {
      switch (cmdOptions.service) {
        case "install":
          service.install(configOpts, configFileName);
          break;
        case "remove":
          service.remove(configOpts, configFileName);
          break;
        case "start":
          service.start(configOpts, configFileName);
          break;
        case "stop":
          service.stop(configOpts, configFileName);
          break;
        case "status":
          service.status(configOpts, configFileName);
          break;
        default: console.log('wrong parameter for service command. Valid values: "install", "remove", "start", "stop"');
      }
    } else if (cmdOptions.download) {
      service.stop(configOpts, configFileName);
      download.downloadLatestDaemon(utils.getNodeActualPath(cmdOptions, configOpts, rootPath), function (error) {
        if (error) {
          console.log(vsprintf("Error downloading daemon: %s", [error]));
        } else {
          console.log("The daemon has been succesfully downloaded");
        }
      });
    } else {
      const nodePath = utils.getNodeActualPath(cmdOptions, configOpts, rootPath);
      var guardInstance = null;

      // createGuardInstance function
      var createGuardInstance = function () {
        guardInstance = new mainEngine.NodeGuard(cmdOptions, configOpts, rootPath);
      };

      if (!fs.existsSync(nodePath)) {
        download.downloadLatestDaemon(nodePath, function (error) {
          if (error) {
            console.log(vsprintf("Error downloading daemon: %s", [error]));
          } else {
            console.log("The daemon has been succesfully downloaded");
            createGuardInstance();
          }
        });
      } else {
        createGuardInstance();
      }

      process.on("exit", function () {
        if (guardInstance) {
          guardInstance.stop();
        }
      });
    }
  }
}
