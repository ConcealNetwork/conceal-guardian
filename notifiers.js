// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

const nodemailer = require("nodemailer");
const vsprintf = require("sprintf-js").vsprintf;
const request = require("request");
const os = require("os");

function notifyViaDiscord(config, msgText, msgType, nodeData) {
  if (config.error.notify.discord.url) {
    var hookOptions = {
      uri: config.error.notify.discord.url,
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
  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: config.error.notify.email.smtp.host,
    port: config.error.notify.email.smtp.port,
    secure: config.error.notify.email.smtp.secure,
    auth: {
      user: config.error.notify.email.auth.username,
      pass: config.error.notify.email.auth.password
    },
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
    from: config.error.notify.email.message.from,
    to: config.error.notify.email.message.to,
    subject: config.error.notify.email.message.subject || "Conceal Guardian Error",
    text: bodyContentPlain, // plain text body
    html: bodyContentHTML  // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    // eath the error or success, noone to report to
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
