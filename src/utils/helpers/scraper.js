/* eslint-disable no-return-await */
/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-shadow */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable no-restricted-syntax */
/* eslint-disable class-methods-use-this */
/* eslint-disable array-callback-return */
/* eslint-disable no-use-before-define */
/* eslint-disable no-multi-assign */
/* eslint-disable no-bitwise */
import AWS from "aws-sdk";
import { format, utcToZonedTime } from "date-fns-tz";
import fs from "fs";
import path from "path";
import chromium from "chrome-aws-lambda";
import pdf from "pdf-parse";
import jwt from "jsonwebtoken";
import imagemin from "imagemin";
import imageminPngquant from "imagemin-pngquant";
import pdfTableExtractor from "@florpor/pdf-table-extractor";
import { parse, isValid as isValidDate } from "date-fns";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { addExtra } from "puppeteer-extra";
import axios from "axios";
import { DateHelper } from "./shared";
import { errors } from "../errors";
import { Logger } from "./logger";
import { getProcessYearFromProcessNumberV2 } from "./crawl";

const installMouseHelper = async (page) => {
  await page.evaluateOnNewDocument(() => {
    // Install mouse helper only for top-level frame.
    if (window !== window.parent) return;

    window.addEventListener(
      "DOMContentLoaded",
      () => {
        const box = document.createElement("puppeteer-mouse-pointer");
        const styleElement = document.createElement("style");

        styleElement.innerHTML = `
        puppeteer-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 0;
          z-index: 10000;
          left: 0;
          width: 20px;
          height: 20px;
          background: rgba(0,0,0,.4);
          border: 1px solid white;
          border-radius: 10px;
          margin: -10px 0 0 -10px;
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
        }
        puppeteer-mouse-pointer.button-1 {
          transition: none;
          background: rgba(0,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-2 {
          transition: none;
          border-color: rgba(0,0,255,0.9);
        }
        puppeteer-mouse-pointer.button-3 {
          transition: none;
          border-radius: 4px;
        }
        puppeteer-mouse-pointer.button-4 {
          transition: none;
          border-color: rgba(255,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-5 {
          transition: none;
          border-color: rgba(0,255,0,0.9);
        }
      `;

        document.head.appendChild(styleElement);
        document.body.appendChild(box);

        document.addEventListener(
          "mousemove",
          (event) => {
            box.style.left = `${event.pageX}px`;
            box.style.top = `${event.pageY}px`;
            updateButtons(event.buttons);
          },
          true
        );

        document.addEventListener(
          "mousedown",
          (event) => {
            updateButtons(event.buttons);
            box.classList.add(`button-${event.which}`);
          },
          true
        );

        document.addEventListener(
          "mouseup",
          (event) => {
            updateButtons(event.buttons);
            box.classList.remove(`button-${event.which}`);
          },
          true
        );

        function updateButtons(buttons) {
          for (let i = 0; i < 5; i += 1)
            box.classList.toggle(`button-${i}`, buttons & (1 << i));
        }
      },
      false
    );
  });
};

const s3 = new AWS.S3();

const args = [
  "--disable-accelerated-2d-canvas",
  "--disable-background-networking",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--memory-pressure-off",
  ...chromium.args,
];

const setProxyIfExists = (proxy) => {
  if (proxy) {
    const formattedProxy = "--proxy-server=".concat(
      proxy.replace("http://", "")
    );
    Logger.info("Proxy formated: ", { formattedProxy });
    args.push(formattedProxy);
  }

  return args;
};

const sleep = (ms) => {
  return new Promise((resolve) => {
    return setTimeout(resolve, ms);
  });
};

