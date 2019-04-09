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
        message: 'Please input the path to the "conceald" executable (if you do not know what to put in, leave it empty)',
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
        type: 'confirm',
        name: 'usePool',
        message: 'Do you want to be listed in the nodes pool?',
        default: ((configOpts.pool && configOpts.pool.notify) && (configOpts.pool.notify.url)) ? true : false
      },
      {
        type: 'input',
        name: 'poolURL',
        message: 'Please input the URL of the pool (default value should be ok)',
        default: (configOpts.pool && configOpts.pool.notify) ? (configOpts.pool.notify.url || "") : "",
        when: function (answers) {
          return answers.usePool;
        }
      },
      {
        type: 'confirm',
        name: 'notifyDiscord',
        message: 'Do you want to be notified on Discord in case of problems?',
        default: ((configOpts.error) && (configOpts.error.notify) && (configOpts.error.notify.discord)) ? true : false
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
      {
        type: 'confirm',
        name: 'notifyEmail',
        message: 'Do you want to be notified over email in case of problems?',
        default: ((configOpts.error) && (configOpts.error.notify) && (configOpts.error.notify.email)) ? true : false
      },
      {
        type: 'input',
        name: 'emailSMTPHost',
        message: 'Please input the SMTP server hostname',
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.email && configOpts.error.notify.email.smtp) ? (configOpts.error.notify.email.smtp.host || "") : "",
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
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.email && configOpts.error.notify.email.smtp) ? (configOpts.error.notify.email.smtp.port || 25) : 25,
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
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.email && configOpts.error.notify.email.smtp) ? (configOpts.error.notify.email.smtp.secure || false) : false,
        when: function (answers) {
          return answers.notifyEmail;
        }
      },
      {
        type: 'confirm',
        name: 'emailRequireAuth',
        message: 'Does the SMTP server requere authentication for sending out emails (most do)?',
        default: ((configOpts.error) && (configOpts.error.notify) && (configOpts.error.notify.email && configOpts.error.notify.email.auth)) ? true : false,
        when: function (answers) {
          return answers.notifyEmail;
        }
      },
      {
        type: 'input',
        name: 'emailAuthUsername',
        message: 'Please input the SMTP server "username"',
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.email && configOpts.error.notify.email.auth) ? (configOpts.error.notify.email.auth.username || "") : "",
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
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.email && configOpts.error.notify.email.auth) ? (configOpts.error.notify.email.auth.password || "") : "",
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
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.email && configOpts.error.notify.email.message) ? (configOpts.error.notify.email.message.from || "") : "",
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
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.email && configOpts.error.notify.email.message) ? (configOpts.error.notify.email.message.to || "") : "",
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
        default: (configOpts.error && configOpts.error.notify && configOpts.error.notify.email && configOpts.error.notify.email.message) ? (configOpts.error.notify.email.message.subject || "") : "",
        when: function (answers) {
          return answers.notifyEmail;
        }
      },
    ];

    inquirer.prompt(questions).then(answers => {
      // node name is mandatory
      configOpts.node.name = answers.nodeName;

      if (answers.nodePath) {
        configOpts.node.path = answers.nodePath;
      } else {
        delete configOpts.node.path;
      }

      if (answers.reachableOutside) {
        configOpts.node.bindAddr = '0.0.0.0';
      } else {
        configOpts.node.bindAddr = '127.0.0.1';
      }

      if (answers.useFeeAddress) {
        configOpts.node.feeAddr = answers.feeAddress;
      } else {
        delete configOpts.node.feeAddr;
      }

      if (answers.usePool) {
        configOpts.pool.notify.url = answers.poolURL;
      } else {
        delete configOpts.pool.notify;
      }

      if (answers.notifyDiscord) {
        configOpts.error.notify.discord.url = answers.discordHookURL;
      } else {
        delete configOpts.error.notify.discord;
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
