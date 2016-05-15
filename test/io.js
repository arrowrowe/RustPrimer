const fs = require('fs-extra');
const Promise = require('bluebird');

const glop = Promise.promisify(require('glob'));
const readFile = Promise.promisify(fs.readFile);
const read = (file, options='utf8') => readFile(file, options);
const write = Promise.promisify(fs.outputFile);

module.exports = {
  glop,
  read,
  write
};
