// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

var inquirer = require('inquirer');
const fs = require("fs");

module.exports = {
  Initialize: function (configOpts, configFileName) {
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
        default: configOpts.node ? (configOpts.node.name || "") : ""
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

      fs.writeFileSync(configFileName, JSON.stringify(configOpts, null, 2));
      console.log('\nYour changes have been saved!');
    });
  }
};
