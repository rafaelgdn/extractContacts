/* eslint-disable no-console */
// how to colors
// https://nodejs.org/api/util.html#util_customizing_util_inspect_colors
// https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color

const { service } = process.env;

function log(message, infos, type, logFunc) {
  let msg = {
    level: type,
    message,
  };

  if (service) {
    msg.service = service;
  }

  msg = Object.assign(msg, infos);

  logFunc(msg);
}

class Logger {
  static info(message, infos) {
    log(message, infos, "debug", console.info);
  }

  static warning(message, infos) {
    log(message, infos, "warning", console.warn);
  }

  static error(message, infos) {
    log(message, infos, "error", console.error);
  }
}

module.exports = { Logger };
