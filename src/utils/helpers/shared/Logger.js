const util = require("util");
// how to colors
// https://nodejs.org/api/util.html#util_customizing_util_inspect_colors
// https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
function log(message, type, infos, local, depth) {
  // this is here for jest. maybe there is a better way.
  const { service, IS_LOCAL } = process.env;
  if (local && !IS_LOCAL) return;
  const colors = {
    debug: "42m",
    warning: "43m",
    error: "45m",
  };
  const logs = {
    debug: console.log,
    warning: console.warn,
    error: console.error,
    dir: console.dir,
  };
  let msg = { level: type, message, ...infos };
  if (service) {
    msg.service = service;
  }
  if (IS_LOCAL && type !== "dir") {
    const color = colors[type];
    msg.level += " DEPTH INFINITY";
    msg = util.inspect(msg, { depth: null, colors: true });
    msg = msg
      .replace("32m", `${color}\u001b[30m`)
      .replace("39m", "49m\u001b[39m");
  } else {
    msg = util.inspect(msg, { depth });
  }
  if (type !== "dir") logs[type](msg);
  else logs[type](msg, { depth });
}
class Logger {
  static info(message, infos, local = false, depth) {
    log(message, "debug", infos, local, depth);
  }

  static warn(message, infos, local = false, depth) {
    log(message, "warning", infos, local, depth);
  }

  static error(message, infos, local = false, depth) {
    log(message, "error", infos, local, depth);
  }

  /**
   * @deprecated because doesnt work as expected in aws
   */
  static dir(message, infos, depth, local = false) {
    log(message, "dir", infos, local, depth);
  }
}

module.exports = Logger;
