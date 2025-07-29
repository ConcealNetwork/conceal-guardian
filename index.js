// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import { getNodeActualPath } from "./units/utils.js";
import commandLineUsage from "command-line-usage";
import commandLineArgs from "command-line-args";
import { NodeGuard } from "./units/engine.js";
import { Initialize } from "./units/setup.js";
import path from "path";
import fs from "fs";
import { 
  downloadLatestDaemon, 
  downloadLatestGuardian
} from "./units/download.js";
import {
  install, 
  remove, 
  stop, 
  start, 
  status
} from "./units/service.js";

// read the package.json to have version info available
const pjson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json")));

try {
  var cmdOptions = commandLineArgs([{
    name: "config",
    type: String
  }, {
    name: "daemon",
    type: String
  }, {
    name: "service",
    type: String
  }, {
    name: "setup",
    type: Boolean
  }, {
    name: "node",
    type: String
  }, {
    name: "update",
    type: Boolean
  }, {
    name: "version",
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
          name: 'daemon',
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
          name: 'node',
          description: 'Node related commands. Possible values are: "update"'
        },
        {
          name: 'update',
          description: 'Update the guardian instance to the latest version'
        },
        {
          name: 'version',
          description: 'Shows the verion of the Guardian app'
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
        },
        {
          name: 'status',
          description: 'Shows the status of the OS service.'
        }
      ]
    },
    {
      header: 'Node option values',
      optionList: [
        {
          name: 'update',
          description: 'Updates to the latest stable version of the node daemon. Node must be stoped first'
        }
      ]
    }
  ];
  const usage = commandLineUsage(sections);
  console.log(usage);
} else if (cmdOptions.version) {
  console.log(`\nConceal node guardian version ${pjson.version}\n`);
} else {
  const rootPath = process.cwd();
  const configFileName = cmdOptions.config || path.join(rootPath, "config.json");

  if (!fs.existsSync(configFileName)) {
    console.log(`\n"${configFileName}" does not exist! Specify the correct path to the config file or create config.json in the same directory as the application. You can use the config.json.sample as an example\n`);
  } else {
    // read config option to use them either in engine or setup module
    const configOpts = JSON.parse(fs.readFileSync(cmdOptions.config || path.join(rootPath, "config.json"), "utf8"));

    // check if arguments are specified if not make an empty array
    if (!(configOpts.node && configOpts.node.args)) {
      configOpts.node.args = [];
    }

    if (configOpts.node && configOpts.node.bindAddr) {
      var addrIndex = configOpts.node.args.indexOf("--rpc-bind-ip");

      if (addrIndex == -1) {
        // add bind address to arguments
        configOpts.node.args.push("--rpc-bind-ip");
        configOpts.node.args.push(configOpts.node.bindAddr);
      } else {
        configOpts.node.args[addrIndex + 1] = configOpts.node.bindAddr;
      }
    }

    if (configOpts.node && configOpts.node.port) {
      var portIndex = configOpts.node.args.indexOf("--rpc-bind-port");

      if (portIndex == -1) {
        // add fee address to arguments
        configOpts.node.args.push("--rpc-bind-port");
        configOpts.node.args.push(configOpts.node.port);
      } else {
        configOpts.node.args[portIndex + 1] = configOpts.node.port;
      }
    }

    if (configOpts.node && configOpts.node.feeAddr) {
      // add fee address to arguments
      configOpts.node.args.push("--fee-address");
      configOpts.node.args.push(configOpts.node.feeAddr);
    }

    if (cmdOptions.setup) {
      Initialize(configFileName);
    } else if (cmdOptions.service) {
      switch (cmdOptions.service) {
        case "install":
          install(configOpts, configFileName);
          break;
        case "remove":
          remove(configOpts, configFileName);
          break;
        case "start":
          start(configOpts, configFileName);
          break;
        case "stop":
          stop(configOpts, configFileName);
          break;
        case "status":
          status(configOpts, configFileName);
          break;
        default: console.log('\nWrong parameter for service command. Valid values: "install", "remove", "start", "stop", "status"\n');
      }
    } else if (cmdOptions.node) {
      if (cmdOptions.node === "update") {
        stop(configOpts, configFileName);
        downloadLatestDaemon(getNodeActualPath(cmdOptions, configOpts, rootPath), function (error) {
          if (error) {
            console.log(`\nError updating daemon: ${error}\n`);
          } else {
            console.log("\nThe daemon has been succesfully updated\n");
          }
        });
      } else {
        console.log('\nWrong parameter for node command. Valid values: "update"\n');
      }
    } else if (cmdOptions.update) {
      stop(configOpts, configFileName);
      downloadLatestGuardian(function (error) {
        if (error) {
          console.log(`\nError updating the guardian: ${error}\n`);
        } else {
          console.log("\nThe guardian has been succesfully updated\n");
        }
      });
    } else {
      const nodePath = getNodeActualPath(cmdOptions, configOpts, rootPath);
      var guardInstance = null;

      // createGuardInstance function
      var createGuardInstance = function () {
        guardInstance = new NodeGuard(cmdOptions, configOpts, rootPath, pjson.version);
      };

      if (!fs.existsSync(nodePath)) {
        downloadLatestDaemon(nodePath, function (error) {
          if (error) {
            console.log(`\nError updating daemon: ${error}\n`);
          } else {
            console.log("\nThe daemon has been succesfully updated\n");
            createGuardInstance();
          }
        });
      } else {
        createGuardInstance();
      }

      process.on('uncaughtException', function (err) {
        guardInstance.logError(err);
      });
      // Handle SIGINT (Ctrl+C)
      process.on('SIGINT', function() {
        console.log("Received SIGINT, stopping the guardian....");
        
        // Prevent signal propagation to child processes
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('SIGHUP');

        if (guardInstance && guardInstance.getProcess()) {
          // Set up exit listener BEFORE calling stop
          guardInstance.getProcess().on("exit", function (code, signal) {
            console.log(`Daemon stopped with code ${code}, signal ${signal}`);
            console.log("Exiting guardian....");
            process.exit(0);
          });

          // stop the process
          guardInstance.stop(false);
        } else {
          console.log("No daemon process found, exiting....");
          process.exit(0);
        }
      });

      // Also handle SIGTERM for system service shutdowns
      process.on('SIGTERM', function() {
        console.log("Received SIGTERM, stopping the guardian....");
        
        // Prevent signal propagation to child processes
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('SIGHUP');

        if (guardInstance && guardInstance.getProcess()) {
          // Set up exit listener BEFORE calling stop
          guardInstance.getProcess().on("exit", function (code, signal) {
            console.log(`Daemon stopped with code ${code}, signal ${signal}`);
            console.log("Exiting guardian....");
            process.exit(0);
          });

          // stop the process
          guardInstance.stop(false);
        } else {
          console.log("No daemon process found, exiting....");
          process.exit(0);
        }
      });

      // Handle SIGHUP (terminal window closed)
      process.on('SIGHUP', function() {
        console.log("Received SIGHUP (terminal closed), stopping the guardian....");
        
        // Prevent signal propagation to child processes
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('SIGHUP');

        if (guardInstance && guardInstance.getProcess()) {
          // Set up exit listener BEFORE calling stop
          guardInstance.getProcess().on("exit", function (code, signal) {
            console.log(`Daemon stopped with code ${code}, signal ${signal}`);
            console.log("Exiting guardian....");
            process.exit(0);
          });

          // stop the process
          guardInstance.stop(false);
        } else {
          console.log("No daemon process found, exiting....");
          process.exit(0);
        }
      });

      // Handle process exit to ensure cleanup
      process.on('exit', function(code) {
        console.log(`Guardian process exiting with code ${code}`);
        if (guardInstance && guardInstance.getProcess()) {
          console.log("Ensuring daemon is stopped...");
          guardInstance.stop(false);
        }
      });      
    }
  }
}
