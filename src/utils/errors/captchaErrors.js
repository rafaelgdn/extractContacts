/* eslint-disable max-classes-per-file */
class CustomError extends Error {}

class CaptchaError extends CustomError {
  constructor(message) {
    super(message);
    this.name = "CaptchaError";
  }
}

class ImageCaptchaError extends CustomError {
  constructor(message = "Image Captcha was not resolved correctly.") {
    super(message);
    this.name = "ImageCaptchaError";
  }
}

class ReCaptchaError extends CustomError {
  constructor(message) {
    super(message);
    this.name = "ReCaptchaError";
  }
}

class ReCaptchaNotSolvedError extends CustomError {
  constructor(message = "ReCaptcha not solved yet.") {
    super(message);
    this.name = "ReCaptchaNotSolvedError";
  }
}

class GetCaptchaResultError extends CustomError {
  constructor(message = "Failed requesting recaptcha from service.") {
    super(message);
    this.name = "GetRecaptchaResultError";
  }
}

class RegisterCaptchaError extends CustomError {
  constructor(message = "Failed registering recaptcha in service.") {
    super(message);
    this.name = "RegisterCaptchaError";
  }
}

class DrawCaptchaBase64ImageError extends CustomError {
  constructor(message = "Failed to draw base64 image") {
    super(message);
    this.name = "DrawCaptchaBase64ImageError";
  }
}

class GetImageError extends CustomError {
  constructor(message = "An error ocurred retrieving the image base64.") {
    super(message);
    this.name = "GetImageError";
  }
}

class GetBase64ImageError extends CustomError {
  constructor(message) {
    super(message);
    this.name = "GetBase64ImageError";
  }
}

class BadCaptchaError extends CustomError {
  constructor(message = "Captcha solution is wrong") {
    super(JSON.stringify(message));
    this.name = "BadCaptchaError";
  }
}

class RecaptchaAlert extends CustomError {
  constructor(message = "Recaptcha V3 alert, try again.") {
    super(JSON.stringify(message));
    this.name = "RecaptchaAlert";
  }
}

class CaptchaScoreTooLow extends CustomError {
  constructor(message = "Captcha score is too low") {
    super(JSON.stringify(message));
    this.name = "CaptchaScoreTooLow";
  }
}

export {
  CaptchaError,
  ImageCaptchaError,
  ReCaptchaError,
  ReCaptchaNotSolvedError,
  GetCaptchaResultError,
  RegisterCaptchaError,
  DrawCaptchaBase64ImageError,
  GetImageError,
  GetBase64ImageError,
  BadCaptchaError,
  RecaptchaAlert,
  CaptchaScoreTooLow,
};
