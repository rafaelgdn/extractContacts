/* eslint-disable no-param-reassign */
import jwt from "jsonwebtoken";
import { DateHelper } from "./shared";
import { Logger } from "./logger";
import { saveOnS3, readFromS3 } from "./s3";

const unitaryBatchParams = (searchEntries, retrieveEntries, event, context) => {
  const entry = searchEntries[0] || retrieveEntries[0];
  const { proxy } = event;
  const { captcha } = event;
  const path = `${entry.resultId}/${entry.attemptId}`;

  const params = {
    crawlInfo: entry.info,
    crawlerName: event.crawler.name,
    county: event.crawler.county, // MGTJ uses county logic
    needsStealthMode: event.crawler.needsStealthMode, // SPTJSI uses stealthMode
    resultId: entry.resultId,
    folderName: path,
    context,
  };

  if (entry.status === "retrieve")
    params.evidenceLink = `https://s3.console.aws.amazon.com/s3/object/${process.env.s3EvidencesBucket}?region=us-east-1&prefix=${path}`;

  if (proxy) {
    params.proxy = proxy.url;
    params.proxyAuthentication = proxy.authentication;
    params.host = proxy.host;
    params.port = proxy.port;
  }

  if (entry.result && entry.result.finished)
    params.numberOfResultsAlreadyFetched = entry.result.finished.length;

  if (entry.result && entry.result.remaining && entry.result.remaining.length) {
    params.currentResult = entry.result.finished;
    if (entry.result.remaining[0].requestNumber)
      params.requestNumber = entry.result.remaining[0].requestNumber;

    if (entry.result.remaining[0].requestDate)
      params.requestDate = entry.result.remaining[0].requestDate;

    if (entry.result.remaining[0].onlyDroped)
      params.onlyDroped = entry.result.remaining[0].onlyDroped;
  }

  if (event.source.captchaDetails)
    params.captchaDetails = event.source.captchaDetails;

  if (captcha) params.captchaResult = captcha.solution;

  return params;
};

const parseUnitaryBatchResponse = (
  batch,
  scraperResponse,
  unitaryBatchError,
  params
) => {
  Logger.info("Scraper response", { scraperResponse });
  Logger.info("Unitary batch error", { unitaryBatchError });
  if (unitaryBatchError) {
    batch[0].result = {
      finished: [],
      remaining: [],
      error: {
        name: unitaryBatchError.name,
        message: unitaryBatchError.message,
      },
    };
  } else {
    let finished = [];
    const remaining = [];
    const evidence = scraperResponse.result
      ? scraperResponse.result.evidenceLink
      : null;
    if (scraperResponse.result && scraperResponse.result.evidenceLink)
      delete scraperResponse.result.evidenceLink;

    if (params.currentResult) finished = params.currentResult;

    if (scraperResponse.result && scraperResponse.result.items)
      scraperResponse.result.items.map((item) => finished.push(item));

    if (scraperResponse.options && scraperResponse.options.needsMoreCrawl)
      remaining.push({
        message: "Mocked remaining item to keep crawling",
        needsMoreCrawl: scraperResponse.options.needsMoreCrawl,
        onlyDroped: scraperResponse.options.onlyDroped,
      });

    if (
      scraperResponse.result &&
      typeof scraperResponse.result.certificateGenerated === "boolean"
    )
      finished.push(scraperResponse.result);

    if (scraperResponse.certificateProcessed === false)
      remaining.push(scraperResponse.result);

    if (
      scraperResponse.result &&
      (scraperResponse.result.officialName ||
        typeof scraperResponse.result.cpfNotFound === "boolean")
    )
      finished.push(scraperResponse.result);

    if (scraperResponse.result && scraperResponse.result.status)
      finished.push(scraperResponse.result);

    if (scraperResponse.result && scraperResponse.result.finalInfos)
      finished.push(scraperResponse.result.finalInfos);

    if (scraperResponse.result && scraperResponse.result.notifyAsError)
      remaining.push(scraperResponse.result);

    Logger.info("Finished", { finished });

    batch[0].result = {
      finished,
      remaining,
      evidence,
    };
  }

  return batch;
};

