/**
 * @name CustomError
 * @description class responsable to create a custom error
 */
class CustomError extends Error {
  constructor(message, status, name, body) {
    super(message);
    this.status = status;
    if (name) this.name = name;
    if (body) this.body = body;
  }

  toJSON() {
    return {
      name: this.name,
      status: this.status,
      message: this.message,
      stack: this.stack,
      body: this.body,
    };
  }
}

module.exports = CustomError;
