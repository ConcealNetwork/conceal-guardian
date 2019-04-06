// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const commandLineUsage = require('command-line-usage');
const commandLineArgs = require("command-line-args");
const mainEngine = require("./engine.js");
const vsprintf = require("sprintf-js").vsprintf;
const service = require("./service.js");
const setup = require("./setup.js");
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

    if (cmdOptions.setup) {
      setup.Initialize(configOpts, configFileName);
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
        default: console.log('wrong parameter for service command. Valid values: "install", "remove", "start", "stop"');
      }
    } else {
      var guardInstance = new mainEngine.NodeGuard(cmdOptions, configOpts, rootPath);

      process.on("exit", function () {
        guardInstance.stop();
      });
    }
  }
}
