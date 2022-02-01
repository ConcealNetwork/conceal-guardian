#!/bin/bash
rm -rf ./bin/linux/*
mkdir -p ./bin/linux
pkg index.js --targets node10-linux-x64 --output ./bin/linux/guardian-linux64
cp -R ./html ./bin/linux/html
cp ./exclude.txt ./bin/linux/exclude.txt
cp ./ccx-guardian.service.template ./bin/linux
cp ./config.json.sample ./bin/linux/config.json
tar -czf ./bin/linux/guardian-linux64.tar.gz -C ./bin/linux guardian-linux64 config.json exclude.txt ccx-guardian.service.template html
