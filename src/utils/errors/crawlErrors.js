/* eslint-disable max-classes-per-file */
class CustomError extends Error {}

class CrawlWithChromeError extends CustomError {
  constructor(message) {
    super(message);
    this.name = "CrawlWithChromeError";
  }
}

class UnexpectedError extends CustomError {
  constructor(message = "Something unexpected happeneds") {
    super(message);
    this.name = "UnexpectedError";
  }
}

class ConnectionRefusedError extends CustomError {
  constructor(message = "Connection Refused") {
    super(message);
    this.name = "ConnectionRefusedError";
  }
}

class InputError extends CustomError {
  constructor(message) {
    super(message);
    this.name = "InputError";
  }
}

class MaxAttemptError extends CustomError {
  constructor(message) {
    super(message);
    this.name = "MaxAttemptError";
  }
}

class CrawlParserError extends CustomError {
  constructor(message) {
    super(message);
    this.name = "CrawlParserError";
  }
}

class SourceUnavailableError extends CustomError {
  constructor(message = "Source is not available.") {
    super(message);
    this.name = "SourceUnavailableError";
  }
}

class InstableProxyError extends CustomError {
  constructor(message = "Proxy is not available.") {
    super(message);
    this.name = "InstableProxyError";
  }
}

class FinishedProxyListError extends CustomError {
  constructor(message = "All proxies tested and there was no result.") {
    super(message);
    this.name = "FinishedProxyListError";
  }
}

class NavigationError extends CustomError {
  constructor(message = "Failed on goto") {
    super(message);
    this.name = "NavigationError";
  }
}

class BadCPFError extends CustomError {
  constructor(message = "Bad CPF") {
    super(message);
    this.name = "BadCPFError";
  }
}

class BadCNPJError extends CustomError {
  constructor(message = "Bad CNPJ") {
    super(message);
    this.name = "BadCNPJError";
  }
}

class BrowserNotLaunchedError extends CustomError {
  constructor(message = "Could not launch browser") {
    super(message);
    this.name = "BrowserNotLaunchedError";
  }
}

class PageAccessError extends CustomError {
  constructor(message = "Error when try to access page") {
    super(message);
    this.name = "PageAccessError";
  }
}

class IPRetrieveError extends CustomError {
  constructor(message = "Could not retrieve browser ip") {
    super(message);
    this.name = "IPRetrieveError";
  }
}

class CrawlerNotFoundError extends CustomError {
  constructor(message = "Could not found crawler on database") {
    super(message);
    this.name = "CrawlerNotFoundError";
  }
}

class RegisterNotFoundError extends CustomError {
  constructor(message = "Could not found a register on database") {
    super(message);
    this.name = "RegisterNotFoundError";
  }
}

class FillTextInputError extends CustomError {
  constructor(message = "Error when try to fill text input") {
    super(message);
    this.name = "FillTextInputError";
  }
}

class AccessDeniedError extends CustomError {
  constructor(message = "Access Denied to the source.") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

class LoadingWrapperError extends CustomError {
  constructor(message = "Loading wrapper still remains on page.") {
    super(message);
    this.name = "LoadingWrapperError";
  }
}

class SelectorNotLoadedError extends CustomError {
  constructor(message = "Selector did not load on this page") {
    super(message);
    this.name = "SelectorNotLoadedError";
  }
}

class SourceInternalServerError extends CustomError {
  constructor(message = "Source responded with an internal error.") {
    super(message);
    this.name = "SourceInternalServerError";
  }
}

class ProcessPartsLoadingError extends CustomError {
  constructor(
    message = "Process Parts did not load, probably because its too big."
  ) {
    super(message);
    this.name = "ProcessPartsLoadingError";
  }
}

class UnavailableProcessError extends CustomError {
  constructor(message = "Process is Unavailable.") {
    super(message);
    this.name = "UnavailableProcessError";
  }
}

class CrawlerIdTakenError extends CustomError {
  constructor(message = "Specified Crawler Id has already been taken") {
    super(message);
    this.name = "CrawlerIdTakenError";
  }
}

class NoMatchError extends CustomError {
  constructor(message = "Name and document do not match") {
    super(message);
    this.Error = "NoMatchError";
    this.Cause = message;
    this.name = "NoMatchError";
  }
}

class ExpandIncidentsProcessesError extends CustomError {
  constructor(message = "Could not expand incidents processes list") {
    super(message);
    this.Error = "ExpandIncidentsProcessesError";
  }
}

class NoMovementDateFound extends CustomError {
  constructor(message) {
    super(message);
    this.name = "NoMovementDateFound";
  }
}

class NullResultError extends CustomError {
  constructor(message = "One or more results are NULL.") {
    super(message);
    this.name = "NullResultError";
  }
}

class MissingParameterError extends CustomError {
  constructor(message = "Result has no s3 path or 'certificateGenerated'") {
    super(message);
    this.name = "MissingParameterError";
  }
}

class InvalidConcurrencyLimitValueError extends CustomError {
  constructor(
    message = "Concurrency Limit value must be an Integer with value between 0 and crawlers's maxConcurrencyLimit"
  ) {
    super(message);
    this.name = "InvalidConcurrencyLimitValueError";
  }
}

class MaxRequestAttemptsError extends CustomError {
  constructor(message = "Request reached it's maximum attempts") {
    super(message);
    this.name = "MaxRequestAttemptsError";
    this.Cause = message;
  }
}

class CaptchaIsNotMapedError extends CustomError {
  constructor(message = "Unexpected captcha") {
    super(message);
    this.name = "CaptchaIsNotMapedError";
    this.Cause = message;
  }
}

class ExpectedTimeOut extends CustomError {
  constructor(message = "Expected TimeOut") {
    super(message);
    this.name = "ExpectedTimeOut";
    this.Cause = message;
  }
}

export {
  CrawlWithChromeError,
  UnexpectedError,
  ConnectionRefusedError,
  InputError,
  MaxAttemptError,
  CrawlParserError,
  SourceUnavailableError,
  InstableProxyError,
  FinishedProxyListError,
  NavigationError,
  BadCPFError,
  BadCNPJError,
  BrowserNotLaunchedError,
  PageAccessError,
  IPRetrieveError,
  CrawlerNotFoundError,
  RegisterNotFoundError,
  FillTextInputError,
  AccessDeniedError,
  LoadingWrapperError,
  SelectorNotLoadedError,
  SourceInternalServerError,
  ProcessPartsLoadingError,
  UnavailableProcessError,
  CrawlerIdTakenError,
  NoMatchError,
  ExpandIncidentsProcessesError,
  NoMovementDateFound,
  NullResultError,
  MissingParameterError,
  InvalidConcurrencyLimitValueError,
  MaxRequestAttemptsError,
  CaptchaIsNotMapedError,
  ExpectedTimeOut,
};