export const scraper = async (event, context, crawlers) => {
  const {
    taskToken,
    captcha: captchaProps,
    proxy: proxyProps,
    source: { captchaDetails },
    crawler,
    batch,
  } = event;

  try {
    const { url: proxy, authentication: proxyAuthentication } =
      proxyProps || {};
    const { solution: captcha } = captchaProps || {};

    // eslint-disable-next-line prefer-const
    let [searchEntries, retrieveEntries, remainingEntries] = batch.reduce(
      (batchReduce, entry) => {
        let batchReduceIndex;

        let link;
        let signedLink;
        let path;
        switch (entry.status) {
          case "search":
            batchReduceIndex = 0;
            entry.result = { finished: [], remaining: [] };
            path = `${entry.resultId}/${entry.attemptId}.json`;
            link = `https://s3.console.aws.amazon.com/s3/object/${process.env.s3ResultsBucket}?region=us-east-1&prefix=${path}`;
            signedLink = `crawlers.${process.env.domain}/results/${jwt.sign(
              `${link}`,
              process.env.jwtKey
            )}`;
            entry.s3 = {
              path,
              signedLink,
            };
            break;
          case "retrieve":
            batchReduceIndex = 1;
            break;
          default:
            batchReduceIndex = 2;
            break;
        }
        batchReduce[batchReduceIndex].push(entry);

        return batchReduce;
      },
      [[], [], []]
    );

    retrieveEntries = await Promise.all(
      retrieveEntries.map(async (entry) => {
        entry.result = await readFromS3(
          entry.s3.path,
          process.env.s3ResultsBucket
        );
        return Promise.resolve(entry);
      })
    );

    retrieveEntries = retrieveEntries.sort(function ordeByRemaing(a, b) {
      if (a.result.remaining > b.result.remaining) {
        return 1;
      }
      if (a.result.remaining < b.result.remaining) {
        return -1;
      }
      return 0;
    });

    Logger.info("Batch", { batch });

    Logger.info("Initiating crawler", {
      state: crawler.state,
      institution: crawler.institution,
      type: crawler.type,
      proxy,
    });

    const params = event.unitaryBatch
      ? unitaryBatchParams(searchEntries, retrieveEntries, event, context)
      : {
          searchEntries,
          retrieveEntries,
          captchaDetails,
          proxy,
          captcha,
          crawlerName: event.crawler.name,
          county: event.crawler.county, // MGTJ uses county logic
          needsStealthMode: event.crawler.needsStealthMode, // SPTJSI uses stealthMode
          context,
          proxyAuthentication,
        };

    // Logger.info("params current result before crawler", { paramsCurrent: params.currentResult });

    let unitaryBatchError = null;
    if (
      !crawlers[crawler.state] ||
      !crawlers[crawler.state][crawler.institution]
    ) {
      const error = new Error("Invalid state or institution");
      if (!event.unitaryBatch) throw error;
      else unitaryBatchError = error;
    }
    const scraperResponse = await crawlers[crawler.state]
      [crawler.institution](params)
      .catch((error) => {
        if (!event.unitaryBatch) throw error;
        else unitaryBatchError = error;
      });
    Logger.info("Response received from Crawl!", { scraperResponse });

    const responseBatch = event.unitaryBatch
      ? parseUnitaryBatchResponse(
          batch,
          scraperResponse,
          unitaryBatchError,
          params
        )
      : scraperResponse;

    Logger.info("Response batch!", { responseBatch });

    const responseEntries = await Promise.all(
      responseBatch.map(async (entry) => {
        await saveOnS3(
          entry.result,
          entry.s3.path,
          process.env.s3ResultsBucket
        );
        delete entry.result;
        return Promise.resolve(entry);
      })
    );

    event.batch = [...responseEntries, ...remainingEntries];

    Logger.info("Batch ready to notify!", { batch: event.batch });

    await saveOnS3(
      event,
      `${event.executionId}.json`,
      process.env.s3ScraperSuccessBucket
    );

    Logger.info("Resolving crawling process!");
    return Promise.resolve(event);
  } catch (error) {
    const body = {
      error,
      cause: error.message,
      taskToken,
    };

    await saveOnS3(
      body,
      `${event.executionId}.json`,
      process.env.s3ScraperErrorBucket
    );

    Logger.error("Error happened during Crawl", {
      error,
      crawlerId: event.crawlerId,
      resultId: event.resultId,
    });
    return Promise.reject(error);
  }
};

export const getCurrentYear = () => {
  return DateHelper.format(
    DateHelper.now(),
    "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
    "yyyy"
  ).toString();
};

const isValidYear = (year) => {
  const currentYear = getCurrentYear();
  if (year?.length !== 4 || year > currentYear || year < 1901) return false;
  return true;
};

export const getProcessYearFromProcessNumber = (processNumber) => {
  if (!processNumber) return null;
  let creationYear = null;

  const splitedNumber = processNumber.split(".");

  // if to satisfy both commom paterns: YEAR.number.number.number || number.YEAR.number.number.number
  if (splitedNumber.length === 5 || splitedNumber.length === 4) {
    if (isValidYear(splitedNumber[1])) creationYear = splitedNumber[1];
    else if (isValidYear(splitedNumber[0])) creationYear = splitedNumber[0];
    else if (isValidYear(splitedNumber[2])) creationYear = splitedNumber[2];
  } else if (splitedNumber.length === 3 && isValidYear(splitedNumber[0]))
    creationYear = splitedNumber[0];
  else if (splitedNumber.length === 2 && isValidYear(splitedNumber[0]))
    creationYear = splitedNumber[0];

  return creationYear;
};

/**
 * @name getProcessYearFromProcessNumberV2
 * @description Helper function alternative to get process number,
    works for processes with "." and "-", and for those without these characters.
 * @param {String} processNumber
 * @returns processYear
*/
export const getProcessYearFromProcessNumberV2 = (processNumber) => {
  const processNumbersTemplates = [
    {
      template: /\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/, // Ex.: 0077024-52.2020.3.00.0000
      yearIndex: [11, 15],
    },
    {
      template: /\d{1}\.\d{2}\.\d{3}\.\d{6}[/.]\d{4}-\d{2}/, // Ex.: 1.32.000.000268/2022-04 || 1.32.000.000268.2022-04
      yearIndex: [16, 20],
    },
    {
      template: /\d{20}/, // Ex.: 50830896220164047100
      yearIndex: [9, 13],
    },
  ];

  const processYear = processNumbersTemplates.reduce((acc, cur) => {
    const { template, yearIndex } = cur;
    const [firstIndex, lastIndex] = yearIndex;
    if (processNumber.match(template))
      acc = processNumber.substring(firstIndex, lastIndex);
    return acc;
  }, null);

  return isValidYear(processYear) ? processYear : null;
};

export const getProcessYearFromDate = (date) => {
  const currentYear = DateHelper.format(
    DateHelper.now(),
    "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
    "yyyy"
  ).toString();
  const creationYear = DateHelper.format(date, "dd/MM/yyyy", "yyyy").toString();

  if (creationYear && (creationYear > currentYear || creationYear < 1901))
    return null;

  return creationYear;
};
