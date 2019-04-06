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
        type: 'input',
        name: 'feeAddress',
        message: 'Please input the fee address for your node (earnings will be sent to that address)',
        default: configOpts.node ? (configOpts.node.feeaddr || "") : ""
      },
      {
        type: 'input',
        name: 'poolURL',
        message: 'Please input the URL of the pool (default value should be ok)',
        default: (configOpts.pool && configOpts.pool.notify) ? (configOpts.pool.notify.url || "") : ""
      },
    ];

    inquirer.prompt(questions).then(answers => {
      configOpts.node.path = answers.nodePath;
      configOpts.node.name = answers.nodeName;
      configOpts.node.feeaddr = answers.feeAddress;
      configOpts.pool.notify.url = answers.poolURL;

      fs.writeFileSync(configFileName, JSON.stringify(configOpts, null, 2));
      console.log('Your changes have been saved!');
    });
  }
};
