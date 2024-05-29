const CustomError = require("../errors/CustomError.js")

const Util = {
    capitalize: str => {
        return str[0].toUpperCase() + str.substring(1);
    },

    clamp: (x, a, b) => {
        return Math.max(Math.min(x, b), a);
    },

    round: (num, digits) => {
        return Math.round((num + Number.EPSILON) * 10 ** digits) / 10 ** digits;
    },

    randomElement: (arr, a = 0, b = arr.length) => {
        return arr[a + ~~(Math.random() * (b - a))];
    },

    parseArgs: (args, msg) => {
        let code = args,
            evalArgs = "";

        if (typeof msg !== "undefined" && msg.attachments.length > 0) {
            code = Util.fetchAttachment(msg);
            evalArgs = args ?? "";
        } else if (typeof code === "string") {
            code = code.trim();
            [evalArgs, code] = Util.splitAt(code, "```");

            if (code === "") {
                throw new CustomError("Invalid script");
            }

            let isScript;
            [isScript, code] = Util.parseScript(code);

            if (!isScript) {
                throw new CustomError("Invalid script");
            }

            if (Util.validUrl(code)) {
                code = Util.fetchScript(code);
            }
        }

        if (!code || code.length < 1) {
            throw new CustomError("No code provided");
        }

        evalArgs = evalArgs.trim();
        evalArgs = evalArgs.replace("\n", " ");

        return [code, evalArgs];
    },

    fetchAttachment: (msg, allowedType, binary = false) => {
        if (msg.attachments.length < 1) {
            throw new CustomError("Message doesn't have any attachments");
        }

        const attach = msg.attachments[0],
            url = attach.url;

        if (allowedType !== null && typeof allowedType !== "undefined") {
            if (attach.contentType !== allowedType) {
                throw new CustomError("Invalid content type: " + attach.contentType);
            }
        }

        const opts = {
            url,
            method: "get",
            responseType: binary ? "arraybuffer" : "text"
        };

        let res;

        try {
            res = http.request(opts);
        } catch (err) {
            throw new CustomError("Could not fetch attachment file. Error: " + err.message);
        }

        if (res.status !== 200) {
            throw new CustomError("Could not fetch attachment file. Code: " + res.status);
        }

        return res.data;
    },

    fetchScript: url => {
        const opts = {
            url,
            method: "get",
            responseType: "text"
        };

        let res;

        try {
            res = http.request(opts);
        } catch (err) {
            throw new CustomError("URL invalid or unreachable. Error: " + err.message);
        }

        if (res.status !== 200) {
            throw new CustomError("Unsuccessful download. Code: " + res.status);
        }

        code = res.data.trim();
    },

    urlRegex: /\w+?:\/\/(.+\.)?[\w|\d]+\.\w+\/?.*/,
    validUrl: url => {
        return Util.urlRegex.test(url);
    },

    splitAt: (str, sep = " ") => {
        const ind = str.indexOf(sep);

        let first, second;

        if (ind === -1) {
            first = str;
            second = "";
        } else {
            first = str.slice(0, ind);
            second = str.slice(ind);
        }

        return [first, second];
    },

    scriptRegex: /^`{3}([\S]+)?\n([\s\S]+)\n?`{3}$/,
    parseScript: script => {
        const match = script.match(Util.scriptRegex);

        if (!match) {
            return [false, script];
        }

        let lang = match[1],
            body = match[2];

        if (typeof body === "undefined") {
            body = lang;
            lang = "";
        }

        return [true, body, lang];
    },

    formatOutput: out => {
        if (out === null) {
            return undefined;
        }

        if (Array.isArray(out)) {
            return out.join(", ");
        }

        switch (typeof out) {
            case "bigint":
            case "boolean":
            case "number":
                return out.toString();
            case "function":
            case "symbol":
                return undefined;
            case "object":
                try {
                    return JSON.stringify(out);
                } catch (err) {
                    return undefined;
                }
            default:
                return out;
        }
    }
};

module.exports = Util;