const childProcess = require('child_process');
const Promise = require('bluebird');
const lg = require('./log');

Promise.config({
  cancellation: true
});

const shell = fn => (...args) => new Promise((resolve, reject, onCancel) => {
  const child = fn(...args, (error, stdout, stderr) => {
    if (error) {
      lg.trace(`${args} exit with ${error}`);
      reject({error, stderr});
      return;
    }
    lg.trace(`${args} exit safely.`);
    resolve(stdout);
  });
  onCancel(() => {
    child.kill();
    lg.trace(`${args} cancelled.`);
  });
});

module.exports = {
  command: shell(childProcess.exec),
  file: shell(childProcess.execFile)
};
