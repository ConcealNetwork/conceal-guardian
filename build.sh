#!/bin/bash
rm -rf ./dist/*
rm -rf ./bin/linux/*
mkdir -p ./bin/linux
npm run package
nexe index.js --build -o ./bin/linux/guardian-linux64
cp -R ./html ./bin/linux/html
cp ./exclude.txt ./bin/linux/exclude.txt
cp ./package.json ./bin/linux/package.json
cp ./config.json.sample ./bin/linux/config.json
cp ./ccx-guardian.service.template ./bin/linux
cp ./dist/index.js ./bin/linux/index.js
cp ./dist/exec-child.js ./bin/linux/exec-child.js
tar -czf ./bin/linux/guardian-linux64.tar.gz -C ./bin/linux/guardian-linux64 ./bin/linux/index.js ./bin/linux/exec-child.js ./bin/linux/config.json ./bin/linux/package.json exclude.txt ccx-guardian.service.template html
