const { format, utcToZonedTime } = require("date-fns-tz");
const {
  parse,
  isValid,
  isAfter,
  sub,
  add,
  getTime,
  startOfDay,
  endOfDay,
  differenceInMilliseconds,
} = require("date-fns");

const { toMilliseconds: durationToMilliSeconds } = "duration-fns";

const timeZone = "America/Sao_Paulo";
const ISO8601 = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";
/**
 * @name DateHelper
 * @description class responsable to deal with dates
 */
class DateHelper {
  static toDate(value, dateFormat) {
    return parse(value, dateFormat, new Date());
  }

  static format(value, formatFrom, formatTo) {
    const parsed = parse(value, formatFrom, new Date());
    return format(parsed, formatTo);
  }

  static toIsoFormat(date) {
    return format(date, ISO8601, { timeZone });
  }

  static toZonedTime(date) {
    return utcToZonedTime(date, timeZone);
  }

  static isValid(value, formatString) {
    const parsed = parse(value, formatString, new Date());
    return isValid(parsed);
  }

  static now() {
    const zonedDate = this.toZonedTime(new Date());
    return this.toIsoFormat(zonedDate);
  }

  static isAfter(date, dateToCompare) {
    return isAfter(date, dateToCompare);
  }

  static subtract(date, duration) {
    return sub(date, duration);
  }

  static add(date, duration) {
    return add(date, duration);
  }

  static valueOf(date) {
    if (date instanceof Date || typeof date === "number") return getTime(date);
    return durationToMilliSeconds(date);
  }

  static startOfDay(date) {
    return startOfDay(date);
  }

  static endOfDay(date) {
    return endOfDay(date);
  }

  static diff(dateLeft, dateRight) {
    return differenceInMilliseconds(dateLeft, dateRight);
  }
}
DateHelper.ISO8601 = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx";

module.exports = DateHelper;
