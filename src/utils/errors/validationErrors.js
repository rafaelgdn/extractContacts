/* eslint-disable max-classes-per-file */
class CustomError extends Error {}

class ExceedingTypeError extends CustomError {
  constructor(
    message = "Type is too big to be salved on our database, the limit is 1023 characters"
  ) {
    super(message);
    this.name = "ExceedingTypeError";
  }
}

class EmptyTypeError extends CustomError {
  constructor(message = "Type received from crawler was empty") {
    super(message);
    this.name = "EmptyTypeError";
  }
}

class ProcessPartsFilterError extends CustomError {
  constructor(message = "Failed filtering process parts") {
    super(message);
    this.name = "ProcessPartsFilterError";
  }
}

class EmptyLinkError extends CustomError {
  constructor(message = "Result has no link") {
    super(message);
    this.name = "EmptyLinkError";
  }
}

class EmptyProcessNumberError extends CustomError {
  constructor(message = "Process number received from crawler was empty") {
    super(message);
    this.name = "EmptyProcessNumberError";
  }
}

class ProcessPartsNameTooBigError extends CustomError {
  constructor(message = "Process part name is too big.") {
    super(message);
    this.name = "ProcessPartsNameTooBigError";
  }
}

class ProcessPartsTypeTooBigError extends CustomError {
  constructor(message = "Process part type is too big.") {
    super(message);
    this.name = "ProcessPartsTypeTooBigError";
  }
}

class ExceedingClassError extends CustomError {
  constructor(
    message = "Class is too big to be salved on our database, the limit is 1023 characters"
  ) {
    super(message);
    this.name = "ExceedingClassError";
  }
}

class ExceedingAreaError extends CustomError {
  constructor(
    message = "Area is too big to be salved on our database, the limit is 1023 characters"
  ) {
    super(message);
    this.name = "ExceedingAreaError";
  }
}

class ExceedingSubjectError extends CustomError {
  constructor(
    message = "Subject is too big to be salved on our database, the limit is 1023 characters"
  ) {
    super(message);
    this.name = "ExceedingSubjectError";
  }
}

class ExceedingLinkError extends CustomError {
  constructor(
    message = "Link is too big to be salved on our database, the limit is 255 characters"
  ) {
    super(message);
    this.name = "ExceedingLinkError";
  }
}

class ResultNotValidError extends CustomError {
  constructor(message = "Result has no s3 path or 'certificateGenerated'") {
    super(message);
    this.name = "ResultNotValidError";
  }
}

class NoProcessPartsError extends CustomError {
  constructor(message = "Crawler was solved without process parts.") {
    super(message);
    this.name = "NoProcessPartsError";
  }
}

class InvalidCertificateBooleanError extends CustomError {
  constructor(
    message = "CertificateGenerated param is neither a boolean or present in result"
  ) {
    super(message);
    this.name = "InvalidCertificateBooleanError";
  }
}

class InvalidMovementDateError extends CustomError {
  constructor(message = "lastMovimentDate is not a valid date") {
    super(message);
    this.name = "InvalidMovementDateError";
  }
}

class ProcessPartTypeError extends CustomError {
  constructor(message = "Result has an empty or null Process Part") {
    super(message);
    this.name = "ProcessPartTypeError";
  }
}

class ProcessPartNameError extends CustomError {
  constructor(message = "Result has an empty or null Process Name") {
    super(message);
    this.name = "ProcessPartNameError";
  }
}

class ExceedingEvidenceLinkError extends CustomError {
  constructor(
    message = "EvidenceLink is too big to be salved on our database, the limit is 500 characters"
  ) {
    super(message);
    this.name = "ExceedingEvidenceLinkError";
  }
}

export {
  ExceedingTypeError,
  EmptyTypeError,
  ProcessPartsFilterError,
  EmptyLinkError,
  EmptyProcessNumberError,
  ProcessPartsNameTooBigError,
  ProcessPartsTypeTooBigError,
  ExceedingClassError,
  ExceedingAreaError,
  ExceedingSubjectError,
  ExceedingLinkError,
  ResultNotValidError,
  NoProcessPartsError,
  InvalidCertificateBooleanError,
  InvalidMovementDateError,
  ProcessPartTypeError,
  ProcessPartNameError,
  ExceedingEvidenceLinkError,
};
