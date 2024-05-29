class ExitError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);

        this.name = "ExitError";
        this.message = message;
    }
}

module.exports = ExitError;