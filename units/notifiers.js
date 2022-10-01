// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import nodemailer from "nodemailer";
import request from "request";
import oPath from "object-path";
import os from "os";

function notifyViaDiscord(config, msgText, msgType, nodeData) {
  if (oPath.get(config, 'error.notify.discord.url', '')) {
    var hookOptions = {
      uri: oPath.get(config, 'error.notify.discord.url', ''),
      method: "POST",
      json: {
        content: `Node **${nodeData.name}** reported an error -> ${msgText} \n`
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

  // HTML and plain bodies for the notification mail
  const bodyContentHTML = `Node <B>${nodeData.name}</B> reported an error -> ${msgText}`;
  const bodyContentPlain = `Node **${nodeData.name}** reported an error -> ${msgText}`;

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


export function notifyOnError(config, msgText, msgType, nodeData) {
  // check if we need to notify the Discord
  if (config.error.notify.discord) {
    notifyViaDiscord(config, msgText, msgType, nodeData);
  }

  if (config.error.notify.email) {
    notifyViaEmail(config, msgText, msgType, nodeData);
  }
};
