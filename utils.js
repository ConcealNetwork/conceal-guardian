// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const UUID = require("pure-uuid");

module.exports = {
  ensureUserDataDir: function() {
    var userDataDir = process.env.APPDATA || (
      process.platform === "darwin"
      ? process.env.HOME + "/Library/Application\ Support"
      : process.env.HOME + "/.local/share");
    userDataDir = path.join(userDataDir, "ConcealNodeGuard");

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir);
    }

    return userDataDir;
  },
  ensureNodeUniqueId: function() {
    var nodeDataFile = path.join(this.ensureUserDataDir(), "nodedata.json");

    if (fs.existsSync(nodeDataFile)) {
      var nodeData = JSON.parse(fs.readFileSync(nodeDataFile));
      return nodeData.id;
    } else {
      var nodeData = { id: new UUID(4).format() }
      fs.writeFileSync( nodeDataFile, JSON.stringify(nodeData), "utf8");
      return nodeData.id;
    }
  }
};
