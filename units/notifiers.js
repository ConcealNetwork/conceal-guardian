// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const nodemailer = require("nodemailer");
const vsprintf = require("sprintf-js").vsprintf;
const request = require("request");
const oPath = require("object-path");
const os = require("os");

function notifyViaDiscord(config, msgText, msgType, nodeData) {
  if (oPath.get(config, 'error.notify.discord.url', '')) {
    var hookOptions = {
      uri: oPath.get(config, 'error.notify.discord.url', ''),
      method: "POST",
      json: {
        content: vsprintf("Node **%s** reported an error -> %s \n", [
          nodeData.name,
          msgText
        ])
      }
    };

    request(hookOptions, function () {
      // for now its fire and forget, no matter if error occurs
    });
  }
}

function notifyViaEmail(config, msgText, msgType, nodeData) {
  var auth = null;

  if (oPath.get(config, 'error.notify.email.auth.username', '')) {
    auth = {
      user: oPath.get(config, 'error.notify.email.auth.username', ''),
      pass: oPath.get(config, 'error.notify.email.auth.password', '')
    };
  }

  // create transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: oPath.get(config, 'error.notify.email.smtp.host', ''),
    port: oPath.get(config, 'error.notify.email.smtp.port', 25),
    secure: oPath.get(config, 'error.notify.email.smtp.secure', false),
    auth: auth,
    tls: {
      rejectUnauthorized: false
    }
  });

  const bodyContentHTML = vsprintf("Node <B>%s</B> reported an error -> %s", [
    nodeData.name,
    msgText
  ]);

  const bodyContentPlain = vsprintf("Node **%s** reported an error -> %s", [
    nodeData.name,
    msgText
  ]);

  // setup email data with unicode symbols
  const mailOptions = {
    from: oPath.get(config, 'error.notify.email.message.from', ''),
    to: oPath.get(config, 'error.notify.email.message.to', ''),
    subject: oPath.get(config, 'error.notify.email.message.subject', 'Conceal Guardian Error'),
    text: bodyContentPlain, // plain text body
    html: bodyContentHTML  // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    // for now its fire and forget, no matter if error occurs
  });
}

module.exports = {
  notifyOnError: function (config, msgText, msgType, nodeData) {
    // check if we need to notify the Discord
    if (config.error.notify.discord) {
      notifyViaDiscord(config, msgText, msgType, nodeData);
    }

    if (config.error.notify.email) {
      notifyViaEmail(config, msgText, msgType, nodeData);
    }
  }
};
