const sleep = (ms) =>
  new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
modeule.exports = sleep;
