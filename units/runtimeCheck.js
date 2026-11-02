// Copyright (c) 2019-2022, Taegus Cromis, The Conceal Developers
//
// Please see the included LICENSE file for more information.

// must be imported first so the check runs before any other module is loaded
const nodeMajorVersion = Number.parseInt(process.versions.node.split(".")[0], 10);

if (nodeMajorVersion < 20) {
  console.error(
    `\nConceal Guardian requires Node.js 20 or higher, but Node.js ${process.version} was detected.\n` +
      'Please upgrade Node.js (e.g. via nvm: "nvm install 20", or from https://nodejs.org) and try again.\n',
  );
  process.exit(1);
}
