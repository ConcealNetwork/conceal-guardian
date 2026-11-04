// Copyright (c) 2019-2026, Taegus Cromis, Acktarius, The Conceal Developers
//
// Please see the included LICENSE file for more information.

// must be imported first so the check runs before any other module is loaded
const [nodeMajor, nodeMinor, nodePatch] = process.versions.node
  .split(".")
  .map((part) => Number.parseInt(part, 10));
const belowMinimum =
  nodeMajor < 22 || (nodeMajor === 22 && (nodeMinor < 23 || (nodeMinor === 23 && nodePatch < 4)));

if (belowMinimum) {
  console.error(
    `\nConceal Guardian requires Node.js 22.23.4 or higher, but Node.js ${process.version} was detected.\n` +
      'Please upgrade Node.js (e.g. via nvm: "nvm install 22.23.4", or from https://nodejs.org) and try again.\n',
  );
  process.exit(1);
}
