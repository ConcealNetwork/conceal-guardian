// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const commandLineUsage = require('command-line-usage');
const commandLineArgs = require("command-line-args");
const mainEngine = require("./engine.js");
const vsprintf = require("sprintf-js").vsprintf;
const setup = require("./setup.js");
const path = require("path");
const fs = require("fs");

const cmdOptions = commandLineArgs([{
  name: "config",
  alias: "c",
  type: String
}, {
  name: "node",
  alias: "n",
  type: String
}, {
  name: "setup",
  alias: "s",
  type: Boolean
}, {
  name: "help",
  alias: "h",
  type: Boolean
}]);

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
          description: 'The path to configuration file. If empty is uses the config.js in the same directory as the app.'
        },
        {
          name: 'node',
          typeLabel: '{underline file}',
          description: 'The path to node daemon executable. If empty is uses the same directory as the app.'
        },
        {
          name: 'setup',
          description: 'Initiates the interactive config setup for the guardian'
        },
        {
          name: 'help',
          description: 'Shows this help instructions'
        }
      ]
    }
  ]
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
    } else {
      var guardInstance = new mainEngine.NodeGuard(cmdOptions, configOpts, rootPath);

      process.on("exit", function () {
        guardInstance.stop();
      });
    }
  }
}
