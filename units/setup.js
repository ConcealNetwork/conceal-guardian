// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

var inquirer = require('inquirer');
const fs = require("fs");

module.exports = {
  Initialize: function (configFileName) {
    const configOpts = JSON.parse(fs.readFileSync(configFileName), "utf8");

    var questions = [
      {
        type: 'input',
        name: 'nodePath',
        message: 'Please input the path to the node executable',
        default: configOpts.node ? (configOpts.node.path || "") : ""
      },
      {
        type: 'input',
        name: 'nodeName',
        message: 'Please input name for your node (this will be what others see)',
        default: configOpts.node ? (configOpts.node.name || "") : "",
        validate: function (value) {
          if (value) {
            return true;
          } else {
            return 'Node name cannot be empty!';
          }
        }
      },
      {
        type: 'confirm',
        name: 'useFeeAddress',
        message: 'Will this be a fee based remote node?',
        default: ((configOpts.node) && (configOpts.node.feeAddr)) ? true : false
      },
      {
        type: 'input',
        name: 'feeAddress',
        message: 'Please input the fee address for your node (earnings will be sent to that address)',
        default: configOpts.node ? (configOpts.node.feeAddr || "") : "",
        when: function (answers) {
          return answers.useFeeAddress;
        }
      },
      {
        type: 'confirm',
        name: 'reachableOutside',
        message: 'Will your node be accessible from the outside?',
        default: ((configOpts.node) && (configOpts.node.bindAddr == '0.0.0.0')) ? true : false
      },
      {
        type: 'input',
        name: 'poolURL',
        message: 'Please input the URL of the pool (default value should be ok)',
        default: (configOpts.pool && configOpts.pool.notify) ? (configOpts.pool.notify.url || "") : ""
      },
      {
        type: 'confirm',
        name: 'notifyDiscord',
        message: 'Do you want to be notified on Discord in case of problems?',
        default: ((configOpts.error) && (configOpts.error.notify) && (configOpts.error.notify.discord) && (configOpts.error.notify.discord.url)) ? true : false
      },
      {
        type: 'input',
        name: 'discordHookURL',
        message: 'Please input the Discord hook to which error message will be sent',
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.discord) ? (configOpts.error.notify.discord.url || "") : "",
        when: function (answers) {
          return answers.notifyDiscord;
        }
      },
    ];

    inquirer.prompt(questions).then(answers => {
      configOpts.node.path = answers.nodePath;
      configOpts.node.name = answers.nodeName;
      configOpts.node.feeAddr = answers.feeAddress;
      configOpts.pool.notify.url = answers.poolURL;
      configOpts.error.notify.discord.url = answers.discordHookURL;

      if (answers.reachableOutside) {
        configOpts.node.bindAddr = '0.0.0.0';
      } else {
        configOpts.node.bindAddr = '127.0.0.1';
      }

      fs.writeFile(configFileName, JSON.stringify(configOpts, null, 2), function (err) {
        if (err) {
          console.log('\nError trying to save the changes: ' + err);
        } else {
          console.log('\nYour changes have been saved!');
        }
      });
    });
  }
};