const screenshot = async (page, pageWidth, pageHeight, omitBg) => {
  try {
    const fullHeight = pageHeight < 5000;
    // if page is too tall, set the viewport to take a max height screenshot (5000)
    if (!fullHeight) {
      await page.setViewport({
        width: 800,
        height: 5000,
      });
    }

    const sourceData = await page
      .screenshot({
        omitBackground: omitBg,
        encoding: "base64",
        fullPage: fullHeight,
      })
      .catch((error) => {
        throw new errors.GetEvidenceError(
          `Failed to take screenshot. ${error}. Warning: excessively large <width>x<height> page values may cause errors. Default viewport: 800x600. Used viewport: ${pageWidth}x${pageHeight}`
        );
      });
    const saoPauloCurrentDate = format(
      utcToZonedTime(new Date(), "America/Sao_Paulo"),
      "dd/MM/yyyy 'às' HH:mm:ss"
    );
    const pageWithDate = await page.browser().newPage();
    await pageWithDate.setContent(
      `<html style:"margin:0;padding:0;"><h3>Captura de tela tirada em: ${saoPauloCurrentDate}</h3><img style:"width:100%;height:auto;" src="data:image/png;base64, ${sourceData}" alt="Não foi possível mostrar a captura de tela"/></html>`
    );
    const data = await pageWithDate
      .screenshot({
        omitBackground: omitBg,
        fullPage: true,
      })
      .catch((error) => {
        throw new errors.GetEvidenceError(
          `Failed to take screenshot. ${error}. Warning: excessively large <width>x<height> page values may cause errors. Default viewport: 800x600. Used viewport: ${pageWidth}x${pageHeight}`
        );
      });
    await pageWithDate.close();
    // seting view port back to default
    if (!fullHeight) {
      await page.setViewport({
        width: 800,
        height: 600,
      });
    }

    const compressedData = await imagemin.buffer(data, {
      plugins: [imageminPngquant()],
    });

    return Promise.resolve(compressedData);
  } catch (error) {
    return Promise.reject(error);
  }
};

const saveFileOnBucket = async (data, path) => {
  const params = {
    ACL: "public-read",
    Bucket: process.env.s3EvidencesBucket,
    Key: path,
    Body: data,
  };

  const response = await s3.putObject(params).promise();

  return response;
};

export const setPDFDownloadBehavior = async (page) => {
  try {
    const p = `/tmp/puppeteer/${DateHelper.format(
      DateHelper.now(),
      "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
      "yyyyMMdd-HHmmSSS"
    )}/`;
    const basePath = process.env.IS_LOCAL ? path.resolve("../../") : "/";
    const uniqueFolder = path.join(basePath, p);

    if (!fs.existsSync(uniqueFolder)) {
      let testPath = basePath;
      const pathParts = p.split("/");

      for (const part of pathParts) {
        testPath = path.join(testPath, part);
        if (!fs.existsSync(testPath)) {
          fs.mkdirSync(testPath);
        }
      }
    }
    await page._client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: uniqueFolder,
    });

    return Promise.resolve(uniqueFolder);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const renameFile = async ({ path, oldFileName, newFileName }) => {
  let tries = 0;
  while (
    (!fs.existsSync(path) ||
      (fs.existsSync(path) && fs.readdirSync(path).length === 0) ||
      (fs.existsSync(path) &&
        fs.readdirSync(path)[0].endsWith(".crdownload"))) &&
    tries < 10
  ) {
    Logger.info(fs.readdirSync(path));
    await sleep(1000);
    tries += 1;
  }

  if (tries >= 10)
    throw new errors.MaxRequestAttemptsError(
      `Couldn't find path or file inside: ${path}`
    );

  const oldPath = `${path}${oldFileName}`;
  const newPath = `${path}${newFileName}`;
  Logger.info({ oldPath, newPath });

  fs.rename(oldPath, newPath, function handleError(err) {
    if (err) Logger.info(`ERROR: ${err}`);
  });
};

export const waitForPDFToDowload = async (downloadPath) => {
  try {
    let tries = 0;
    while (
      !fs.existsSync(downloadPath) ||
      (fs.readdirSync(downloadPath).length === 0 && tries < 10)
    ) {
      await sleep(1000);
      tries += 1;
    }

    if (tries >= 10) throw new errors.PDFDownloadError();

    return Promise.resolve("PDF DOWNLOADED");
  } catch (error) {
    return Promise.reject(error);
  }
};

