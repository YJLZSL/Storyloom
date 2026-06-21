const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const releaseDir = 'D:\\AIKFCC\\Storyloom\\release';
const fileName = 'Storyloom-Setup-1.1.7.exe';
const filePath = path.join(releaseDir, fileName);
const blockMapPath = filePath + '.blockmap';

const size = fs.statSync(filePath).size;
const data = fs.readFileSync(filePath);
const hash = crypto.createHash('sha512').update(data).digest('base64');
const blockMapData = fs.readFileSync(blockMapPath);
const blockMapHash = crypto.createHash('sha512').update(blockMapData).digest('base64');

const yml = `version: 1.1.7
files:
  - url: Storyloom-Setup-1.1.7.exe
    sha512: ${hash}
    size: ${size}
  - url: Storyloom-Setup-1.1.7.exe.blockmap
    sha512: ${blockMapHash}
    size: ${fs.statSync(blockMapPath).size}
path: Storyloom-Setup-1.1.7.exe
sha512: ${hash}
releaseDate: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(releaseDir, 'latest.yml'), yml);
console.log('latest.yml generated');
