// Copyright (c) 2019, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

"use strict";

const UUID = require("pure-uuid");
const path = require("path");
const fs = require("fs");

module.exports = {
  ensureUserDataDir: function () {
    var userDataDir = process.env.APPDATA || (
      process.platform === "darwin"
      ? process.env.HOME + "/Library/Application Support"
      : process.env.HOME + "/.local/share");
    userDataDir = path.join(userDataDir, "ConcealNodeGuard");

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir);
    }

    return userDataDir;
  },
  ensureNodeUniqueId: function () {
    var nodeDataFile = path.join(this.ensureUserDataDir(), "nodedata.json");
    var nodeData = null;

    if (fs.existsSync(nodeDataFile)) {
      nodeData = JSON.parse(fs.readFileSync(nodeDataFile));
      return nodeData.id;
    } else {
      nodeData = {
        id: new UUID(4).format()
      };
      fs.writeFileSync(nodeDataFile, JSON.stringify(nodeData), "utf8");
      return nodeData.id;
    }
  }
};