export const debugBehaviour = async (page) => {
  try {
    await installMouseHelper(page);
    return Promise.resolve(true);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const verifyIfSourceIsUnavailable = async ({
  page,
  selector,
  offlineMsg,
}) => {
  try {
    Logger.info("Verifying if source is Unavailable");

    const message = await page.evaluate((sel) => {
      if (document.querySelector(sel)) {
        return document.querySelector(sel).innerText;
      }
      return "Source Ok!";
    }, selector);
    if (message.includes(offlineMsg))
      throw new errors.SourceUnavailableError(
        message.replace(/(\r\n|\n|\r)/gm, " ")
      );

    Logger.info("Message", { message });
    return Promise.resolve(message);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const configPageToStealth = async (page, userAgent) => {
  try {
    // checkout https://antoinevastel.com/bot%20detection/2018/01/17/detect-chrome-headless-v2.html
    // Pass the User-Agent Test.
    if (userAgent) await page.setUserAgent(userAgent);

    // Pass the Webdriver Test.
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    // Pass the Chrome Test.
    await page.evaluateOnNewDocument(() => {
      // We can mock this in as much depth as we need for the test.
      window.navigator.chrome = {
        runtime: {},
        // etc.
      };
    });

    // Pass the Permissions Test.
    await page.evaluateOnNewDocument(() => {
      const originalQuery = window.navigator.permissions.query;
      // eslint-disable-next-line no-return-assign
      return (window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters));
    });

    // Pass the Plugins Length Test.
    await page.evaluateOnNewDocument(() => {
      // Overwrite the `plugins` property to use a custom getter.
      Object.defineProperty(navigator, "plugins", {
        // This just needs to have `length > 0` for the current test,
        // but we could mock the plugins too if necessary.
        get: () => [1, 2, 3, 4, 5],
      });
    });

    // Pass the Languages Test.
    await page.evaluateOnNewDocument(() => {
      // Overwrite the `plugins` property to use a custom getter.
      Object.defineProperty(navigator, "languages", {
        get: () => ["pt-BR", "pt"],
      });
    });

    // Pass the chrome test
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "appCodeName", {
        get: () => "Mozilla",
      });
    });
    // Pass the chrome test
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "appName", {
        get: () => "Netscape",
      });
    });

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

