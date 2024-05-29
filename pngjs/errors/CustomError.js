class CustomError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);

        this.name = "CustomError";
        this.message = message;
    }
}

module.exports = CustomError;
