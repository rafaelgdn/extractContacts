import AWS from "aws-sdk";
import { Logger } from "./logger";

export const saveOnS3 = async (finalResult, path, bucket) => {
  try {
    const s3 = new AWS.S3({ region: "us-east-1" });
    const params = {
      Bucket: bucket,
      Key: path,
      Body: JSON.stringify(finalResult),
    };

    await s3.putObject(params).promise();
    Logger.info("Result was saved on s3");

    return Promise.resolve(path);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const readFromS3 = async (path, bucket) => {
  try {
    const s3 = new AWS.S3({ region: "us-east-1" });
    const params = {
      Bucket: bucket,
      Key: path,
    };

    const data = await s3.getObject(params).promise();
    const result = JSON.parse(data.Body.toString());
    Logger.info("Result read from s3", { result });

    return Promise.resolve(result);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const deleteFile = async (
  bucket,
  key,
  { region } = { region: "us-east-1" }
) => {
  try {
    const s3 = new AWS.S3({ region });
    const deleteParams = {
      Bucket: bucket,
      Key: key,
    };

    await s3.deleteObject(deleteParams).promise();

    return Promise.resolve("Object deleted!");
  } catch (error) {
    return Promise.reject(error);
  }
};

export const readFile = async (
  bucket,
  key,
  { region } = { region: "us-east-1" }
) => {
  try {
    const getParams = {
      Bucket: bucket,
      Key: key,
    };

    const s3 = new AWS.S3({ region });

    const data = s3.getObject(getParams).promise();
    return Promise.resolve(data);
  } catch (error) {
    return Promise.reject(error);
  }
};