export const launchBrowserStealth = async ({
  proxy = null,
  ignoreHTTPSErrors = null,
  needsSlowMo = false,
  specificArgs = null,
}) => {
  try {
    let { args } = chromium;

    if (proxy) {
      const formattedProxy = "--proxy-server=".concat(
        proxy.replace("http://", "")
      );
      Logger.info({ formattedProxy });
      args = args.concat(formattedProxy);
    }

    if (specificArgs) args = args.concat(specificArgs);

    const params = {
      args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless:
        process.env.IS_LOCAL && process.env.stage === "production"
          ? true
          : chromium.headless,
      ignoreHTTPSErrors: !!ignoreHTTPSErrors,
    };

    if (process.env.IS_LOCAL && process.env.stage !== "production") {
      params.executablePath = process.env.LOCAL_CHROMIUM;
      params.slowMo = 200;
    }

    if (needsSlowMo) params.slowMo = 200;

    const puppeteerExtra = addExtra(chromium.puppeteer);
    puppeteerExtra.use(StealthPlugin());

    const browser = await puppeteerExtra.launch(params);

    return Promise.resolve(browser);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const launchBrowser = async (proxy, ignoreHTTPSErrors = null) => {
  try {
    const params = {
      args: setProxyIfExists(proxy),
      executablePath: await chromium.executablePath,
      headless:
        process.env.IS_LOCAL && process.env.stage === "production"
          ? true
          : chromium.headless,
      ignoreHTTPSErrors: !!ignoreHTTPSErrors,
    };

    if (process.env.IS_LOCAL && process.env.stage !== "production")
      params.slowMo = 200;

    const browser = await chromium.puppeteer.launch(params).catch((error) => {
      throw new errors.CrawlWithChromeError(
        `Chromium didn't started. Error: ${error}`
      );
    });

    return Promise.resolve(browser);
  } catch (error) {
    return Promise.reject(error);
  }
};

const checkDocName = async (path, docName) => {
  try {
    const objects = await s3
      .listObjectsV2({ Bucket: process.env.s3EvidencesBucket, Prefix: path })
      .promise();

    const files = objects.Contents.map((object) => {
      const fileName = object.Key.split(path)[1].replace("/", "");
      return fileName.replace(".png", "");
    });

    let numberFile = 2;
    let needsVerify = true;

    while (needsVerify) {
      needsVerify = false;
      files.map((file) => {
        if (file === docName) {
          [docName] = docName.split("_");
          docName += `_0${numberFile}`;
          numberFile += 1;
          needsVerify = true;
        }
      });
    }
    return Promise.resolve(docName);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const getEvidenceLink = async (path) => {
  try {
    path = path.replace(".json", "");

    let evidenceLink = `https://s3.console.aws.amazon.com/s3/buckets/${process.env.s3EvidencesBucket}/${path}/?region=us-east-1`;

    if (
      process.env.serviceName === "bgc-crawlers" ||
      process.env.serviceName === "bgc-scrapers"
    ) {
      // eslint-disable-next-line prefer-destructuring
      const jwtKey = process.env.jwtKey;
      const encryptedEvidenceLink = jwt.sign(evidenceLink, jwtKey);
      evidenceLink =
        process.env.stage === "production"
          ? `crawlers.bgcbrasil.com.br/evidences/${encryptedEvidenceLink}`
          : `crawlers.${process.env.stage}-bgcbrasil.cf/evidences/${encryptedEvidenceLink}`;
    }

    return Promise.resolve(evidenceLink);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const getEvidence = async (
  page,
  path,
  docName = null,
  isProcessNumber = false,
  callback,
  omitBg = false
) => {
  try {
    let processNumber;
    path = path.replace(".json", "");

    if (page.constructor.name !== "Page")
      throw new errors.GetEvidenceError(
        `The page attribute must be a puppeteer page and it is a ${typeof page}.`
      );

    if (callback && typeof callback !== "function")
      throw new errors.GetEvidenceError(
        `The callback attribute must be a function and it is a ${typeof callback}.`
      );

    const [pageWidth, pageHeight] = await page.evaluate(() => {
      return [document.body.scrollWidth, document.body.scrollHeight];
    });

    const data = await screenshot(page, pageWidth, pageHeight, omitBg);

    // nothing was passed by parameter
    if (!docName)
      docName = DateHelper.format(
        DateHelper.now(),
        "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
        "HH-mm-SSS"
      );

    if (isProcessNumber) {
      if (/[a-zA-Z]/.test(docName)) {
        processNumber = docName.replace(/[A-Za-z_]/g, "").replace(/-$/, "");
        docName = `${docName.replace(/[0-9._-]/g, "")}`;
      } else {
        processNumber = docName;
        docName = "process";
      }

      path = `${path}/${processNumber}`;
    }

    docName = await checkDocName(path, docName);

    await saveFileOnBucket(data, `${path}/${docName}.png`).catch((error) => {
      throw new errors.SaveFileOnBucketError(
        `Failed to save file on bucket. Error: ${error}`
      );
    });

    if (callback) await callback();

    const evidenceLink = await getEvidenceLink(path);

    return Promise.resolve(evidenceLink);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const savePDFEvidence = async (pdf, path, fileName = null) => {
  try {
    if (!fileName)
      fileName = DateHelper.format(
        DateHelper.now(),
        "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
        "HH-mm-SSS"
      );
    const folderName = `${path}/${fileName}.pdf`;

    await saveFileOnBucket(pdf, folderName).catch((error) => {
      throw new errors.SaveFileOnBucketError(
        `Failed to save file on bucket. Error: ${error}`
      );
    });

    const evidenceLink = await getEvidenceLink(path);

    return Promise.resolve(evidenceLink);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const getPDFEvidenceLink = async ({
  localFolder,
  bucketFolder,
  fileName = null,
  returnPdfText = false,
  returnPdfTable = false,
}) => {
  try {
    if (!bucketFolder) bucketFolder = localFolder.split("/").pop();

    let tries = 0;
    while (
      (!fs.existsSync(localFolder) ||
        (fs.existsSync(localFolder) &&
          fs.readdirSync(localFolder).length === 0) ||
        (fs.existsSync(localFolder) &&
          !fs.readdirSync(localFolder)[0].endsWith(".pdf"))) &&
      tries < 10
    ) {
      await sleep(1000);
      tries += 1;
    }

    if (tries >= 10) throw new errors.PDFDownloadError();

    const file = fs.readdirSync(localFolder)[0];
    const pdf = fs.readFileSync(`${localFolder}/${file}`);

    if (!fileName)
      fileName = DateHelper.format(
        DateHelper.now(),
        "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
        "HH-mm-SSS"
      );
    const evidenceLink = await savePDFEvidence(pdf, bucketFolder, fileName);
    if (returnPdfText || returnPdfTable) {
      return Promise.resolve({
        evidenceLink,
        pdfText: returnPdfText ? await readPDF(pdf) : undefined,
        pdfTable: returnPdfTable
          ? await extractPdfTable(`${localFolder}/${file}`)
          : undefined,
      });
    }

    return Promise.resolve(evidenceLink);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const clickWithMouse = async (page, selector) => {
  try {
    const elem = await page.$(selector);
    const coordinates = await page.evaluate((element) => {
      const { top, left, bottom, right } = element.getBoundingClientRect();
      return { top, left, bottom, right };
    }, elem);

    const width = coordinates.right - coordinates.left;
    const height = coordinates.bottom - coordinates.top;

    await page.mouse.click(
      coordinates.left + width / 2,
      coordinates.top + height / 2
    );

    return Promise.resolve(true);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const removeAccents = (string) => {
  return string
    .toUpperCase()
    .trim()
    .normalize("NFD")
    .replace(/\u0142/g, "l")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/'/g, " ");
};

export const retrieveUsedIP = async (browser) => {
  try {
    Logger.info("INIT RETRIEVE USED IP");
    const ipPage = await browser.newPage();

    Logger.info("GOTO https://api.ipify.org/?format=json");
    await ipPage.goto("https://api.ipify.org/?format=json", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const ipSelector = await ipPage.$("pre");
    Logger.info(ipSelector);

    let usedIp = await ipPage.evaluate(
      (ipSelector) => ipSelector.textContent,
      ipSelector
    );
    Logger.info(usedIp);

    usedIp = JSON.parse(usedIp).ip;

    return Promise.resolve(usedIp);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const fillTextInputs = async (page, selectorsAndInfos) => {
  try {
    selectorsAndInfos.map(
      async (selectorAndInfo) =>
        await page.evaluate((item) => {
          document.querySelector(item.selector).value = item.info;
        }, selectorAndInfo)
    );

    return Promise.resolve("Form filled");
  } catch (error) {
    return Promise.reject(error);
  }
};

export const downloadPDF = async (options) => {
  try {
    const pdfFile = await axios(options);
    return Promise.resolve(pdfFile.data);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const readPDF = async (file) => {
  try {
    const pdfText = await pdf(file);
    return Promise.resolve(pdfText.text);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const extractPdfTable = async (file) => {
  try {
    const pdfTable = await pdfTableExtractor(file).then((res) => {
      return res.pageTables;
    });
    return Promise.resolve(pdfTable);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const verifyCpf = (cpf) => {
  try {
    if (!cpf) throw new Error();
    if (cpf.length !== 11 || /^(.)\1+$/.test(cpf)) throw new Error();

    let sum = 0;
    let rest;

    for (let i = 1; i <= 9; i += 1) {
      sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }
    rest = (sum * 10) % 11;

    if (rest === 10 || sum === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10), 10)) throw new Error();
    sum = 0;

    for (let i = 1; i <= 10; i += 1) {
      sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }
    rest = (sum * 10) % 11;

    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(10, 11), 10)) throw new Error();
  } catch (err) {
    throw new errors.InputError("cpf is invalid.");
  }
};

export const convertCPF = (cpf) => {
  const value = cpf.replace(
    /^([\d]{3})([\d]{3})([\d]{3})([\d]{2})$/,
    "$1.$2.$3-$4"
  );
  return value;
};

/**
 * @name validateDate
 * @description Recieves a date string and validate if it's a valid date with given format
 * @param {string} value Value that will be validated
 * @param {string} format Format wich value will be matched
 */
export function validateDate(value, format) {
  const date = parse(value, format, new Date());
  return isValidDate(date);
}

/**
 * @name makeUnavailableProcess
 * @description Helper function to make unavaible process item
 * @param {Any} page - Crawler's page
 * @param {String} folderName - S3 folder name
 * @param {String} processNumber - The process number
 * @param {String} link - The process page link
 */
export const makeUnavailableProcess = async ({
  page,
  folderName,
  processNumber,
  link,
}) => {
  const evidence = await getEvidence(
    page,
    folderName,
    `${processNumber}-unavailableProcess`,
    true
  ).catch((error) => {
    throw new errors.GetEvidenceError(error);
  });

  const item = {
    link,
    processNumber,
    processParts: [
      {
        type: "nao consta",
        name: "nao consta",
      },
    ],
    lastMovementDate: null,
    type: "Erro ao recuperar os dados da consulta",
    processYear: getProcessYearFromProcessNumberV2(processNumber),
    trialEvidence: evidence,
  };

  return { item, evidence };
};

/**
 * @name filterOnlyOfficialName
 * @description Helper function to filter an process array only by the literal official name and remove the lookalike ones.
 * @param {Array<Object>} processes - Array with the processess (objects).
 * @param {String} officialName - The literal name to use as the filter.
 */
export const filterOnlyOfficialName = ({ processes, officialName }) => {
  processes = processes.reduce((processList, process) => {
    const names = Array.from(
      process.processParts.map((part) => part.name.toUpperCase())
    );
    if (
      names.includes(officialName.toUpperCase()) ||
      names.includes("nao consta")
    ) {
      processList.push(process);
      return processList;
    }
    return processList;
  }, []);
  return processes;
};

/**
 * @name getRandomIntInclusive
 * @description Helper function to get a random number between passed range.
 * @param {Number} min - Menor numero possível no range.
 * @param {Number} max - Maior numero possível no range.
 */
export const getRandomIntInclusive = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
