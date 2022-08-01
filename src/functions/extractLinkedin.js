/* eslint-disable no-console */
/* eslint-disable no-shadow */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// import { Contact } from "../models/contact";
import { Logger } from "../utils/helpers/logger";

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
  proxy,
  ignoreHTTPSErrors = null,
  needsSlowMo = false,
  specificArgs = null,
}) => {
  try {
    let { args } = chromium;
    console.log(2);
    if (proxy) {
      const formattedProxy = "--proxy-server=".concat(
        proxy.replace("http://", "")
      );
      Logger.info({ formattedProxy });
      args = args.concat(formattedProxy);
    }
    console.log(3);

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
    console.log(4);

    if (process.env.IS_LOCAL && process.env.stage !== "production") {
      params.executablePath = process.env.LOCAL_CHROMIUM;
      params.slowMo = 200;
    }

    if (needsSlowMo) params.slowMo = 200;
    console.log(5);

    const puppeteerExtra = addExtra(chromium.puppeteer);
    console.log(6);

    puppeteerExtra.use(StealthPlugin());
    console.log(7);

    const browser = await puppeteerExtra.launch(params);
    console.log(8);

    return Promise.resolve(browser);
  } catch (error) {
    return Promise.reject(error);
  }
};

const initializeStealthPage = async ({ proxy, needsStealthMode }) => {
  // const specificArgs = [
  //   "--start-maximized",
  //   "--window-size=720,480",
  //   "--ignore-certificate-errors",
  //   "--no-sandbox",
  //   "--disable-setuid-sandbox",
  //   "--disable-client-side-phishing-detection",
  //   "--disable-component-extensions-with-background-pages",
  //   "--disable-default-apps",
  //   "--disable-extensions",
  //   "--no-default-browser-check",
  //   "--no-first-run",
  //   "--allow-running-insecure-content",
  //   "--disable-background-timer-throttling",
  //   "--disable-renderer-backgrounding",
  //   "--disable-background-networking",
  // ];
  // https://github.com/GoogleChrome/chrome-launcher/blob/master/docs/chrome-flags-for-tools.md

  console.log(1);
  const browser = await launchBrowserStealth({
    proxy,
    needsSlowMo: needsStealthMode,
    // specificArgs,
  });

  console.log(8);

  const page = await browser.newPage();
  console.log(9);

  const userAgent =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36";

  await configPageToStealth(page, userAgent);
  console.log(10);

  return { page, browser };
};

