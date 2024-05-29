const ExitError = require("../errors/ExitError.js");

function exit(msg) {
    msg = msg.toString();
    throw new ExitError(msg);
}

module.exports = exit;