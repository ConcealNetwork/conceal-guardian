// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import inquirer from "inquirer";
import oPath from "object-path";
import fs from "fs";

export function Initialize(configFileName) {
  const configOpts = JSON.parse(fs.readFileSync(configFileName), "utf8");

  var questions = [
    {
      type: 'input',
      name: 'nodePath',
      message: 'Please input the path to the "conceald" executable (if you do not know what to put in, leave it empty)',
      default: oPath.get(configOpts, 'node.path', '')
    },
    {
      type: 'input',
      name: 'nodeName',
      message: 'Please input name for your node (this will be what others see)',
      default: oPath.get(configOpts, 'node.name', ''),
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
      default: oPath.has(configOpts, 'node.feeAddr'),
    },
    {
      type: 'input',
      name: 'feeAddress',
      message: 'Please input the fee address for your node (earnings will be sent to that address)',
      default: oPath.get(configOpts, 'node.feeAddr', ''),
      when: function (answers) {
        return answers.useFeeAddress;
      }
    },
    {
      type: 'confirm',
      name: 'reachableOutside',
      message: 'Will your node be accessible from the outside?',
      default: oPath.get(configOpts, 'node.bindAddr', '127.0.0.1') == '0.0.0.0' ? true : false
    },
    {
      type: 'confirm',
      name: 'autoUpdate',
      message: 'Will your node have auto update enabled?',
      default: oPath.get(configOpts, 'node.autoUpdate', false)
    },
    {
      type: 'confirm',
      name: 'nodeUrl',
      message: 'Will your node have a custom url? (if you do not know about it, just leave it empty)',
      default: oPath.has(configOpts, 'url')
    },
    {
      type: 'input',
      name: 'nodeUrlHost',
      message: 'Input the node url hostname',
      default: oPath.get(configOpts, 'url.host', ''),
      when: function (answers) {
        return answers.nodeUrl;
      }
    },
    {
      type: 'input',
      name: 'nodeUrlPort',
      message: 'Input the node url port',
      default: oPath.get(configOpts, 'url.port', ''),
      when: function (answers) {
        return answers.nodeUrl;
      }
    },
    {
      type: 'confirm',
      name: 'usePool',
      message: 'Do you want to be listed in the nodes pool?',
      default: oPath.has(configOpts, 'pool.notify')
    },
    {
      type: 'input',
      name: 'poolURL',
      message: 'Please input the URL of the pool (default value should be ok)',
      default: oPath.get(configOpts, 'pool.notify.url', ''),
      when: function (answers) {
        return answers.usePool;
      }
    },
    {
      type: 'confirm',
      name: 'notifyDiscord',
      message: 'Do you want to be notified on Discord in case of problems?',
      default: oPath.has(configOpts, 'error.notify.discord')
    },
    {
      type: 'input',
      name: 'discordHookURL',
      message: 'Please input the Discord hook to which error message will be sent',
      default: oPath.get(configOpts, 'error.notify.discord.url', ''),
      when: function (answers) {
        return answers.notifyDiscord;
      }
    },
    {
      type: 'confirm',
      name: 'notifyEmail',
      message: 'Do you want to be notified over email in case of problems?',
      default: oPath.has(configOpts, 'error.notify.email')
    },
    {
      type: 'input',
      name: 'emailSMTPHost',
      message: 'Please input the SMTP server hostname',
      default: oPath.get(configOpts, 'error.notify.email.smtp.host', ''),
      when: function (answers) {
        return answers.notifyEmail;
      },
      validate: function (value) {
        if (value) {
          return true;
        } else {
          return 'SMTP server host cannot be empty!';
        }
      }
    },
    {
      type: 'input',
      name: 'emailSMTPPort',
      message: 'Please input the SMTP server port',
      default: oPath.get(configOpts, 'error.notify.email.smtp.port', 25),
      when: function (answers) {
        return answers.notifyEmail;
      },
      validate: function (value) {
        if (value) {
          return true;
        } else {
          return 'SMTP server port cannot be empty!';
        }
      }
    },
    {
      type: 'confirm',
      name: 'emailSMTPSecure',
      message: 'Is the SMTP connection secure?',
      default: oPath.get(configOpts, 'error.notify.email.smtp.secure', false),
      when: function (answers) {
        return answers.notifyEmail;
      }
    },
    {
      type: 'confirm',
      name: 'emailRequireAuth',
      message: 'Does the SMTP server requere authentication for sending out emails (most do)?',
      default: true,
      when: function (answers) {
        return answers.notifyEmail;
      }
    },
    {
      type: 'input',
      name: 'emailAuthUsername',
      message: 'Please input the SMTP server "username"',
      default: oPath.get(configOpts, 'error.notify.email.auth.username', ''),
      when: function (answers) {
        return answers.emailRequireAuth;
      },
      validate: function (value) {
        if (value) {
          return true;
        } else {
          return 'SMTP server "username" cannot be empty!';
        }
      }
    },
    {
      type: 'password',
      name: 'emailAuthPassword',
      message: 'Please input the SMTP server "password"',
      default: oPath.get(configOpts, 'error.notify.email.auth.password', ''),
      when: function (answers) {
        return answers.emailRequireAuth;
      },
      validate: function (value) {
        if (value) {
          return true;
        } else {
          return 'SMTP server "password" cannot be empty!';
        }
      }
    },
    {
      type: 'input',
      name: 'emailMessageFrom',
      message: 'Please input the email "from" field value',
      default: oPath.get(configOpts, 'error.notify.email.message.from', ''),
      when: function (answers) {
        return answers.notifyEmail;
      },
      validate: function (value) {
        if (value) {
          return true;
        } else {
          return 'Email "from" field cannot be empty!';
        }
      }
    },
    {
      type: 'input',
      name: 'emailMessageTo',
      message: 'Please input the email "to" field value',
      default: oPath.get(configOpts, 'error.notify.email.message.to', ''),
      when: function (answers) {
        return answers.notifyEmail;
      },
      validate: function (value) {
        if (value) {
          return true;
        } else {
          return 'Email "to" field cannot be empty!';
        }
      }
    },
    {
      type: 'input',
      name: 'emailMessageSubject',
      message: 'Please input the email "subject" field value',
      default: oPath.get(configOpts, 'error.notify.email.message.subject', ''),
      when: function (answers) {
        return answers.notifyEmail;
      }
    },
  ];

  inquirer.prompt(questions).then(answers => {
    // node name is mandatory
    oPath.set(configOpts, 'node.name', answers.nodeName);
    answers.nodePath ? oPath.set(configOpts, 'node.path', answers.nodePath) : oPath.del(configOpts, 'node.path');
    answers.reachableOutside ? oPath.set(configOpts, 'node.bindAddr', '0.0.0.0') : oPath.set(configOpts, 'node.bindAddr', '127.0.0.1');
    answers.autoUpdate ? oPath.set(configOpts, 'node.autoUpdate', true) : oPath.del(configOpts, 'node.autoUpdate');

    answers.useFeeAddress ? oPath.set(configOpts, 'node.feeAddr', answers.feeAddress) : oPath.del(configOpts, 'node.feeAddr');
    answers.usePool ? oPath.set(configOpts, 'pool.notify.url', answers.poolURL) : oPath.del(configOpts, 'pool.notify');
    answers.notifyDiscord ? oPath.set(configOpts, 'error.notify.discord.url', answers.discordHookURL) : oPath.del(configOpts, 'error.notify.discord');

    if (answers.nodeUrl) {
      oPath.set(configOpts, 'url.host', answers.nodeUrlHost);
      oPath.set(configOpts, 'url.port', answers.nodeUrlPort);
    } else {
      oPath.del(configOpts, 'url');
    }

    if (answers.notifyEmail) {
      oPath.set(configOpts, 'error.notify.email.smtp.host', answers.emailSMTPHost);
      oPath.set(configOpts, 'error.notify.email.smtp.port', answers.emailSMTPPort);
      oPath.set(configOpts, 'error.notify.email.smtp.secure', answers.emailSMTPSecure);

      if (answers.emailRequireAuth) {
        oPath.set(configOpts, 'error.notify.email.auth.username', answers.emailAuthUsername);
        oPath.set(configOpts, 'error.notify.email.auth.password', answers.emailAuthPassword);
      } else {
        oPath.del(configOpts, 'error.notify.email.auth');
      }

      oPath.set(configOpts, 'error.notify.email.message.from', answers.emailMessageFrom);
      oPath.set(configOpts, 'error.notify.email.message.to', answers.emailMessageTo);
      oPath.set(configOpts, 'error.notify.email.message.subject', answers.emailMessageSubject);
    } else {
      oPath.del(configOpts, 'error.notify.email');
    }

    fs.writeFile(configFileName, JSON.stringify(configOpts, null, 2), function (err) {
      if (err) {
        console.log('\nError trying to save the changes: ' + err);
      } else {
        console.log('\nYour changes have been saved!');
      }
    });
  });
};
