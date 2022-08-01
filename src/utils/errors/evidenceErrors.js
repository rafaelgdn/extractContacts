/* eslint-disable max-classes-per-file */
class CustomError extends Error {}

class PDFDownloadError extends CustomError {
  constructor(message = "Failed to download PDF") {
    super(message);
    this.name = "PDFDownloadError";
  }
}

class GetEvidenceError extends CustomError {
  constructor(message = "Failed to get evidence") {
    super(message);
    this.name = "GetEvidenceError";
  }
}

class SaveFileOnBucketError extends CustomError {
  constructor(message = "Failed to salve file on bucket") {
    super(message);
    this.name = "SaveFileOnBucketError";
  }
}

class NoEvidenceError extends CustomError {
  constructor(message = "Crawler was solved without evidences.") {
    super(message);
    this.name = "NoEvidenceError";
  }
}

export {
  PDFDownloadError,
  GetEvidenceError,
  SaveFileOnBucketError,
  NoEvidenceError,
};
