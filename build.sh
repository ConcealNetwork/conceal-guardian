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
tar -czf ./bin/linux/guardian-linux64.tar.gz --exclude guardian-linux64.tar.gz -C ./bin/linux .