export const main = async (event) => {
  let page;
  let browser;
  const allEmployeesInfos = [];
  let index = 0;

  try {
    const { section } =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    Logger.info("Starting Crawler...");

    ({ browser, page } = await initializeStealthPage({}));
    console.log(11);
    await page.goto("https://www.linkedin.com/");
    console.log(12);

    await page.waitForSelector("[href*='signin']");
    console.log(13);

    await page.click("[href*='signin']");
    console.log(14);

    await page.waitForSelector("input#username");
    await page.type("input#username", "jvkikuchi23@gmail.com"); // "extracthackathon@gmail.com");
    console.log(15);

    await page.waitForSelector("input#password");
    await page.type("input#password", "Kikuchi23@"); // "@BGC2022");
    console.log(16);

    await page.click("[data-litms-control-urn='login-submit']");
    console.log(17);

    const { skipMobile } = await Promise.race([
      page
        .waitForSelector("button[data-ember-action-456='456']")
        .then(() => ({ skipMobile: true })),
      page
        .waitForSelector(
          "input[class='search-global-typeahead__input always-show-placeholder']"
        )
        .then(() => ({})),
    ]);
    console.log(18);

    if (skipMobile) {
      await page.click("button[data-ember-action-456='456']");
    }

    await page.waitForSelector(
      "input[class='search-global-typeahead__input always-show-placeholder']"
    );

    await page.type(
      "input[class='search-global-typeahead__input always-show-placeholder']",
      section
    );

    await page.keyboard.press("Enter");

    Logger.info("Filtering by companies...");

    const { needReload } = await Promise.race([
      await page
        .waitForSelector(
          "button[class*='artdeco-pill artdeco-pill--slate artdeco-pill--choice artdeco-pill--2 search-reusables__filter-pill-button']"
        )
        .then(() => ({})),
      await page.waitForTimeout(5000).then(() => ({ needReload: true })),
    ]);
    console.log(19);

    if (needReload) {
      await page.reload();

      await page.waitForSelector(
        "button[class*='artdeco-pill artdeco-pill--slate artdeco-pill--choice artdeco-pill--2 search-reusables__filter-pill-button']"
      );
    }

    console.log(20);

    await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll(
          "button[class*='artdeco-pill artdeco-pill--slate artdeco-pill--choice artdeco-pill--2 search-reusables__filter-pill-button']"
        )
      );

      buttons.forEach((button) => {
        if (button.textContent.includes("Empresas")) button.click();
      });
    });

    Logger.info("Filtering by location");

    await page.waitForSelector("button[aria-label*='Filtro Localidades.']");
    await page.click("button[aria-label*='Filtro Localidades.']");

    await page.waitForSelector("input[placeholder='Adicionar localidade']");
    await page.type("input[placeholder='Adicionar localidade']", "Brasil");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    // await page.waitForSelector("input[value='106057199']");
    // await page.click("input[value='106057199']");
    await page.waitForSelector(
      "button[data-control-name='filter_show_results']"
    );

    await page.click("button[data-control-name='filter_show_results']");

    Logger.info("Listing companies...");

    await page.waitForSelector(
      "ul[class='reusable-search__entity-result-list list-style-none']"
    );

    const companiesUrl = page.url();
    // const scrapedCompanies = 0;

    const companiesLenght = new Array(
      (await page.$$("li.reusable-search__result-container")).length
    );

    for (const [i] of companiesLenght.entries()) {
      if (i > 0) {
        Logger.info("Going to companies url...");
        await page.goto(companiesUrl);
      }

      const companiesBox = await page.$$(
        "li.reusable-search__result-container"
      );

      const companyBox = companiesBox[i];

      if (!companyBox) continue;

      Logger.info("Entering company profile...");

      await page.evaluate(
        (company) => company.querySelector("a[href]").click(),
        companyBox
      );

      await page.waitForNavigation({ waitUntil: "networkidle2" });

      Logger.info("Getting company name...");

      await page.waitForSelector(
        "h1.ember-view.t-24.t-black.t-bold.full-width"
      );

      const companyNameSelector = await page.$(
        "h1.ember-view.t-24.t-black.t-bold.full-width"
      );

      const companyName = await page.evaluate(
        (el) => el.textContent.toString().replace(/\n/g, "").trim(),
        companyNameSelector
      );

      Logger.info("Entering on employees page...");

      await page.waitForSelector(
        "a[href*='origin=COMPANY_PAGE_CANNED_SEARCH']",
        {
          visible: true,
        }
      );

      await page.click("a[href*='origin=COMPANY_PAGE_CANNED_SEARCH']");

      Logger.info("Getting all filters button...");

      await page.waitForSelector(
        "button[aria-label*='Exibir todos os filtros.']"
      );

      await page.click("button[aria-label*='Exibir todos os filtros.']");

      await page.waitForSelector(
        "div[aria-labelledby='reusable-search-advanced-filters-right-panel']",
        {
          visible: true,
        }
      );

      Logger.info("Filtering employee by sector");

      await page.waitForSelector(
        "li.search-reusables__filter-value-item.mt4 button"
      );

      await page.$$eval(
        "li.search-reusables__filter-value-item.mt4 button",
        (buttons) => {
          buttons.forEach((button) => {
            if (button.querySelector("span").textContent.includes("setor")) {
              button.click();
            }
          });
        }
      );

      await page.waitForSelector("input[aria-label='Adicionar setor']");
      await page.type(
        "input[aria-label='Adicionar setor']",
        "Recursos Humanos"
      );
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await page.click("button[aria-label*='Aplicar filtros atuais']");

      Logger.info("Listing Sector employees...");

      const { areThereEmployees } = await Promise.race([
        page.waitForSelector("div[data-chameleon-result-urn]").then(() => ({
          areThereEmployees: true,
        })),
        page.waitForTimeout(5000).then(() => ({ areThereEmployees: false })),
      ]);

      if (!areThereEmployees) continue;

      const hrEmployeesLength = new Array(
        (await page.$$("div[data-chameleon-result-urn]")).length
      );

      const employeesPage = page.url();

      for (const [indexEmployee] of hrEmployeesLength.entries()) {
        index += 1;

        if (indexEmployee > 0) {
          Logger.info("Going to employee url...");
          await page.goto(employeesPage);
          await page.waitForSelector("li.reusable-search__result-container");
        }

        const hrEmployees = await page.$$(
          "li.reusable-search__result-container"
        );

        const hrEmployee = hrEmployees[indexEmployee];

        if (!hrEmployees[indexEmployee]) continue;

        Logger.info("Entering employee profile...");

        const { employeeName, jobRole } = await page.evaluate((employee) => {
          const name = employee
            .querySelector("a span[aria-hidden='true']")
            ?.textContent.toString()
            .replace(/\n/g, "")
            .trim();

          const role = employee
            .querySelector(
              "div.entity-result__primary-subtitle.t-14.t-black.t-normal"
            )
            ?.textContent.toString()
            .replace(/\n/g, "")
            .trim();

          employee.querySelector("a[href]").click();

          return {
            employeeName: name,
            jobRole: role,
          };
        }, hrEmployee);

        const { isProfileOpen } = await Promise.race([
          page
            .waitForSelector(
              "button.fr.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view"
            )
            .then(() => ({ isProfileOpen: false })),
          page
            .waitForSelector("a[href*='contact-info']")
            .then(() => ({ isProfileOpen: true })),
        ]);

        if (!isProfileOpen) {
          await page.click(
            "button.fr.artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view"
          );
          continue;
        }

        allEmployeesInfos[index] = {
          ...allEmployeesInfos[index],
          companyName,
          employeeName,
          jobRole,
        };

        await page.click("a[href*='contact-info']");

        await page.waitForSelector("div[aria-labelledby='pv-contact-info']", {
          visible: true,
        });

        const infoPanel = await page.$(
          "div[aria-labelledby='pv-contact-info']"
        );

        const infoSections = await infoPanel.$$("section");

        for (const infoSection of infoSections) {
          const h3 = await infoSection.$("h3");
          if (!h3) continue;

          const title = (
            await page.evaluate((h3elem) => h3elem.textContent, h3)
          ).toString();

          let info;

          info = await infoSection.$("a[href]");

          if (!info) {
            info = await infoSection.$("span");
          }

          const textInfo = (
            await page.evaluate((h3elem) => h3elem.textContent, info)
          )
            .toString()
            .replace(/\n/g, "")
            .trim();

          if (title.includes("Perfil")) {
            allEmployeesInfos[index].linkedin = textInfo;
          }

          if (title.includes("Telefone")) {
            allEmployeesInfos[index].telefone = textInfo;
          }

          if (title.includes("E-mail")) {
            allEmployeesInfos[index].email = textInfo;
          }
        }

        Logger.info("Contact extracted", allEmployeesInfos[index]);

        const contact = new Contact({
          ...allEmployeesInfos[index],
        });

        await contact.save();
      }
    }

    Logger.info({ finished: allEmployeesInfos });
    return;
  } catch (error) {
    if (browser) browser.close();
    Logger.error(error);
    throw error;
  }
};
