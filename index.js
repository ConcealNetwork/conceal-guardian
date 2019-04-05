// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

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
}]);

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