// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

import nodemailer from "nodemailer";
import axios from "axios";
import oPath from "object-path";
import os from "os";

function notifyViaDiscord(config, msgText, msgType, nodeData) {
  if (oPath.get(config, 'error.notify.discord.url', '')) {
    // Validate and sanitize data before sending
    const sanitizedNodeName = String(nodeData?.name || 'Unknown').substring(0, 100);
    const sanitizedMsgText = String(msgText || '').substring(0, 1000);
    
    // Validate URL before making request
    const discordUrl = oPath.get(config, 'error.notify.discord.url', '');
    if (!discordUrl || typeof discordUrl !== 'string') {
      return; // Skip if no valid URL
    }
    
    try {
      const url = new URL(discordUrl);
      if (!['https:'].includes(url.protocol)) {
        return; // Skip if not HTTPS
      }
      
      // Validate Discord webhook URL format
      if (!url.hostname.includes('discord.com') || !url.pathname.includes('/api/webhooks/')) {
        return; // Skip if not a valid Discord webhook URL
      }
    } catch (err) {
      return; // Skip if invalid URL format
    }
    
    const discordPayload = {
      content: `Node **${sanitizedNodeName}** reported an error -> ${sanitizedMsgText} \n`
    };
    
    axios.post(discordUrl, discordPayload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Conceal Node Guardian'
      }
    }).then(response => {
      // Discord notification successful
    }).catch(err => {
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

  // Sanitize data before using in email content
  const sanitizedNodeName = String(nodeData?.name || 'Unknown').substring(0, 100);
  const sanitizedMsgText = String(msgText || '').substring(0, 1000);
  const sanitizedSubject = String(oPath.get(config, 'error.notify.email.message.subject', 'Conceal Guardian Error')).substring(0, 200);
  const sanitizedFrom = String(oPath.get(config, 'error.notify.email.message.from', '')).substring(0, 200);
  const sanitizedTo = String(oPath.get(config, 'error.notify.email.message.to', '')).substring(0, 200);

  // HTML and plain bodies for the notification mail
  const bodyContentHTML = `Node <B>${sanitizedNodeName}</B> reported an error -> ${sanitizedMsgText}`;
  const bodyContentPlain = `Node **${sanitizedNodeName}** reported an error -> ${sanitizedMsgText}`;

  // setup email data with unicode symbols
  const mailOptions = {
    from: sanitizedFrom,
    to: sanitizedTo,
    subject: sanitizedSubject,
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
