/* eslint-disable no-await-in-loop */
/* eslint-disable no-await-in-loop */
import axios from "axios";
import { errors } from "../errors";
import { Logger } from "./logger";

const getImageContent = async (page, url) => {
  try {
    const content = await page._client.send("Page.getResourceContent", {
      frameId: String(page.mainFrame()._id),
      url,
    });

    Logger.info("Content", { content });

    return Promise.resolve(content);
  } catch (error) {
    Logger.error("Error in captcha solving", { error });
    return Promise.reject(error);
  }
};

const getImageBase64 = async (page, selector) => {
  try {
    let base64 = "";
    page.on("console", (consoleObj) => {
      if (consoleObj.text().startsWith("data:image/png;base64")) {
        base64 = consoleObj.text().substr(22);
      }
    });
    await page
      // eslint-disable-next-line no-shadow
      .evaluate((selector) => {
        const element = document.querySelector(selector);
        const blobUrl = element.getAttribute("src");
        if (!blobUrl) throw new Error("Blob url was empty!");
        const canvas = document.createElement("canvas");
        canvas.setAttribute("width", 160);
        canvas.setAttribute("height", 50);
        const img = new Image();
        img.src = blobUrl;
        img.onload = function () {
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, 160, 50);
          const dataURL = canvas.toDataURL("image/png");
          console.log(dataURL);
        };
      }, selector)
      .catch((error) => {
        throw new errors.DrawCaptchaBase64ImageError(error);
      });
    let count = 0;
    while (!base64 && count < 5) {
      await page.waitFor(1000);
      count += 1;
    }
    page.on("console", () => {});
    if (!base64) throw new errors.CaptchaError("Not loaded captcha image.");

    page.removeAllListeners("console");
    return Promise.resolve(base64);
  } catch (error) {
    return Promise.reject(error);
  }
};

const getImageResource = async (page, imageType) => {
  try {
    const imageTypes = [
      "captcha.svl",
      "imagemCaptcha.do",
      "CaptchaServlet",
      "GerarCaptcha",
      "captcha.asp",
      "captcha?",
      "SimpleCaptcha.action",
      "Captcha.jpg",
      "ImageCaptcha.aspx",
      "dynamiccontent.properties.xhtml",
      "gdf.php",
    ];

    const tree = await page._client.send("Page.getResourceTree");
    let resource;

    if (imageType)
      resource = tree.frameTree.resources.find((treeResource) =>
        treeResource.url.includes(imageType)
      );
    else
      resource = tree.frameTree.resources.find((treeResource) =>
        imageTypes.find((type) => treeResource.url.includes(type))
      );

    Logger.info("Resource", { resource });

    return Promise.resolve(resource);
  } catch (error) {
    return Promise.reject(error);
  }
};

const imgTypeToBase64 = async (page, imageType) => {
  try {
    Logger.info("Image type to base64");
    let base64 = null;
    let errorsCount = 0;
    const timeout = setTimeout(() => {
      throw new errors.GetBase64ImageError("Timeout waiting for blob url.");
    }, 20000);

    while (!base64 && errorsCount < 10) {
      Logger.info("Base64", { base64 });
      const resource = await getImageResource(page, imageType);
      const imageContent = await getImageContent(page, resource.url);
      clearTimeout(timeout);
      base64 = imageContent.content ? imageContent.content : imageContent;
      base64 = typeof base64 !== "object" ? base64 : null;

      if (!base64) errorsCount += 1;
    }

    if (!base64) throw new Error("Base64 could not be retrieved.");

    return Promise.resolve(base64);
  } catch (error) {
    Logger.error(error);
    return Promise.reject(error);
  }
};

const selectorToBase64 = async (page, selector) => {
  try {
    Logger.info("Selector to base64");
    let base64 = "";
    const timeout = setTimeout(() => {
      throw new errors.GetBase64ImageError("Timeout waiting for blob url.");
    }, 20000);

    while (!base64) {
      await getImageBase64(page, selector)
        .then((result) => {
          Logger.info("Base64 of image captcha was solved!");
          clearTimeout(timeout);
          base64 = result;
        })
        .catch((error) => {
          Logger.warning("Trying to get blob url again.", { error });
        });
    }

    return Promise.resolve(base64);
  } catch (error) {
    Logger.error(error);
    return Promise.reject(error);
  }
};

export const toBase64 = async ({ page, selector, imageType }) => {
  try {
    const base64Image = imageType
      ? await imgTypeToBase64(page, imageType)
      : await selectorToBase64(page, selector);
    return Promise.resolve(base64Image);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const exterminatorImageCaptchaResolver = async ({
  page,
  selector,
  imageType,
  base64,
  source,
}) => {
  // eslint-disable-next-line no-param-reassign
  base64 = base64 || (await toBase64({ page, selector, imageType }));
  const {
    data: { prediction: captchaResult },
  } = await axios({
    method: "post",
    url:
      process.env.stage === "production"
        ? `https://captcha-exterminator.bgcbrasil.com.br/sources/${source}/predictions`
        : `https://captcha-exterminator.${process.env.stage}-bgcbrasil.cf/sources/${source}/predictions`,
    data: { base64 },
  }).catch((error) => {
    throw new Error(error.response.data);
  });
  return Promise.resolve(captchaResult);
};

export const imageCaptchaResolver = async ({
  page,
  selector,
  imageType,
  base64,
  captchaDetails,
  proxy,
  crawlerName,
}) => {
  try {
    Logger.info("Generating base64...");
    Logger.info("Image type", { imageType });

    const base64Image =
      base64 || (await toBase64({ page, selector, imageType }));

    const data = {
      base64Image,
      crawlerName,
      captchaDetails,
      proxy,
    };

    Logger.info("Requesting image captcha...", { data });

    const response = await axios({
      method: "post",
      url: `https://captcha.${process.env.domain}/image`,
      data,
      headers: {
        Authorization: process.env.systemToken,
      },
    });

    Logger.info(response.data);
    return Promise.resolve({
      attemptId: response.data.attemptId,
      captchaResult: response.data.captchaResponse,
    });
  } catch (error) {
    Logger.error("An error occurred", {
      name: error.name,
      message: error.message,
    });
    return Promise.reject(error);
  }
};
