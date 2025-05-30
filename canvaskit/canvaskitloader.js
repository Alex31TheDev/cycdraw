"use strict";
/* global decodeBase2n:readonly, table:readonly, fastDecodeBase2n:readonly */

// config
const config = {
    loadLibrary: util.loadLibrary ?? "canvaskit",
    loadSource: util.loadSource ?? (0 ? "url" : "tag"),
    enableDebugger: util.inspectorEnabled ?? false,

    isolateGlobals: util._isolateGlobals ?? true,
    useWasmBase2nDecoder: util._useWasmBase2nDecoder ?? true,
    forceXzDecompressor: util._forceXzDecompressor ?? false,

    tagOwner: "883072834790916137"
};

const features = {
    useBase2nDecoder: false,
    useXzDecompressor: false,
    useZstdDecompressor: false,

    useLoadFuncs: false
};

const consoleOpts = {};

// sources
const urls = {
    PromisePolyfillUrl: "https://cdn.jsdelivr.net/npm/promise-polyfill",
    TextEncoderDecoderPolyfillUrl:
        "https://cdn.jsdelivr.net/npm/fastestsmallesttextencoderdecoder@1.0.22/NodeJS/EncoderAndDecoderNodeJS.min.js",
    BufferPolyfillUrl: "https://files.catbox.moe/6wyu2h.js",
    WebWorkerPolyfillUrl: "https://files.catbox.moe/or9q01.js",

    CanvasKitLoaderUrl: "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.js",
    CanvasKitWasmUrl: "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.wasm",

    ResvgLoaderUrl: "https://files.catbox.moe/5fiy8q.js",
    ResvgWasmUrl: "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm",

    LibVipsLoaderUrl: "https://files.catbox.moe/j1uor5.js",
    LibVipsWasmUrl: "https://cdn.jsdelivr.net/npm/wasm-vips@0.0.11/lib/vips.wasm",

    LodepngInitUrl: "https://cdn.jsdelivr.net/npm/@cwasm/lodepng@0.1.7/index.js",
    LodepngWasmUrl: "https://cdn.jsdelivr.net/npm/@cwasm/lodepng@0.1.7/lodepng.wasm"
};

const tags = {
    Base2nTagName: "ck_base2n",
    Base2nWasmWrapperTagName: "ck_base2nwasm_dec",
    Base2nWasmInitTagName: "ck_base2nwasm_init",
    Base2nWasmWasmTagName: "ck_base2nwasm_wasm",

    XzDecompressorTagName: "ck_xz_decomp",
    XzWasmTagName: "ck_xz_wasm",

    ZstdDecompressorTagName: "ck_zstd_decomp",
    ZstdWasmTagName: "ck_zstd_wasm",

    PromisePolyfillTagName: "ck_promise_polyfill",
    BufferPolyfillTagName: "ck_buffer_polyfill",
    TextEncoderDecoderPolyfillTagName: "ck_textdecenc_polyfill",
    WebWorkerPolyfillTagName: "",

    CanvasKitLoaderTagName: /^ck_loader_init\d+$/,
    CanvasKitWasm1TagName: /^ck_wasm\d+$/,
    CanvasKitWasm2TagName: /^ck_wasm_new\d+$/,

    ResvgLoaderTagName: "ck_resvg_init",
    ResvgWasmTagName: /^ck_resvg_wasm\d+$/,

    LibVipsLoaderTagName: "",
    LibVipsWasmTagName: "",

    LodepngInitTagName: "ck_lodepng_init",
    LodepngWasmTagName: "ck_lodepng_wasm"
};

// info
const usage = `Leveret: \`util.executeTag("canvaskitloader");\`
El Levert: \`eval(util.fetchTag("canvaskitloader").body);\``;

const scripts = `- %t canvaskitexample
- %t caption
- %t qalc
- %t qrcode
- %t sort`;

const docs = `CanvasKit GitHub: https://github.com/google/skia/tree/main/modules/canvaskit
CanvasKit API docs: https://github.com/google/skia/blob/a004a27085d7dcc4efc3766c9abe92df03654c7c/modules/canvaskit/npm_build/types/index.d.ts

Tag repo: https://github.com/Alex31TheDev/cycdraw/tree/main/canvaskit`;

// errors
class CustomError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class RefError extends CustomError {
    constructor(message = "", ref, ...args) {
        super(message, ...args);

        this.ref = ref;
    }
}

class ExitError extends CustomError {}
class LoggerError extends CustomError {}

class UtilError extends RefError {}

class LoaderError extends RefError {
    constructor(message = "", ref, ...args) {
        if (ref instanceof Error) {
            super(message, ref, ...args);

            const descriptors = Object.getOwnPropertyDescriptors(ref);
            ["message", "name", "stack"].forEach(key => delete descriptors[key]);
            Object.defineProperties(this, descriptors);

            this.stack = `${this.stack}\nCaused by: ${ref.stack}`;

            return this;
        }

        super(message, ref, ...args);
    }
}

// delete config props
(function deleteConfigProps() {
    const defaultUtilProps = [
        "version",
        "env",
        "timeLimit",
        "inspectorEnabled",
        "outCharLimit",
        "outLineLimit",
        "findUsers",
        "fetchTag",
        "findTags",
        "dumpTags",
        "fetchMessage",
        "fetchMessages",
        "findTags",
        "executeTag"
    ];

    for (const key of Object.keys(util)) {
        if (!defaultUtilProps.includes(key)) {
            delete util[key];
        }
    }
})();

// classes
class Logger {
    static levels = {
        info: 0,
        warn: 1,
        error: 2
    };

    constructor(enabled = true, options = {}) {
        this.enabled = enabled;
        this.options = options;

        this.level = options.level ?? "info";

        this._objIndentation = options.objIndentation ?? 4;

        if (typeof options.formatLog === "function") {
            this._formatLog = options.formatLog.bind(this);
        }

        this.logs = [];
        this._seqLogId = 0;

        this.clearLogs();
        this._defineLogFuncs();
    }

    clearLogs() {
        this.log_str = "";
        this.logs.length = 0;
    }

    get level() {
        return Logger._getLevelByIndex(this._level);
    }

    set level(level) {
        this._level = Logger._getLevelIndex(level);
    }

    log(level, ...args) {
        if (!this.enabled) return;

        if (Object.keys(Logger.levels).includes(level)) {
            this._createEntry(level, ...args);
        } else {
            const msg = level,
                objs = args;

            this._createEntry("info", msg, ...objs);
        }
    }

    getLogs(level, last) {
        if (LoaderUtils.empty(this.logs)) {
            return "";
        }

        if (level == null && last == null) {
            return this.log_str.slice(0, -1);
        }

        let logs = this.logs;

        if (typeof level === "string") {
            const levelInd = Logger._getLevelIndex(level);
            logs = logs.filter(log => Logger._getLevelIndex(log.level) >= levelInd);
        }

        if (typeof last === "number") {
            logs = logs.slice(-last);
        }

        if (LoaderUtils.empty(logs.length)) {
            return "";
        }

        const format = logs.map(info => this._formatLog(info)).join("\n");
        return format;
    }

    replyWithLogs(level, last) {
        const log_str = this.getLogs(level, last);

        if (LoaderUtils.empty(log_str)) {
            return;
        }

        const codeBlock = LoaderUtils.codeBlock(log_str);
        exit(msg.reply(codeBlock));
    }

    static _getLevelIndex(level) {
        const levels = Object.entries(Logger.levels),
            find = levels.find(([key]) => key === level);

        if (typeof find === "undefined") {
            throw new LoggerError("Unknown logger level: " + level);
        }

        return find[1];
    }

    static _getLevelByIndex(ind) {
        const levels = Object.entries(Logger.levels),
            find = levels.find(([, value]) => value === ind);

        if (typeof find === "undefined") {
            throw new LoggerError("Unknown level index: " + ind);
        }

        return find[0];
    }

    _createEntry(level, msg, ...objs) {
        if (!this.enabled) {
            return;
        }

        const levelInd = Logger._getLevelIndex(level);

        if (levelInd < this._level) {
            return;
        }

        const info = {
            id: this._getSeqLogId(),
            level,
            timestamp: Date.now(),
            msg,
            objs
        };

        this.logs.push(info);

        const format = this._formatLog(info);
        this.log_str += format + "\n";
    }

    _formatLog(info) {
        let format = `${info.level}: ${info.msg}`;

        if (info.objs.length > 0) {
            const objStrs = info.objs.map(obj => this._formatObject(obj));
            format += " " + objStrs.join(" ");
        }

        return format;
    }

    _formatObject(obj) {
        if (Array.isArray(obj)) {
            return `[${obj.join(", ")}]`;
        }

        if (obj instanceof Error) {
            return `${obj.message}\n${obj.stack}`;
        }

        const properties = Object.getOwnPropertyNames(obj);
        return JSON.stringify(obj, properties, this._objIndentation);
    }

    _defineLogFuncs() {
        for (const level of Object.keys(Logger.levels)) {
            const logFunc = this._createEntry.bind(this, level);
            this[level] = logFunc;
        }
    }

    _getSeqLogId() {
        return this._seqLogId++;
    }
}

// util
function exit(out) {
    throw new ExitError(out);
}

const FileDataTypes = Object.freeze({
    text: "text",
    json: "json",
    binary: "binary",
    module: "module"
});

// source: http://www.myersdaily.org/joseph/javascript/md5.js
const md5 = (() => {
    function add32(a, b) {
        return (a + b) & 0xffffffff;
    }

    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a, b, c, d, x, s, t) {
        return cmn((b & c) | (~b & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & ~d), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
        return cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    function md5cycle(x, k) {
        let a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);

        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);

        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
    }

    function md5blk(s) {
        let blks = Array(16);

        for (let i = 0; i < 64; i += 4) {
            const b1 = s.charCodeAt(i),
                b2 = s.charCodeAt(i + 1) << 8,
                b3 = s.charCodeAt(i + 2) << 16,
                b4 = s.charCodeAt(i + 3) << 24;

            blks[i >> 2] = b1 + b2 + b3 + b4;
        }

        return blks;
    }

    function md5_raw(str) {
        let n = str.length,
            state = [1732584193, -271733879, -1732584194, 271733878];

        let i;

        for (i = 64; i <= str.length; i += 64) {
            const substr = str.substring(i - 64, i),
                blks = md5blk(substr);

            md5cycle(state, blks);
        }

        str = str.substring(i - 64);
        const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        for (i = 0; i < str.length; i++) {
            const b = str.charCodeAt(i);
            tail[i >> 2] |= b << (i % 4 << 3);
        }

        tail[i >> 2] |= 0x80 << (i % 4 << 3);

        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i++) tail[i] = 0;
        }

        tail[14] = n * 8;
        md5cycle(state, tail);

        return state;
    }

    const hex_chr = "0123456789abcdef".split("");

    function rhex(x) {
        let str = "";

        for (let j = 0; j < 4; j++) {
            const c1 = hex_chr[(x >> (j * 8 + 4)) & 0x0f],
                c2 = hex_chr[(x >> (j * 8)) & 0x0f];

            str += c1 + c2;
        }

        return str;
    }

    function hex(arr) {
        const str = Array(arr.length);

        for (let i = 0; i < arr.length; i++) {
            str[i] = rhex(arr[i]);
        }

        return str.join("");
    }

    return function md5(str) {
        return hex(md5_raw(str));
    };
})();

let LoaderUtils = {
    md5,

    outCharLimit: util.outCharLimit ?? 1000,
    outLineLimit: util.outLineLimit ?? 6,

    numbers: "0123456789",
    alphabet: "abcdefghijklmnopqrstuvwxyz",

    parseInt: (str, radix = 10, defaultValue) => {
        if (typeof str !== "string" || typeof radix !== "number") {
            return defaultValue ?? NaN;
        }

        if (radix < 2 || radix > 36) {
            return defaultValue ?? NaN;
        }

        str = str.trim();
        const exp = LoaderUtils._validNumberRegexes.get(radix);

        if (!exp.test(str)) {
            return defaultValue ?? NaN;
        }

        str = str.replaceAll(",", "");
        return Number.parseInt(str, radix);
    },

    truthyStrings: new Set(["true", "yes", "y", "t"]),
    falsyStrings: new Set(["false", "no", "n", "f"]),

    parseBool: (str, defaultValue) => {
        if (typeof str !== "string") {
            return defaultValue ?? null;
        }

        str = str.trim().toLowerCase();

        if (LoaderUtils.truthyStrings.has(str)) {
            return true;
        } else if (LoaderUtils.falsyStrings.has(str)) {
            return false;
        } else {
            return defaultValue ?? null;
        }
    },

    formatNumber: (num, digits) => {
        const options = {
            maximumFractionDigits: digits
        };

        if ((num !== 0 && Math.abs(num) < 1e-6) || Math.abs(num) >= 1e21) {
            const str = num.toLocaleString("en-US", {
                notation: "scientific",
                useGrouping: false,
                ...options
            });

            return str.toLowerCase();
        }

        return num.toLocaleString("en-US", options);
    },

    stripSpaces: str => {
        return str.replace(/\s+/g, "");
    },

    getCharType: char => {
        if (char?.length !== 1) {
            return "invalid";
        }

        const code = char.charCodeAt(0);

        if (code === 32) {
            return "space";
        } else if (code >= 48 && code <= 57) {
            return "number";
        } else if (code >= 65 && code <= 90) {
            return "uppercase";
        } else if (code >= 97 && code <= 122) {
            return "lowercase";
        } else {
            return "other";
        }
    },

    _leadingSpacesRegex: /^\s*/,
    _trailingSpacesRegex: /\s*$/,
    capitalize: str => {
        str = String(str);

        const leading = str.match(LoaderUtils._leadingSpacesRegex)[0],
            trailing = str.match(LoaderUtils._trailingSpacesRegex)[0];

        const content = str.slice(leading.length, str.length - trailing.length);

        if (content.length < 1) {
            return str;
        } else {
            return leading + content[0].toUpperCase() + content.slice(1) + trailing;
        }
    },

    _camelToWordsRegex: /([a-z])([A-Z])/g,
    camelCaseToWords: str => {
        const words = str.replace(LoaderUtils._camelToWordsRegex, "$1 $2");
        return words.toLowerCase();
    },

    _wordsToCamelRegex: /(?:^\w|[A-Z]|\b\w|\s+)/g,
    wordsToCamelCase: str => {
        str = str.toLowerCase();

        const camel = str.replace(LoaderUtils._wordsToCamelRegex, (match, i) =>
            match[`to${i ? "Upper" : "Lower"}Case`]()
        );

        return LoaderUtils.stripSpaces(camel);
    },

    removeStringRange: (str, i, length = 1) => {
        return str.slice(0, i) + str.slice(i + length);
    },

    replaceStringRange: (str, replacement, i, length = 1) => {
        return str.slice(0, i) + replacement + str.slice(i + length);
    },

    randomString: n => {
        const alphabet = LoaderUtils.alphanumeric,
            result = Array(n);

        for (let i = 0; i < n; i++) {
            result[i] = alphabet[~~(Math.random() * alphabet.length)];
        }

        return result.join("");
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

    splitArgs: (str, lowercase = false, options = {}) => {
        let multipleLowercase = Array.isArray(lowercase);

        if (!multipleLowercase && typeof lowercase === "object") {
            options = lowercase;

            lowercase = options.lowercase ?? false;
            multipleLowercase = Array.isArray(lowercase);
        }

        const lowercaseFirst = multipleLowercase ? lowercase[0] ?? false : lowercase,
            lowercaseSecond = multipleLowercase ? lowercase[1] ?? false : false;

        let sep = options.sep ?? [" ", "\n"],
            n = options.n ?? 1;

        if (sep.length === 0) {
            if (lowercaseFirst) {
                return [str.toLowerCase(), ""];
            }

            return [str, ""];
        }

        if (!Array.isArray(sep)) {
            sep = [sep];
        }

        let first, second;

        let ind = -1,
            sepLength;

        if (sep.length === 1) {
            sep = sep[0] ?? sep;

            ind = str.indexOf(sep);
            sepLength = sep.length;

            if (n > 1) {
                for (let i = 1; i < n; i++) {
                    ind = str.indexOf(sep, ind + 1);

                    if (ind === -1) {
                        break;
                    }
                }
            }
        } else {
            const escaped = sep.map(item => LoaderUtils.escapeRegex(item)),
                exp = new RegExp(escaped.join("|"), "g");

            if (n <= 1) {
                const match = exp.exec(str);

                if (match) {
                    ind = match.index;
                    sepLength = match[0].length;
                }
            } else {
                let match;

                for (let i = 1; (match = exp.exec(str)) !== null; i++) {
                    if (i === n) {
                        ind = match.index;
                        sepLength = match[0].length;

                        break;
                    } else if (i > n) {
                        ind = -1;
                        break;
                    }
                }
            }
        }

        if (ind === -1) {
            first = str;
            second = "";
        } else {
            first = str.slice(0, ind);
            second = str.slice(ind + sepLength);
        }

        if (lowercaseFirst) {
            first = first.toLowerCase();
        }

        if (lowercaseSecond) {
            second = second.toLowerCase();
        }

        return [first, second];
    },

    utf8ByteLength: str => {
        let i = 0,
            len = LoaderUtils.countChars(str);

        let codepoint,
            length = 0;

        for (; i < len; i++) {
            codepoint = str.codePointAt(i);

            if (codepoint <= 0x7f) {
                length += 1;
            } else if (codepoint <= 0x7ff) {
                length += 2;
            } else if (codepoint <= 0xffff) {
                length += 3;
            } else {
                length += 4;
                i++;
            }
        }

        return length;
    },

    countChars: str => {
        return str?.length ?? 0;
    },

    countLines: str => {
        if (typeof str !== "string") {
            return 0;
        }

        let count = 1,
            pos = 0;

        while ((pos = str.indexOf("\n", pos)) !== -1) {
            count++;
            pos++;
        }

        return count;
    },

    overSizeLimits: (obj, charLimit, lineLimit) => {
        if (obj == null) {
            return false;
        }

        if (typeof charLimit === "number") {
            const count = LoaderUtils.countChars(obj);

            if (count > charLimit) {
                return [count, null];
            }
        }

        if (typeof lineLimit === "number") {
            const count = LoaderUtils.countLines(obj);

            if (count > lineLimit) {
                return [null, count];
            }
        }

        return false;
    },

    trimString: (str, charLimit, lineLimit, showDiff = false) => {
        if (typeof str !== "string") {
            return str;
        }

        const oversized = LoaderUtils.overSizeLimits(str, charLimit, lineLimit);

        if (!oversized) {
            return str;
        }

        const [chars, lines] = oversized;

        if (chars !== null) {
            const trimmed = str.slice(0, charLimit);

            const diff = chars - charLimit,
                s = diff > 1 ? "s" : "";

            if (showDiff) {
                return `${trimmed} ... (${diff} more character${s})`;
            } else {
                return trimmed + "...";
            }
        } else if (lines !== null) {
            const split = str.split("\n"),
                trimmed = split.slice(0, lineLimit).join("\n");

            const diff = lines - lineLimit,
                s = diff > 1 ? "s" : "";

            if (showDiff) {
                return `${trimmed} ... (${diff} more line${s})`;
            } else {
                return trimmed + "...";
            }
        }
    },

    findNthCharacter: (str, char, n) => {
        let index = -1;

        while (n > 0) {
            index = str.indexOf(char, index + 1);

            if (index === -1) {
                return -1;
            }

            n--;
        }

        return index;
    },

    hasPrefix: (prefixes, str) => {
        if (!Array.isArray(prefixes)) {
            prefixes = [prefixes];
        }

        return prefixes.some(prefix => str.startsWith(prefix));
    },

    exceedsLimits: str => {
        return LoaderUtils.overSizeLimits(str, LoaderUtils.outCharLimit, LoaderUtils.outLineLimit);
    },

    codeBlock: (str, lang) => {
        let formatted = "```\n";

        if (!LoaderUtils.empty(lang)) {
            formatted += lang + "\n";
        }

        formatted += str + "```";

        if (LoaderUtils.exceedsLimits(formatted)) {
            return str;
        } else {
            return formatted;
        }
    },

    escapeMarkdown: (text, options = {}) => {
        const codeBlock = options.codeBlock ?? true,
            inlineCode = options.inlineCode ?? true,
            bold = options.bold ?? true,
            italic = options.italic ?? true,
            underline = options.underline ?? true,
            strikethrough = options.strikethrough ?? true,
            spoiler = options.spoiler ?? true,
            codeBlockContent = options.codeBlockContent ?? true,
            inlineCodeContent = options.inlineCodeContent ?? true,
            escape = options.escape ?? true,
            heading = options.heading ?? true,
            bulletedList = options.bulletedList ?? true,
            numberedList = options.numberedList ?? true,
            maskedLink = options.maskedLink ?? true;

        if (!codeBlockContent) {
            return text
                .split("```")
                .map((sub, i, arr) => {
                    if (i % 2 && i !== arr.length - 1) return sub;

                    return LoaderUtils.escapeMarkdown(sub, {
                        ...options,
                        codeBlockContent: true
                    });
                })
                .join(codeBlock ? "\\`\\`\\`" : "```");
        }

        if (!inlineCodeContent) {
            return text
                .split(/(?<=^|[^`])`(?=[^`]|$)/g)
                .map((sub, i, arr) => {
                    if (i % 2 && i !== arr.length - 1) return sub;

                    return LoaderUtils.escapeMarkdown(sub, {
                        ...options,
                        inlineCodeContent: true
                    });
                })
                .join(inlineCode ? "\\`" : "`");
        }

        let res = text;

        if (escape) res = res.replaceAll("\\", "\\\\");
        if (inlineCode)
            res = res.replaceAll(/(?<=^|[^`])``?(?=[^`]|$)/g, match => (match.length === 2 ? "\\`\\`" : "\\`"));
        if (codeBlock) res = res.replaceAll("```", "\\`\\`\\`");

        if (italic) {
            let idx = 0;

            res = res.replaceAll(/(?<=^|[^*])\*([^*]|\*\*|$)/g, (_, match) => {
                if (match === "**") return ++idx % 2 ? `\\*${match}` : `${match}\\*`;
                return `\\*${match}`;
            });

            idx = 0;

            res = res.replaceAll(/(?<=^|[^_])(?<!<a?:.+|https?:\/\/\S+)_(?!:\d+>)([^_]|__|$)/g, (_, match) => {
                if (match === "__") return ++idx % 2 ? `\\_${match}` : `${match}\\_`;
                return `\\_${match}`;
            });
        }

        if (bold) {
            let idx = 0;

            res = res.replaceAll(/\*\*(\*)?/g, (_, match) => {
                if (match) return ++idx % 2 ? `${match}\\*\\*` : `\\*\\*${match}`;
                return "\\*\\*";
            });
        }

        if (underline) {
            let idx = 0;

            res = res.replaceAll(/(?<!<a?:.+|https?:\/\/\S+)__(_)?(?!:\d+>)/g, (_, match) => {
                if (match) return ++idx % 2 ? `${match}\\_\\_` : `\\_\\_${match}`;
                return "\\_\\_";
            });
        }

        if (strikethrough) res = res.replaceAll("~~", "\\~\\~");
        if (spoiler) res = res.replaceAll("||", "\\|\\|");
        if (heading) res = res.replaceAll(/^( {0,2})([*-] )?( *)(#{1,3} )/gm, "$1$2$3\\$4");
        if (bulletedList) res = res.replaceAll(/^( *)([*-])( +)/gm, "$1\\$2$3");
        if (numberedList) res = res.replaceAll(/^( *\d+)\./gm, "$1\\.");
        if (maskedLink) res = res.replaceAll(/\[.+]\(.+\)/gm, "\\$&");

        return res;
    },

    createShiftedAlphabet: (alphabet, shift) => {
        const length = alphabet.length;
        shift = ((shift % length) + length) % length;

        return alphabet.slice(shift) + alphabet.slice(0, shift);
    },

    caesarCipher: (str, shift, mode = 0) => {
        const A = "A".charCodeAt(0),
            a = "a".charCodeAt(0),
            zero = "0".charCodeAt(0);

        let upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
            lower,
            digit = "0123456789";

        let alphabet;

        let split = str.split(""),
            out;

        switch (mode) {
            case 0:
                alphabet = LoaderUtils.createShiftedAlphabet(upper, shift);

                out = split.map(char => {
                    const code = char.charCodeAt(0);

                    if ("A" <= char && char <= "Z") {
                        return alphabet[code - A];
                    } else if ("a" <= char && char <= "z") {
                        return alphabet[code - a];
                    }

                    return char;
                });

                break;
            case 1:
                upper = LoaderUtils.createShiftedAlphabet(upper, shift);
                lower = upper.toLowerCase();
                digit = LoaderUtils.createShiftedAlphabet(digit, shift);

                out = split.map(char => {
                    const code = char.charCodeAt(0);

                    if ("A" <= char && char <= "Z") {
                        return upper[code - A];
                    } else if ("a" <= char && char <= "z") {
                        return lower[code - a];
                    } else if ("0" <= char && char <= "9") {
                        return digit[code - zero];
                    }

                    return char;
                });

                break;
            case 2:
                const upper_off = 0,
                    lower_off = upper_off + upper.length,
                    digit_off = lower_off + upper.length;

                lower = upper.toLowerCase();
                alphabet = LoaderUtils.createShiftedAlphabet(upper + lower + digit, shift);

                out = split.map(char => {
                    const code = char.charCodeAt(0);

                    if ("A" <= char && char <= "Z") {
                        return alphabet[code - A + upper_off];
                    } else if ("a" <= char && char <= "z") {
                        return alphabet[code - a + lower_off];
                    } else if ("0" <= char && char <= "9") {
                        return alphabet[code - zero + digit_off];
                    }

                    return char;
                });

                break;
            default:
                throw new UtilError("Invalid mode: " + mode, mode);
        }

        return out.join("");
    },

    clamp: (x, a, b) => {
        a ??= -Infinity;
        b ??= Infinity;

        return Math.max(Math.min(x, b), a);
    },

    round: (num, digits) => {
        const exp = 10 ** digits;
        return Math.round((num + Number.EPSILON) * exp) / exp;
    },

    smallRound: (num, digits) => {
        const tresh = 1 / 10 ** digits;

        if (Math.abs(num) <= tresh) {
            digits = -Math.floor(Math.log10(Math.abs(num)));
        }

        return LoaderUtils.round(num, digits);
    },

    approxEquals: (a, b, epsilon = Number.EPSILON) => {
        return Math.abs(a - b) <= epsilon;
    },

    deviate: (x, y) => {
        return x + (Math.random() * (2 * y) - y);
    },

    countDigits: (num, base = 10) => {
        if (num === 0) {
            return 1;
        }

        const log = Math.log(Math.abs(num)) / Math.log(base);
        return Math.floor(log) + 1;
    },

    length: obj => {
        return obj?.length ?? obj?.size ?? 0;
    },

    stringLength: obj => {
        return obj == null ? 0 : String(obj).length;
    },

    maxLength: (arr, length = "string") => {
        let lengthFunc;

        switch (length) {
            case "array":
                lengthFunc = LoaderUtils.length;
                break;
            case "string":
                lengthFunc = LoaderUtils.stringLength;
                break;
            default:
                throw new UtilError("Invalid length function: " + length);
        }

        return Math.max(...arr.map(x => lengthFunc(x)));
    },

    empty: obj => {
        return LoaderUtils.length(obj) === 0;
    },

    single: obj => {
        return LoaderUtils.length(obj) === 1;
    },

    multiple: obj => {
        return LoaderUtils.length(obj) > 1;
    },

    firstElement: (arr, start = 0) => {
        return arr[start];
    },

    lastElement: (arr, start = 0) => {
        return arr[arr.length + start - 1];
    },

    afterElement: (array, start = 0) => {
        return array.slice(start + 1);
    },

    randomElement: (arr, a = 0, b = arr.length) => {
        return arr[a + ~~(Math.random() * (b - a))];
    },

    concat: (a, ...args) => {
        const concatenated = [].concat(a, ...args);

        if (Array.isArray(a)) {
            return concatenated;
        }

        return concatenated.join("");
    },

    split: (arr, callback) => {
        return arr.reduce(
            (acc, item, i) => {
                if (callback(item, i)) {
                    acc[0].push(item);
                } else {
                    acc[1].push(item);
                }

                return acc;
            },
            [[], []]
        );
    },

    zip: (arr1, arr2) => {
        const len = Math.min(arr1.length, arr2.length);
        return Array.from({ length: len }, (_, i) => [arr1[i], arr2[i]]);
    },

    sort: (array, callback) => {
        const useCallback = typeof callback === "function";

        return array.sort((a, b) => {
            const a_val = useCallback ? callback(a) : a,
                b_val = useCallback ? callback(b) : b;

            return a_val.localeCompare(b_val, "en", {
                numeric: true,
                sensitivity: "base"
            });
        });
    },

    unique: (array, propName) => {
        const hasPropName = typeof propName === "string",
            getProp = hasPropName ? obj => obj[propName] : obj => obj;

        const seen = new Set();

        return array.filter(item => {
            const val = getProp(item);

            if (seen.has(val)) {
                return false;
            }

            seen.add(val);
            return true;
        });
    },

    _regexEscapeRegex: /[.*+?^${}()|[\]\\]/g,
    escapeRegex: str => {
        return str.replace(LoaderUtils._regexEscapeRegex, "\\$&");
    },

    _charClassExcapeRegex: /[-\\\]^]/g,
    escapeCharClass: str => {
        return str.replace(LoaderUtils._charClassExcapeRegex, "\\$&");
    },

    firstGroup: (match, name) => {
        if (!match) {
            return;
        }

        const groups = Object.keys(match.groups).filter(key => typeof match.groups[key] !== "undefined"),
            foundName = groups.find(key => key.startsWith(name));

        if (typeof foundName === "undefined") {
            return;
        }

        return match.groups[foundName];
    },

    _templateReplaceRegex: /(?<!\\){{(.*?)}}(?!\\)/g,
    templateReplace: (template, strings) => {
        return template.replace(LoaderUtils._templateReplaceRegex, (match, key) => {
            key = key.trim();
            return strings[key] ?? match;
        });
    },

    urlRegex: /(\S*?):\/\/(?:([^/.]+)\.)?([^/.]+)\.([^/\s]+)\/?(\S*)?/,

    validUrl: url => {
        return LoaderUtils._validUrlRegex.test(url);
    },

    _tagNameRegex: /^[A-Za-z0-9\-_]+$/,
    validTagName: name => {
        return name.length > 0 && name.length <= 32 && LoaderUtils._tagNameRegex.test(name);
    },

    _userIdRegex: /\d{17,20}/g,
    findUserIds: str => {
        const matches = Array.from(str.matchAll(LoaderUtils._userIdRegex));
        return matches.map(match => match[0]);
    },

    _mentionRegex: /<@(\d{17,20})>/g,
    findMentions: str => {
        const matches = Array.from(str.matchAll(LoaderUtils._mentionRegex));
        return matches.map(match => match[1]);
    },

    codeblockRegex: /(?<!\\)(?:`{3}([\S]+\n)?([\s\S]*?)`{3}|`([^`\n]+)`)/g,

    findCodeblocks: str => {
        const matches = str.matchAll(LoaderUtils.codeblockRegex);
        return Array.from(matches).map(match => [match.index, match.index + match[0].length]);
    },

    parseScript: script => {
        const match = script.match(LoaderUtils._parseScriptRegex);

        if (!match) {
            return [false, script, ""];
        }

        const body = (match[2] ?? match[3])?.trim();

        if (typeof body === "undefined") {
            return [false, script, ""];
        }

        const lang = match[1]?.trim() ?? "";
        return [true, body, lang];
    },

    _msgUrlRegex:
        /^(?:(https?:)\/\/)?(?:(www|ptb)\.)?discord\.com\/channels\/(?<sv_id>\d{18,19}|@me)\/(?<ch_id>\d{18,19})(?:\/(?<msg_id>\d{18,19}))$/,
    parseMessageUrl: url => {
        const match = url.match(LoaderUtils._msgUrlRegex);

        if (!match) {
            return;
        }

        const groups = match.groups;

        return {
            protocol: match[1] ?? "",
            subdomain: match[2] ?? "",

            serverId: groups.sv_id,
            channelId: groups.ch_id,
            messageId: groups.msg_id
        };
    },

    _attachUrlRegex:
        /^(?<prefix>(?:(https?:)\/\/)?(cdn|media)\.discordapp\.(com|net)\/attachments\/(?<sv_id>\d+)\/(?<ch_id>\d+)\/(?<filename>.+?)(?<ext>\.[^.?]+)?(?=\?|$))\??(?:ex=(?<ex>[0-9a-f]+)&is=(?<is>[0-9a-f]+)&hm=(?<hm>[0-9a-f]+))?.*$/,
    parseAttachmentUrl: url => {
        const match = url.match(LoaderUtils._attachUrlRegex);

        if (!match) {
            return;
        }

        const groups = match.groups;

        const filename = groups.filename,
            ext = groups.ext ?? "";

        return {
            prefix: groups.prefix,
            protocol: match[2] ?? "",
            subdomain: match[3],
            tld: match[4],

            serverId: groups.sv_id,
            channelId: groups.ch_id,

            filename,
            ext,
            file: filename + ext,

            search: groups.search ? "?" + groups.search : "",
            ex: groups.ex,
            is: groups.is,
            hm: groups.hm
        };
    },

    discordEpoch: 1420070400000,

    snowflakeFromDate: date => {
        const timestamp = date.getTime() - LoaderUtils.discordEpoch,
            snowflakeBits = BigInt(timestamp) << 22n;

        return snowflakeBits.toString(10);
    },

    dateFromSnowflake: snowflake => {
        const snowflakeBits = BigInt.asUintN(64, snowflake),
            timestamp = Number(snowflakeBits >> 22n);

        return new Date(timestamp + LoaderUtils.discordEpoch);
    },

    fetchAttachment: (msg, returnType = FileDataTypes.text, allowedContentTypes) => {
        let attach, url;
        let attachInfo, contentType;

        if (typeof msg.file !== "undefined") {
            attach = msg.file;
        } else if (msg.attachments?.length > 0) {
            attach = msg.attachments[0];
        }

        if (typeof msg.fileUrl !== "undefined") {
            url = msg.fileUrl;
        } else if (typeof attach !== "undefined") {
            url = attach.url;
            contentType = attach.contentType;
        }

        if (typeof url === "undefined") {
            throw new UtilError("Message doesn't have any attachments");
        }

        if (typeof allowedContentTypes !== "undefined") {
            if (typeof allowedContentTypes === "string") {
                allowedContentTypes = [allowedContentTypes];
            }

            attachInfo = msg.attachInfo ?? LoaderUtils.parseAttachmentUrl(url);

            let extChecked = false,
                ctChecked = false;

            let extAllowed = false,
                ctAllowed = false;

            for (const type of allowedContentTypes) {
                if (type.startsWith(".")) {
                    if (!extChecked) {
                        if (typeof attachInfo === "undefined")
                            throw new UtilError("Extension can only be validated for attachment URLs");
                        extChecked = true;
                    }

                    if (attachInfo.ext === type) {
                        extAllowed = true;
                        break;
                    }
                } else {
                    if (!ctChecked) {
                        if (typeof contentType === "undefined")
                            throw new UtilError("Attachment doesn't have a content type");
                        ctChecked = true;
                    }

                    if (contentType.includes(type)) {
                        ctAllowed = true;
                        break;
                    }
                }
            }

            if (extChecked && !extAllowed) {
                throw new UtilError("Invalid file extension: " + attachInfo.ext, attachInfo.ext);
            }

            if (ctChecked && !ctAllowed) {
                throw new UtilError("Invalid content type: " + contentType, contentType);
            }
        }

        const data = ModuleLoader.getModuleCodeFromUrl(url, returnType, {
            cache: false
        });

        return { data, contentType };
    },

    dumpTags: search => {
        const all = util.dumpTags();

        if (typeof search === "string") {
            return all.filter(name => name.includes(search));
        } else if (search instanceof RegExp) {
            return all.filter(name => search.test(name));
        }

        return all;
    },

    fullDump: (search, options = {}) => {
        const excludedNames = options.excludedNames ?? [],
            excludedUsers = options.excludedUsers ?? [],
            fixTags = options.fixTags ?? true;

        const enableNameBlacklist = excludedNames.length > 0,
            enableUserBlacklist = excludedUsers.length > 0;

        let all = LoaderUtils.dumpTags(search);

        if (enableNameBlacklist) {
            all = all.filter(name =>
                excludedNames.every(bl => {
                    if (bl instanceof RegExp) return !bl.test(name);
                    else return bl !== name;
                })
            );
        }

        let tags = all.reduce((tags, name) => {
            let tag;

            try {
                tag = util.fetchTag(name);
            } catch (err) {}

            if (tag != null) {
                const userExcluded = enableUserBlacklist && excludedUsers.includes(tag.owner);
                if (!userExcluded && tag.owner !== config.tagOwner) tags.push(tag);
            }

            return tags;
        }, []);

        if (!fixTags) {
            return tags;
        }

        tags = tags.filter(tag => [tag.name, tag.body].every(prop => typeof prop === "string"));
        tags = tags.filter(tag => LoaderUtils.validTagName(tag.name));

        tags.forEach(tag => {
            tag.isAlias = tag.hops.length > 1;
            tag.aliasName = "";

            if (tag.isAlias) {
                tag.isScript = false;

                tag.name = tag.hops[0];
                tag.aliasName = tag.hops[1];
                tag.body = "";

                return;
            } else {
                tag.args = "";
            }

            const newBody = LoaderUtils.getTagBody(tag);

            tag.isScript = tag.body !== newBody;
            tag.body = newBody;
        });

        return tags;
    },

    fetchTag: (name, owner) => {
        const tag = util.fetchTag(name);

        if (tag == null) {
            throw new UtilError("Unknown tag: " + name, name);
        }

        if (typeof owner === "string" && owner.length > 0) {
            if (tag.owner !== owner) {
                throw new UtilError(`Incorrect tag owner (${tag.owner} =/= ${owner}) for tag: ${name}`, {
                    original: tag.owner,
                    needed: owner
                });
            }
        }

        return tag;
    },

    _leveretScriptBodyRegex: /^`{3}([\S]+)?\n([\s\S]+)\n`{3}$/u,
    getTagBody: tag => {
        let body = tag.body,
            match = body.match(LoaderUtils._leveretScriptBodyRegex);

        if (match && match[2]) {
            body = match[2];
        }

        return body;
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
    },

    bindArgs: (fn, boundArgs) => {
        if (!Array.isArray(boundArgs)) {
            boundArgs = [boundArgs];
        }

        return function (...args) {
            return fn.apply(this, boundArgs.concat(args));
        };
    },

    _funcArgsRegex: /(?:\()(.+)+(?:\))/,
    functionArgumentNames: func => {
        const code = func.toString(),
            match = code.match(LoaderUtils._funcArgsRegex);

        if (!match) {
            return [];
        }

        const args = match[1];
        return args.split(", ").map(arg => arg.trim());
    },

    getArgumentPositions: (func, names) => {
        const argsNames = LoaderUtils.functionArgumentNames(func),
            positions = names.map(name => argsNames.indexOf(name));

        return positions.filter(pos => pos !== -1);
    },

    isArray: arr => {
        return Array.isArray(arr) || ArrayBuffer.isView(arr);
    },

    isObject: obj => {
        return obj !== null && typeof obj === "object";
    },

    isClass: obj => {
        if (typeof obj !== "function") {
            return false;
        }

        if (obj.toString().startsWith("class")) {
            return true;
        }

        return Object.getOwnPropertyNames(obj.prototype).length > 1;
    },

    _validProp: (obj, expected) => {
        if (typeof expected === "string") {
            if (expected === "object") {
                return LoaderUtils.isObject(obj);
            } else {
                return typeof obj === expected;
            }
        }

        if (typeof expected === "function") {
            return obj instanceof expected;
        }

        if (LoaderUtils.isObject(expected)) {
            if (LoaderUtils.isObject(obj)) {
                return LoaderUtils.validateProps(obj, expected);
            } else {
                return false;
            }
        }

        throw new UtilError("Invalid expected type");
    },
    validateProps: (obj, requiredProps) => {
        for (const [name, expected] of Object.entries(requiredProps)) {
            const prop = obj[name];

            if (!LoaderUtils._validProp(prop, expected)) {
                return false;
            }
        }

        return true;
    },

    _validPropOptions: ["both", "enum", "nonenum", "keys"],
    assign: (target, source, options, props) => {
        let enumerable, nonEnumerable, both, keys;

        if (options == null) {
            options = LoaderUtils._validPropOptions.slice(0, 1);
            both = true;
        } else {
            if (!Array.isArray(options)) {
                options = [options];
            }

            if (!options.every(option => LoaderUtils._validPropOptions.includes(option))) {
                throw new UtilError("Invalid property options");
            }

            both = options.includes("both");
            keys = options.includes("keys");
        }

        if (options.length < 1) {
            throw new UtilError("Invalid property options");
        } else if (keys) {
            return Object.assign(target, source);
        } else if (both) {
            enumerable = nonEnumerable = true;
        } else {
            enumerable = options.includes("enum");
            nonEnumerable = options.includes("nonenum");

            both = enumerable && nonEnumerable;
        }

        const allDescriptors = (desc => Reflect.ownKeys(desc).map(key => [key, desc[key]]))(
            Object.getOwnPropertyDescriptors(source)
        );

        let descriptors;

        if (both) {
            descriptors = allDescriptors;
        } else if (enumerable) {
            descriptors = allDescriptors.filter(([, desc]) => desc.enumerable);
        } else if (nonEnumerable) {
            descriptors = allDescriptors.filter(([, desc]) => !desc.enumerable);
        }

        if (typeof props === "object") descriptors = descriptors.map(([key, desc]) => [key, { ...desc, ...props }]);
        descriptors = Object.fromEntries(descriptors);

        Object.defineProperties(target, descriptors);
        return target;
    },

    shallowClone: (obj, options) => {
        const clone = Object.create(Object.getPrototypeOf(obj));
        return LoaderUtils.assign(clone, obj, options);
    },

    filterObject: (obj, f1, f2) => {
        f1 ??= () => true;
        f2 ??= () => true;

        const entries = Object.entries(obj),
            filtered = entries.filter(([key, value], i) => f1(key, i) && f2(value, i));

        return Object.fromEntries(filtered);
    },

    rewriteObject: (obj, f1, f2) => {
        f1 ??= key => key;
        f2 ??= value => value;

        const entries = Object.entries(obj),
            newEntries = entries.map(([key, value], i) => [f1(key, i), f2(value, i)]);

        return Object.fromEntries(newEntries);
    },

    removeUndefinedValues: obj => {
        return Object.fromEntries(Object.entries(obj).filter(([, value]) => typeof value !== "undefined"));
    },

    reverseObject: obj => {
        return Object.fromEntriesObject.fromEntries(Object.entries(obj).map(([key, value]) => [value, key]));
    },

    _infiniteProxyHandler: {
        get(target, prop, reciever) {
            if (!Reflect.has(target, prop)) {
                const newProxy = new Proxy({}, this);
                Reflect.set(target, prop, newProxy, reciever);
            }

            return Reflect.get(target, prop, reciever);
        }
    },
    makeInfiniteObject: () => {
        return new Proxy({}, LoaderUtils._infiniteProxyHandler);
    },

    _nonConfigurableProxyHandler: {
        set(target, prop, value, reciever) {
            if (!Reflect.has(target, prop)) {
                return Reflect.defineProperty(target, prop, {
                    value,
                    writable: true,
                    enumerable: true,
                    configurable: false
                });
            } else {
                return Reflect.set(target, prop, value, reciever);
            }
        },

        defineProperty(target, prop, descriptor) {
            return Reflect.defineProperty(target, prop, {
                ...descriptor,
                configurable: false
            });
        }
    },
    makeNonConfigurableObject: (obj = {}) => {
        const newObj = {};

        Object.keys(obj).forEach(key =>
            Object.defineProperty(newObj, key, {
                value: newObj[key],
                writable: true,
                enumerable: true,
                configurable: false
            })
        );

        return new Proxy(newObj, LoaderUtils._nonConfigurableProxyHandler);
    },

    makeMirrorObject: (mirrorObj, extraObj) => {
        const resolveTarget = prop => {
            return extraObj && Reflect.has(extraObj, prop) ? extraObj : mirrorObj;
        };

        const handler = {
            get(_, prop, receiver) {
                const target = resolveTarget(prop);
                return Reflect.get(target, prop, receiver);
            },

            set(_, prop, value, receiver) {
                const target = resolveTarget(prop);
                return Reflect.set(target, prop, value, receiver);
            },

            has(_, prop) {
                return (extraObj && Reflect.has(extraObj, prop)) || Reflect.has(mirrorObj, prop);
            },

            deleteProperty(_, prop) {
                const target = resolveTarget(prop);
                return Reflect.deleteProperty(target, prop);
            },

            ownKeys() {
                const targetKeys = Reflect.ownKeys(mirrorObj),
                    extraKeys = extraObj ? Reflect.ownKeys(extraObj) : [];

                return Array.from(new Set([...targetKeys, ...extraKeys]));
            },

            getOwnPropertyDescriptor(_, prop) {
                const target = resolveTarget(prop);
                return Reflect.getOwnPropertyDescriptor(target, prop);
            },

            defineProperty(_, prop, descriptor) {
                const target = resolveTarget(prop);
                return Reflect.defineProperty(target, prop, descriptor);
            },

            preventExtensions() {
                if (extraObj) {
                    throw new UtilError("Cannot prevent extensions on a composite proxy");
                }

                return Reflect.preventExtensions(mirrorObj);
            },

            isExtensible() {
                return Reflect.isExtensible(mirrorObj) && (!extraObj || Reflect.isExtensible(extraObj));
            },

            getPrototypeOf() {
                return Reflect.getPrototypeOf(mirrorObj);
            },

            setPrototypeOf(_, proto) {
                return Reflect.setPrototypeOf(mirrorObj, proto);
            }
        };

        return new Proxy(mirrorObj, handler);
    },

    bufferIsGif: buf => {
        const header = String.fromCharCode(...buf.slice(0, 6));
        return ["GIF87a", "GIF89a"].includes(header);
    },

    parseRanges: (str, base = 16) => {
        return str.split(" ").map(range => {
            const split = range.split("-");

            const first = Number.parseInt(split[0], base),
                last = split[1] ? Number.parseInt(split[1], base) : first;

            return [first, last];
        });
    },

    isInRange: (range, value) => {
        for (const [first, last] of range) {
            if (value >= first && value <= last) return true;
        }

        return false;
    }
};

{
    LoaderUtils.alphabetUpper = LoaderUtils.alphabet.toUpperCase();
    LoaderUtils.alphanumericUpper = LoaderUtils.numbers + LoaderUtils.alphabetUpper;
    LoaderUtils.alphanumeric = LoaderUtils.numbers + LoaderUtils.alphabet + LoaderUtils.alphabetUpper;

    LoaderUtils._validNumberRegexes = new Map();

    for (let radix = 2; radix <= 36; radix++) {
        const validChars = LoaderUtils.alphanumericUpper.slice(0, radix),
            exp = new RegExp(`^[+-]?[${validChars}]+(,[${validChars}]+)*$`, "i");

        LoaderUtils._validNumberRegexes.set(radix, exp);
    }

    LoaderUtils._validUrlRegex = new RegExp(`^${LoaderUtils.urlRegex.source}$`);
    LoaderUtils._parseScriptRegex = new RegExp(`^${LoaderUtils.codeblockRegex.source}$`);

    LoaderUtils = Object.freeze(LoaderUtils);
}

const HttpUtil = Object.freeze({
    protocolRegex: /^[^/:]+:\/*$/,
    leadingSlashRegex: /^[/]+/,
    trailingSlashRegex: /[/]+$/,
    paramSlashRegex: /\/(\?|&|#[^!])/g,
    paramSplitRegex: /(?:\?|&)+/,

    joinUrl: (...parts) => {
        const input = [].slice.call(parts);

        let firstPart = input[0],
            result = [];

        if (typeof firstPart !== "string") {
            throw new TypeError("URL part must be a string");
        }

        if (HttpUtil.protocolRegex.test(firstPart) && input.length > 1) {
            firstPart = input.shift() + firstPart;
        }

        input[0] = firstPart;

        for (let i = 0; i < input.length; i++) {
            let part = input[i];

            if (typeof part !== "string") {
                throw new TypeError("URL part must be a string");
            }

            if (part.length < 1) {
                continue;
            }

            if (i > 0) {
                part = part.replace(HttpUtil.leadingSlashRegex, "");
            }

            if (i === input.length - 1) {
                part = part.replace(HttpUtil.trailingSlashRegex, "/");
            } else {
                part = part.replace(HttpUtil.trailingSlashRegex, "");
            }

            result.push(part);
        }

        let str = result.join("/");
        str = str.replace(HttpUtil.paramSlashRegex, "$1");

        const [beforeHash, afterHash] = str.split("#"),
            hash = afterHash?.length > 0 ? "#" + afterHash : "";

        let paramParts = beforeHash.split(HttpUtil.paramSplitRegex);
        paramParts = paramParts.filter(part => part.length > 0);

        const beforeParams = paramParts.shift(),
            params = (paramParts.length > 0 ? "?" : "") + paramParts.join("&");

        str = beforeParams + params + hash;
        return str;
    },

    getQueryString: params => {
        if (params == null) {
            return "";
        }

        const query = [];

        for (const [key, value] of Object.entries(params)) {
            if (value != null) {
                query.push(key + "=" + encodeURIComponent(value));
            }
        }

        if (query.length < 1) {
            return "";
        }

        const queryString = query.join("&");
        return "?" + queryString;
    },

    statusRegex: /Request failed with status code (\d+)/,
    getReqErrStatus: err => {
        if (!err.message) {
            return;
        }

        const statusStr = err.message,
            statusMatch = statusStr.match(LoaderUtils.statusRegex);

        if (!statusMatch) {
            return;
        }

        const status = Number.parseInt(statusMatch[1], 10);
        return status;
    }
});

const LoaderTextEncoder = Object.freeze({
    stringToBytes: str => {
        const bytes = new Uint8Array(str.length);

        for (let i = 0; i < str.length; i++) {
            bytes[i] = str.charCodeAt(i);
        }

        return bytes;
    },

    bytesToString: bytes => {
        let str = "";

        for (let i = 0; i < bytes.length; i++) {
            str += String.fromCharCode(bytes[i]);
        }

        return str;
    }
});

class Benchmark {
    static data = Object.create(null);
    static counts = Object.create(null);
    static timepoints = new Map();

    static getCurrentTime(ms = true) {
        let time;

        switch (this.timeToUse) {
            case "dateNow":
                time = this._Date.now();
                break;
            case "performanceNow":
                time = this._performance.now();
                break;
            case "vmTime":
                time = this._vm.getWallTime();
                break;
        }

        if (ms) {
            return this._timeToMs(time);
        } else {
            return time;
        }
    }

    static delay(ms) {
        const t2 = this.getCurrentTime() + ms;
        while (this.getCurrentTime() < t2) {}
    }

    static startTiming(key) {
        key = this._formatTimeKey(key);

        const t1 = this.getCurrentTime(false);
        this.timepoints.set(key, t1);
    }

    static restartTiming(key) {
        key = this._formatTimeKey(key);
        let t0 = this.data[key];

        if (typeof t0 === "undefined") {
            return this.startTiming(key);
        }

        delete this.data[key];
        t0 = this._msToTime(t0);

        const t1 = this.getCurrentTime(false);
        this.timepoints.set(key, t1 - t0);
    }

    static stopTiming(key, save = true) {
        key = this._formatTimeKey(key);

        if (save === null) {
            this.timepoints.delete(key);
            return NaN;
        }

        const t1 = this.timepoints.get(key);

        if (typeof t1 === "undefined") {
            return NaN;
        }

        this.timepoints.delete(key);

        const t2 = this.getCurrentTime(false),
            dt = t2 - t1;

        const ms = this._timeToMs(dt);
        if (save) this.data[key] = ms;

        return ms;
    }

    static getTime(key, format = true) {
        key = this._formatTimeKey(key);
        const time = this.data[key];

        if (!format) {
            return time ?? NaN;
        }

        if (typeof time === "undefined") {
            return `Key "${key}" not found.`;
        }

        return this._formatTime(key, time);
    }

    static deleteTime(key) {
        key = this._formatTimeKey(key);
        this.timepoints.delete(key);

        if (key in this.data) {
            delete this.data[key];
            return true;
        }

        return false;
    }

    static clear() {
        for (const key of Object.keys(this.data)) {
            delete this.data[key];
        }

        this.timepoints.clear();
        this.clearCounts();
    }

    static clearExcept(...keys) {
        const clearKeys = Object.keys(this.data).filter(key => !keys.includes(key));

        for (const key of clearKeys) {
            delete this.data[key];
        }

        this.timepoints.clear();
        this.clearCounts();
    }

    static clearExceptLast(n = 1) {
        const clearKeys = Object.keys(this.data).slice(0, -n);

        for (const key of clearKeys) {
            delete this.data[key];
        }

        this.timepoints.clear();
        this.clearCounts();
    }

    static getSum(...keys) {
        let sumTimes;

        if (keys.length > 0) {
            sumTimes = keys
                .map(key => {
                    key = this._formatTimeKey(key);
                    return this.data[key];
                })
                .filter(time => typeof time !== "undefined");
        } else {
            sumTimes = Object.values(this.data);
        }

        return sumTimes.reduce((a, b) => a + b, 0);
    }

    static getAll(...includeSum) {
        let format = LoaderUtils.lastElement(includeSum);

        if (typeof format === "boolean") {
            includeSum.pop();
        } else {
            format = true;
        }

        let useSum = includeSum.length > 0,
            sum;

        if (useSum) {
            const allKeys = includeSum[0] === true,
                keys = allKeys ? [] : includeSum;

            sum = this.getSum(...keys);
        }

        if (format) {
            const times = Object.entries(this.data).map(([key, time]) => this._formatTime(key, time));
            if (useSum) times.push(this._formatTime("sum", sum));

            return times.join(",\n");
        } else {
            const times = Object.assign({}, this.data);
            if (useSum) times["sum"] = sum;

            return times;
        }
    }

    static defineCount(name) {
        const originalName = this._formatCountOrigName(name);
        name = this._formatCountName(name);

        if (typeof this.counts[name] !== "undefined") {
            return;
        }

        this.counts[name] = 0;
        this._origCountNames.set(name, originalName);
    }

    static getCount(name, format = true) {
        name = this._formatCountName(name);
        const count = this.counts[name];

        if (!format) {
            return count ?? NaN;
        }

        const originalName = this._origCountNames.get(name);

        if (typeof count === "undefined" || typeof originalName === "undefined") {
            return `Count "${name}" not found.`;
        }

        return this._formatCount(originalName, count);
    }

    static incrementCount(name) {
        this.defineCount(name);
        name = this._formatCountName(name);

        this.counts[name]++;
        return this.counts[name];
    }

    static resetCount(name) {
        name = this._formatCountName(name);

        if (name in this.counts) {
            this.counts[name] = 0;
            return true;
        }

        return false;
    }

    static deleteCount(name) {
        name = this._formatCountName(name);

        if (name in this.counts) {
            delete this.counts[name];
            this._origCountNames.delete(name);
            this._origCountFuncs.delete(name);

            return true;
        }

        return false;
    }

    static deleteLastCountTime(name) {
        name = this._formatCountName(name);

        const count = this.counts[name],
            originalName = this._origCountNames.get(name);

        if (typeof count === "undefined" || typeof originalName === "undefined" || count < 1) {
            return false;
        }

        const timeKey = this._formatCount(originalName, count);
        this.deleteTime(timeKey);

        this.counts[name]--;
        return true;
    }

    static clearCounts() {
        for (const name of Object.keys(this.counts)) {
            this.counts[name] = 0;
        }
    }

    static wrapFunction(name, func) {
        const formattedName = this._formatCountName(name);

        this.defineCount(name);
        this._origCountFuncs.set(formattedName, func);

        const _this = this;
        return function (...args) {
            _this.incrementCount(name);
            _this.startTiming(_this.getCount(name));

            const ret = func.apply(this, args);

            _this.stopTiming(_this.getCount(name));
            return ret;
        };
    }

    static removeWrapper(name) {
        const formattedName = this._formatCountName(name);

        if (typeof this.counts[formattedName] === "undefined") {
            return `Wrapper "${name}" not found.`;
        }

        const originalFunc = this._origCountFuncs.get(formattedName);
        this.deleteCount(name);

        return originalFunc;
    }

    static _ns_per_ms = 10n ** 6n;

    static _Date = Date;
    static _performance = globalThis.performance;
    static _vm = globalThis.vm;

    static timeToUse = (() => {
        if (typeof this._performance !== "undefined") {
            return "performanceNow";
        } else if (typeof this._vm !== "undefined") {
            return "vmTime";
        } else if (typeof this._Date !== "undefined") {
            return "dateNow";
        } else {
            throw new UtilError("No suitable timing function detected");
        }
    })();

    static _origCountNames = new Map();
    static _origCountFuncs = new Map();

    static _timeToMs(time) {
        switch (this.timeToUse) {
            case "dateNow":
                return time;
            case "performanceNow":
                return Math.floor(time);
            case "vmTime":
                return Number(time / this._ns_per_ms);
        }
    }

    static _msToTime(time) {
        switch (this.timeToUse) {
            case "dateNow":
            case "performanceNow":
                return time;
            case "vmTime":
                return BigInt(time) * this._ns_per_ms;
        }
    }

    static _formatTime(key, time) {
        return `${key}: ${time.toLocaleString()}ms`;
    }

    static _formatTimeKey(key) {
        switch (typeof key) {
            case "number":
                return key.toString();
            case "string":
                return key;
            default:
                throw new UtilError("Time keys must be strings");
        }
    }

    static _formatCount(name, count) {
        return `${name}_${count}`;
    }

    static _formatCountOrigName(name) {
        if (typeof name !== "string") {
            throw new UtilError("Count names must be strings");
        }

        name = name.replaceAll(" ", "_");
        return name.toLowerCase();
    }

    static _formatCountName(name) {
        if (typeof name !== "string") {
            throw new UtilError("Count names must be strings");
        }

        name = name.replaceAll(" ", "_");
        name += "_count";
        return name.toUpperCase();
    }
}

// module loader
class ModuleCode {
    constructor(name, code, returnType) {
        this.name = name.toString() ?? "";
        this.code = code;
        this.returnType = returnType;
    }
}

class Module {
    constructor(name, id) {
        if (name instanceof Module) {
            const module = name,
                newName = id;

            this.name = newName?.toString() ?? module.name;
            this.id = module.id;
            this.exports = module.exports;
            this.loaded = module.loaded;

            return this;
        }

        if (name == null) {
            this.name = ModuleLoader._Cache.getSeqModuleName();
        } else {
            this.name = name.toString() ?? "";
        }

        this.id = id ?? "none";
        this.exports = {};
        this.loaded = false;
    }
}

class ModuleCacheManager {
    constructor() {
        this._cache = new Map();
        this._code = new Map();

        this._seqModuleId = 0;
    }

    getModuleByName(name) {
        name = name.toString();
        return this._cache.get(name);
    }

    getModuleById(id) {
        for (const module of this._cache.values()) {
            if (module.id === id) {
                return module;
            }
        }
    }

    addModule(module, newName, reload = false) {
        const name = module.name;

        if (!reload && typeof this.getModuleById(name) !== "undefined") {
            throw new LoaderError(`Module ${name} already exists`, name);
        }

        this._cache.set(name, module);

        if (typeof newName !== "undefined") {
            const newModule = new Module(module, newName);
            this._cache.set(newName, newModule);
        }
    }

    deleteModule(id) {
        if (id instanceof Module) {
            id = id.id;
        }

        for (const [key, module] of this._cache.entries()) {
            if (module.id === id) {
                this._cache.delete(key);
            }
        }
    }

    getCodeByName(name) {
        name = name.toString();
        return this._code.get(name);
    }

    addCode(code, reload = false) {
        const name = code.name;

        if (!reload && typeof this.getCodeByName(name) !== "undefined") {
            throw new LoaderError(`Module ${name} already exists`, name);
        }

        this._code.set(name, code);
    }

    deleteCode(name) {
        if (name instanceof ModuleCode) {
            name = name.name;
        } else {
            name = name.toString();
        }

        this._code.delete(name);
    }

    clearAll() {
        this._cache.clear();
        this._code.clear();
    }

    getSeqModuleName() {
        return `module_${this._seqModuleId++}`;
    }
}

class ModuleGlobalsUtil {
    static cleanGlobal = LoaderUtils.shallowClone(globalThis, "nonenum");
    static globalKeys = ["global", "globalThis"];

    static createGlobalsObject(obj) {
        obj = LoaderUtils.makeNonConfigurableObject(obj);
        return new Proxy(obj, this._globalsProxyHandler);
    }

    static _globalsProxyHandler = {
        set(target, prop, value, reciever) {
            if (typeof value === "undefined") {
                return false;
            }

            const success = Reflect.set(target, prop, value, reciever);
            if (success) Patches._loadedPatch(prop);

            return success;
        },

        defineProperty(target, prop, descriptor) {
            const success = Reflect.defineProperty(target, prop, descriptor);
            if (success) Patches._loadedPatch(prop);

            return success;
        }
    };
}

class ModuleRequireUtil {
    static fakeRequire = function (id) {
        return LoaderUtils.makeInfiniteObject();
    };

    static createFakeRequire(obj = {}) {
        return function (id) {
            if (typeof id !== "string") {
                return LoaderUtils.makeInfiniteObject();
            }

            const ret = obj[id];

            switch (typeof ret) {
                case "undefined":
                    return LoaderUtils.makeInfiniteObject();
                case "function":
                    if (!/^class[\s{]/.test(ret.toString())) {
                        return ret(id);
                    }
                default: // eslint-disable-line
                    return ret;
            }
        }.bind(this);
    }
}

class ModuleTemplateUtil {
    static moduleCodeStartLine = 3;
    static moduleCodeTemplate = `
let {{innerFnName}} = (() => {
{{moduleCode}}
});

try {
{{innerFnName}}();
return [true, null];
} catch({{errName}}) {
return [false, {{errName}}];
}

return [false, null];
`.trim();

    static addDebuggerStmt(moduleCode) {
        return `debugger;\n\n${moduleCode}`;
    }

    static wrapErrorHandling(moduleCode, names) {
        const randomNames = {
            innerFnName: "_" + LoaderUtils.randomString(32),
            errName: "_" + LoaderUtils.randomString(32)
        };

        if (typeof names === "object") {
            Object.assign(names, randomNames);
        }

        return LoaderUtils.templateReplace(this.moduleCodeTemplate, {
            moduleCode,
            ...randomNames
        });
    }
}

class ModuleStackTraceUtil {
    static indent = " ".repeat(4);

    static errLocationExp = /<anonymous>:(\d+):(\d+)\)$/;

    static getLocation(stackFrame) {
        const match = stackFrame.match(this.errLocationExp),
            lineNum = match[1] ? match[1] - ModuleTemplateUtil.moduleCodeStartLine : 0,
            columnNum = match[2] ?? 0;

        return [lineNum, columnNum];
    }

    static getNewStackFrame(stackFrame, moduleName) {
        const [lineNum, columnNum] = this.getLocation(stackFrame);

        let newStackFrame = `at (<module`;

        if (typeof moduleName === "string") {
            newStackFrame += ` ${moduleName}>)`;
        } else {
            newStackFrame += ">)";
        }

        newStackFrame += `:${lineNum}:${columnNum}`;
        return newStackFrame;
    }

    static rewriteStackTrace(err, randomNames, moduleName) {
        if (typeof err.stack !== "string") {
            return err.stack;
        }

        let stackFrames = err.stack.split("\n"),
            msgLine;

        [msgLine, ...stackFrames] = stackFrames;
        stackFrames = stackFrames.map(frame => frame.trim());

        const innerFnLine = stackFrames.findIndex(frame => frame.startsWith(`at ${randomNames.innerFnName}`));

        if (innerFnLine === -1) {
            return err.stack;
        }

        //for (let i = 0; i < innerFnLine; i++) {}

        stackFrames[innerFnLine] = this.getNewStackFrame(stackFrames[innerFnLine], moduleName);
        stackFrames.splice(innerFnLine + 1);

        const formattedFrames = stackFrames.map(frame => this.indent + frame);
        return msgLine + "\n" + formattedFrames.join("\n");
    }
}

class ModuleLoader {
    static loadSource = config.loadSource;
    static isolateGlobals = false;

    static tagOwner = null;
    static breakpoint = false;
    static enableCache = true;

    static Require = ModuleRequireUtil;

    static useDefault(...vars) {
        const cb = LoaderUtils.lastElement(vars),
            useCb = typeof cb === "function";

        let old;

        if (useCb) {
            vars.pop();
            old = {};
        }

        if (vars.length === 0) {
            vars.push(...this._tagConfigVars);
        }

        for (const name of vars) {
            if (!(name in config) || (!name) in this) {
                throw new LoaderError(`Variable ${name} doesn't exist`);
            }

            if (!this._tagConfigVars.includes(name)) {
                throw new LoaderError(`Variable ${name} can't be set`);
            }

            const defaultValue = config[name];
            if (useCb) old[name] = this[name];

            this[name] = defaultValue;
        }

        if (useCb) {
            cb();
            Object.assign(this, old);
        }
    }

    static getModuleCodeFromUrl(url, returnType = FileDataTypes.module, options = {}) {
        if (LoaderUtils.empty(url)) {
            throw new LoaderError("Invalid URL");
        }

        const name = options.name ?? url,
            cache = this.enableCache && (options.cache ?? true),
            forceReload = options.forceReload ?? false;

        const returnRes = options.returnResponse ?? false;

        if (cache && !forceReload) {
            const foundCode = this._Cache.getCodeByName(name);
            if (typeof foundCode !== "undefined") return foundCode.code;
        }

        let res = this._fetchFromUrl(url, returnType, options),
            moduleCode;

        if (returnRes) {
            res.data = this._parseModuleCode(res.data, returnType);
            moduleCode = res;
        } else {
            moduleCode = this._parseModuleCode(res, returnType);
        }

        if (cache) {
            const code = new ModuleCode(name, moduleCode, returnType);
            this._Cache.addCode(code, forceReload);
        }

        return moduleCode;
    }

    static getModuleCodeFromTag(tagName, returnType = FileDataTypes.module, options = {}) {
        if (tagName == null) {
            throw new LoaderError("Invalid tag name");
        }

        const name = options.name ?? tagName,
            cache = this.enableCache && (options.cache ?? true),
            forceReload = options.forceReload ?? false;

        if (cache && !forceReload) {
            const foundCode = this._Cache.getCodeByName(name);
            if (typeof foundCode !== "undefined") return foundCode.code;
        }

        const owner = options.owner ?? this.tagOwner,
            encoded = options.encoded ?? false,
            buf_size = options.buf_size;

        let moduleCode = this._fetchTagBody(tagName, owner, options);

        if (encoded) {
            moduleCode = this._decodeModuleCode(moduleCode, buf_size);
        }

        moduleCode = this._parseModuleCode(moduleCode, returnType);

        if (cache) {
            const code = new ModuleCode(name, moduleCode, returnType);
            this._Cache.addCode(code, forceReload);
        }

        return moduleCode;
    }

    static getModuleCode(url, tagName, ...args) {
        switch (this.loadSource) {
            case "url":
                if (url === null) {
                    return;
                }

                return this.getModuleCodeFromUrl(url, ...args);
            case "tag":
                if (tagName === null) {
                    return;
                }

                return this.getModuleCodeFromTag(tagName, ...args);
            default:
                throw new LoaderError("Invalid load source: " + this.loadSource, this.loadSource);
        }
    }

    static loadModuleFromSource(moduleCode, loadScope = {}, breakpoint = this.breakpoint, options = {}) {
        const moduleName = options.name,
            cache = this.enableCache && (options.cache ?? true),
            forceReload = options.forceReload ?? false;

        if (cache && typeof moduleName !== "undefined" && !forceReload) {
            const foundModule = this._Cache.getModuleByName(moduleName);
            if (typeof foundModule !== "undefined") return foundModule.exports;
        }

        moduleCode = moduleCode.trim();

        if (typeof moduleCode !== "string" || LoaderUtils.empty(moduleCode)) {
            throw new LoaderError("Invalid module code");
        }

        let moduleId;

        if (cache) {
            moduleId = md5(moduleCode);

            if (!forceReload) {
                const foundModule = this._Cache.getModuleById(moduleId);

                if (typeof foundModule !== "undefined") {
                    if (foundModule.name !== moduleName) this._Cache.addModule(foundModule, moduleName);
                    return foundModule.exports;
                }
            }
        }

        const module = new Module(moduleName, moduleId),
            exports = module.exports;

        if (cache) this._Cache.addModule(module, undefined, forceReload);

        const isolateGlobals = options.isolateGlobals ?? this.isolateGlobals,
            wrapErrors = true;

        const randomNames = {};

        if (breakpoint) moduleCode = ModuleTemplateUtil.addDebuggerStmt(moduleCode);
        if (wrapErrors) moduleCode = ModuleTemplateUtil.wrapErrorHandling(moduleCode, randomNames);

        const moduleObjs = {
            module,
            exports
        };

        const newLoadScope = {},
            loadGlobals = {},
            customGlobalKeys = [];

        for (const [key, obj] of Object.entries(loadScope)) {
            if (obj === null || typeof obj !== "object") {
                newLoadScope[key] = obj;
                continue;
            }

            if (obj.globalHolder === true) {
                customGlobalKeys.push(key);
            } else if ("value" in obj) {
                if (obj.global === true) {
                    loadGlobals[key] = obj.value;
                } else {
                    newLoadScope[key] = obj.value;
                }
            } else {
                newLoadScope[key] = obj;
            }
        }

        const filteredGlobals = LoaderUtils.removeUndefinedValues({ ...globals, ...loadGlobals }),
            filteredScope = LoaderUtils.removeUndefinedValues(newLoadScope);

        let originalGlobal, patchedGlobal;

        if (isolateGlobals) {
            originalGlobal = LoaderUtils.shallowClone(globalThis, "enum");

            patchedGlobal = LoaderUtils.shallowClone(ModuleGlobalsUtil.cleanGlobal);
            Object.assign(patchedGlobal, filteredGlobals);
        } else {
            patchedGlobal = LoaderUtils.makeMirrorObject(globalThis, filteredGlobals);
        }

        const newGlobalKeys = ModuleGlobalsUtil.globalKeys.concat(customGlobalKeys),
            patchedGlobalParams = Object.fromEntries(newGlobalKeys.map(key => [key, patchedGlobal]));

        const scopeObj = {
            ...moduleObjs,
            ...patchedGlobalParams,
            ...filteredScope
        };

        if (isolateGlobals) {
            try {
                Patches.removeFromGlobalContext("nondefault");
            } catch (err) {
                if (err instanceof TypeError) {
                    throw new LoaderError(
                        "You're not allowed to have functions defined via the function keyword or vars in the same scope as the load call. Use an object or an IIFE to isolate them."
                    );
                } else {
                    throw err;
                }
            }

            Patches.patchGlobalContext(patchedGlobal);
        } else {
            Object.assign(scopeObj, filteredGlobals);
        }

        const loadParams = Object.keys(scopeObj),
            loadArgs = Object.values(scopeObj);

        const cleanup = () => {
            if (isolateGlobals) {
                Patches.removeFromGlobalContext("nondefault");
                Patches.patchGlobalContext(originalGlobal);
            }

            if (cache && !module.loaded) this._Cache.deleteModule(module);
        };

        if (wrapErrors) {
            const loaderFn = new Function(loadParams, moduleCode);

            const [loaded, err] = loaderFn(...loadArgs);
            module.loaded = loaded;

            cleanup();

            if (err !== null) {
                err.stack = ModuleStackTraceUtil.rewriteStackTrace(err, randomNames, module.name);
                throw new LoaderError(`Error occured while loading module ${module.name}.`, err);
            }
        } else {
            try {
                const loaderFn = new Function(loadParams, moduleCode);
                loaderFn(...loadArgs);

                module.loaded = true;
            } finally {
                cleanup();
            }
        }

        return module.exports;
    }

    static loadModuleFromUrl(url, options = {}) {
        const [codeArgs, loadArgs] = this._getLoadArgs(url, options);

        const cache = this.enableCache && (options.cache ?? true),
            forceReload = options.forceReload ?? false;

        const isModule = (options.returnType ?? FileDataTypes.module) === FileDataTypes.module;

        if (cache && isModule && !forceReload) {
            const foundModule = this._Cache.getModuleByName(url);
            if (typeof foundModule !== "undefined") return foundModule.exports;
        }

        const moduleCode = this.getModuleCodeFromUrl(url, ...codeArgs);

        if (!isModule) return moduleCode;
        return this.loadModuleFromSource(moduleCode, ...loadArgs);
    }

    static loadModuleFromTag(tagName, options = {}) {
        const [codeArgs, loadArgs] = this._getLoadArgs(tagName, options);

        const cache = this.enableCache && (options.cache ?? true),
            forceReload = options.forceReload ?? false;

        const isModule = (options.returnType ?? FileDataTypes.module) === FileDataTypes.module;

        if (cache && isModule && !forceReload) {
            const foundModule = this._Cache.getModuleByName(tagName);
            if (typeof foundModule !== "undefined") return foundModule.exports;
        }

        const moduleCode = this.getModuleCodeFromTag(tagName, ...codeArgs);

        if (!isModule) return moduleCode;
        return this.loadModuleFromSource(moduleCode, ...loadArgs);
    }

    static loadModule(url, tagName, options) {
        switch (this.loadSource) {
            case "url":
                if (url == null) {
                    throw new LoaderError("No URL provided");
                }

                return this.loadModuleFromUrl(url, options);
            case "tag":
                if (tagName == null) {
                    throw new LoaderError("No tag name provided");
                }

                return this.loadModuleFromTag(tagName, options);
            default:
                throw new LoaderError("Invalid load source: " + this.loadSource, this.loadSource);
        }
    }

    static clearCache() {
        return this._Cache.clearAll();
    }

    static _tagConfigVars = ["loadSource", "isolateGlobals", "tagOwner"];

    static _Cache = new ModuleCacheManager();

    static _fetchFromUrl(url, returnType, options = {}) {
        let responseType;

        switch (returnType) {
            case FileDataTypes.text:
            case FileDataTypes.json:
            case FileDataTypes.module:
                responseType = "text";
                break;
            case FileDataTypes.binary:
                responseType = "arraybuffer";
                break;
        }

        const configReqOpts = options.requestOptions,
            parseError = options.parseError ?? true,
            returnRes = options.returnResponse ?? false;

        const opts = {
            url,
            method: "get",
            responseType,
            ...configReqOpts
        };

        let res;

        try {
            res = http.request(opts);
        } catch (err) {
            if (!parseError) {
                throw err;
            }

            const status = HttpUtil.getReqErrStatus(err);

            if (status) {
                throw new LoaderError("Could not fetch file. Code: " + status, status);
            } else {
                throw new LoaderError("Could not fetch file. Error: " + err.message);
            }
        }

        return returnRes ? res : res.data;
    }

    static _fetchTagBody(tagName, owner, options = {}) {
        const useName = typeof tagName === "string",
            useArray = Array.isArray(tagName),
            usePattern = tagName instanceof RegExp;

        let body;

        if (useName) {
            if (tagName == null) {
                throw new LoaderError("Invalid tag name");
            }

            const tag = LoaderUtils.fetchTag(tagName, owner);
            body = LoaderUtils.getTagBody(tag);
        } else {
            let tagNames;

            if (useArray) {
                tagNames = tagName;
            } else if (usePattern) {
                tagNames = LoaderUtils.dumpTags(tagName);
            } else {
                throw new LoaderError("Invalid tag name");
            }

            tagNames.sort((a, b) =>
                a.localeCompare(b, "en", {
                    numeric: true
                })
            );

            const tags = tagNames
                .map(name => {
                    try {
                        return LoaderUtils.fetchTag(name, owner);
                    } catch (err) {
                        if (err.name === "UtilError") {
                            return null;
                        }

                        throw err;
                    }
                })
                .filter(tag => tag != null);

            if (LoaderUtils.empty(tags)) {
                throw new LoaderError(`No matching tag(s) found: ${tagName}`, tagName);
            }

            body = tags.map(tag => LoaderUtils.getTagBody(tag)).join("");
        }

        return body;
    }

    static _parseModuleCode(moduleCode, returnType) {
        switch (returnType) {
            case FileDataTypes.text:
            case FileDataTypes.module:
                if (LoaderUtils.isArray(moduleCode)) {
                    return LoaderTextEncoder.bytesToString(moduleCode);
                }

                return moduleCode;
            case FileDataTypes.json:
                let jsonString = moduleCode;

                if (LoaderUtils.isArray(jsonString)) {
                    jsonString = LoaderTextEncoder.bytesToString(moduleCode);
                }

                return JSON.parse(jsonString);
            case FileDataTypes.binary:
                if (LoaderUtils.isArray(moduleCode)) {
                    return moduleCode;
                }

                return LoaderTextEncoder.stringToBytes(moduleCode);
            default:
                throw new LoaderError("Unknown return type: " + returnType, returnType);
        }
    }

    static _decodeModuleCode(moduleCode, buf_size) {
        if (wasmDecoderLoaded) {
            if (typeof fastDecodeBase2n === "undefined") {
                throw new LoaderError("WASM Base2n decoder not initialized");
            }

            buf_size ??= Math.ceil(moduleCode.length * 1.66);
            return fastDecodeBase2n(moduleCode, buf_size);
        } else {
            if (typeof decodeBase2n === "undefined") {
                throw new LoaderError("Base2n decoder not initialized");
            } else if (typeof table === "undefined") {
                throw new LoaderError("Base2n table not initialized");
            }

            return decodeBase2n(moduleCode, table, {
                predictSize: true
            });
        }
    }

    static _getLoadArgs(name, options) {
        if (typeof options !== "object") {
            throw new LoaderError("Options must be an object");
        }

        const commonOpts = {
            name: options.name ?? name,
            cache: options.cache,
            forceReload: options.forceReload
        };

        const codeOpts = {
            ...commonOpts,

            requestOptions: options.requestOptions,
            parseError: options.parseError,
            returnResponse: options.returnResponse,

            owner: options.owner,
            encoded: options.encoded,
            buf_size: options.buf_size
        };

        const loadOpts = {
            ...commonOpts,

            isolateGlobals: options.isolateGlobals
        };

        const codeArgs = [options.returnType, codeOpts],
            loadArgs = [options.scope, options.breakpoint, loadOpts];

        return [codeArgs, loadArgs];
    }
}

{
    ModuleLoader._fetchFromUrl = Benchmark.wrapFunction("url_fetch", ModuleLoader._fetchFromUrl);
    ModuleLoader._fetchTagBody = Benchmark.wrapFunction("tag_fetch", ModuleLoader._fetchTagBody);
    ModuleLoader.loadModuleFromSource = Benchmark.wrapFunction("module_load", ModuleLoader.loadModuleFromSource);
}

// globals
const globals = ModuleGlobalsUtil.createGlobalsObject({
    setTimeout: undefined,
    setImmediate: undefined,
    clearTimeout: undefined,
    clearImmediate: undefined,

    console: undefined,

    Promise: undefined,
    Buffer: undefined,
    TextEncoder: undefined,
    TextDecoder: undefined,
    Blob: undefined,
    XMLHttpRequest: undefined,
    Event: undefined,
    Worker: undefined,
    ImageData: undefined
});

const globalObjs = ModuleGlobalsUtil.createGlobalsObject();

// patches
const Patches = {
    polyfillConsole: () => {
        globals.console ??= new Logger(true, consoleOpts);
    },

    polyfillTimers: () => {
        globals.setTimeout ??= f => {
            f();
            return 0;
        };

        globals.setImmediate ??= f => {
            f();
            return 0;
        };

        globals.clearTimeout ??= _ => {};
        globals.clearImmediate ??= _ => {};
    },

    polyfillPromise: () => {
        globals.Promise ??= ModuleLoader.loadModule(
            urls.PromisePolyfillUrl,
            tags.PromisePolyfillTagName,

            {
                cache: false /*,
                breakpoint: config.enableDebugger */
            }
        );
    },

    polyfillBuffer: () => {
        if (typeof globals.Buffer !== "undefined") return;

        const { Buffer } = ModuleLoader.loadModule(
            urls.BufferPolyfillUrl,
            tags.BufferPolyfillTagName,

            {
                cache: false /*,
                breakpoint: config.enableDebugger */
            }
        );

        globals.Buffer = Buffer;
    },

    polyfillTextEncoderDecoder: () => {
        if (typeof globals.TextDecoder !== "undefined") return;

        const { TextEncoder, TextDecoder } = ModuleLoader.loadModule(
            urls.TextEncoderDecoderPolyfillUrl,
            tags.TextEncoderDecoderPolyfillTagName,

            {
                scope: globals.Buffer
                    ? undefined
                    : {
                          Buffer: {
                              global: true,
                              value: false
                          }
                      },

                cache: false /*,
                breakpoint: config.enableDebugger */
            }
        );

        globals.TextEncoder = TextEncoder;
        globals.TextDecoder = TextDecoder;
    },

    polyfillBlob: () => {
        globals.Blob ??= class Blob {
            constructor(data) {
                this.data = data;
            }

            text() {
                if (typeof this.data === "string") {
                    return globals.Promise.resolve(this.data);
                }

                const str = LoaderTextEncoder.bytesToString(this.data);
                return globals.Promise.resolve(str);
            }

            startsWith() {
                return true;
            }
        };
    },

    polyfillXHR: () => {
        globals.XMLHttpRequest ??= class XMLHttpRequest {};
    },

    polyfillEvent: () => {
        globals.Event ??= class Event {
            constructor(type) {
                this.type = type;
            }
        };
    },

    polyfillWebWorker: () => {
        if (typeof globals.Worker !== "undefined") return;

        const { default: Worker } = ModuleLoader.loadModule(
            urls.WebWorkerPolyfillUrl,
            tags.WebWorkerPolyfillTagName,

            {
                scope: {
                    document: {},
                    window: { navigator: {} },
                    self: {
                        requestAnimationFrame: _ => false
                    }
                },

                cache: false /*,
                breakpoint: config.enableDebugger */
            }
        );

        globals.Worker = Worker;
    },

    polyfillImageData: () => {
        globals.ImageData ??= class ImageData {
            constructor(data, width, height) {
                this.data = data;
                this.width = width;
                this.height = height;
            }
        };
    },

    patchWasmModule: () => {
        if (WebAssembly.patchedModule === true) return;

        const original = WebAssembly.Module;

        WebAssembly.Module = Benchmark.wrapFunction("wasm_compile", bufferSource => new original(bufferSource));
        WebAssembly.Module.prototype = original.prototype;

        Patches._origWasmModule = original;
        WebAssembly.patchedModule = true;
    },

    patchWasmInstantiate: () => {
        if (WebAssembly.patchedInstantiate === true) return;

        const original = WebAssembly.instantiate,
            originalModule = Patches._origWasmModule;

        WebAssembly.instantiate = Benchmark.wrapFunction("wasm_instantiate", (bufferSource, importObject) => {
            let wasmModule;

            if (bufferSource instanceof WebAssembly.Module) {
                wasmModule = bufferSource;
            } else {
                wasmModule = new originalModule(bufferSource);
            }

            const instance = new WebAssembly.Instance(wasmModule, importObject);

            return Promise.resolve({
                module: wasmModule,
                instance
            });
        });

        Patches._origWasmInstantiate = original;
        WebAssembly.patchedInstantiate = true;
    },

    patchGlobalContext: objs => {
        if (objs === null || typeof objs !== "object") {
            throw new LoaderError("Invalid patch objects");
        }

        LoaderUtils.assign(globalThis, objs, "enum", {
            configurable: true
        });
    },

    removeFromGlobalContext: keys => {
        if (typeof keys === "string") {
            const option = keys;

            switch (option) {
                case "nondefault":
                    keys = Object.keys(globalThis);
                    break;
                default:
                    throw new LoaderError("Invalid removal option: " + option, option);
            }
        } else if (!Array.isArray(keys)) {
            throw new LoaderError("Invalid removal keys");
        }

        for (const key of keys) {
            if (key !== "global") delete globalThis[key];
        }
    },

    addContextGlobals: objs => {
        if (typeof objs === "object") {
            LoaderUtils.assign(globals, objs, "enum");
        }

        Patches._safePatchGlobals(globals);
    },

    addGlobalObjects: (library = config.loadLibrary) => {
        globalObjs.CustomError ??= CustomError;
        globalObjs.RefError ??= RefError;
        globalObjs.ExitError ??= ExitError;

        globalObjs.Benchmark ??= Benchmark;
        globalObjs.HttpUtil ??= HttpUtil;
        globalObjs.LoaderUtils ??= LoaderUtils;
        globalObjs.LoaderTextEncoder ??= LoaderTextEncoder;
        globalObjs.exit ??= exit;

        globalObjs.FileDataTypes ??= FileDataTypes;
        globalObjs.ModuleLoader ??= ModuleLoader;

        globalObjs.Patches ??= {
            globals,
            clearLoadedPatches: Patches.clearLoadedPatches,
            apply: Patches.apply,
            patchGlobalContext: Patches.patchGlobalContext,
            addContextGlobals: Patches.addContextGlobals
        };

        if (!("loadSource" in globalObjs)) {
            Object.defineProperty(globalObjs, "loadSource", {
                get: function () {
                    return ModuleLoader.loadSource;
                },
                enumerable: true
            });
        }

        globalObjs.enableDebugger ??= config.enableDebugger;

        switch (library) {
            case "none":
                break;
            case "canvaskit":
                break;
            case "resvg":
                break;
            case "libvips":
                break;
            case "lodepng":
                break;
            default:
                throw new LoaderError("Unknown library: " + library, library);
        }

        Patches._safePatchGlobals(globalObjs);
    },

    apply: (...patches) => {
        Benchmark.restartTiming("apply_patches");

        const patchFuncs = patches.map(patch => {
            const err = new LoaderError("Unknown patch: " + patch, patch);

            if (!Patches._patchPrefixes.some(prefix => patch.startsWith(prefix))) {
                throw err;
            }

            const func = Patches[patch];

            if (typeof func !== "function" || func.length > 0) {
                throw err;
            }

            return func;
        });

        Patches.clearLoadedPatches();
        patchFuncs.forEach(func => func());
        Patches.addContextGlobals();

        Benchmark.stopTiming("apply_patches");
    },

    applyAll: (library = config.loadLibrary) => {
        let timeKey = "apply_patches";

        if (library !== config.loadLibrary) {
            timeKey += `_${library.toLowerCase()}`;
        }

        Benchmark.restartTiming(timeKey);

        Patches.clearLoadedPatches();

        Patches.polyfillConsole();
        Patches.polyfillTimers();

        switch (library) {
            case "none":
                break;
            case "canvaskit":
                Patches.polyfillPromise();
                break;
            case "resvg":
                Patches.polyfillPromise();
                Patches.polyfillBuffer();
                Patches.polyfillTextEncoderDecoder();
                break;
            case "libvips":
                Patches.polyfillPromise();
                Patches.polyfillBuffer();
                Patches.polyfillTextEncoderDecoder();
                Patches.polyfillBlob();
                Patches.polyfillXHR();
                Patches.polyfillEvent();
                Patches.polyfillWebWorker();
                break;
            case "lodepng":
                if (config.useWasmBase2nDecoder) {
                    Patches.polyfillPromise();
                }

                Patches.polyfillImageData();
                break;
            default:
                Benchmark.stopTiming(timeKey, null);
                throw new LoaderError("Unknown library: " + library, library);
        }

        Patches.addContextGlobals();
        Patches.addGlobalObjects(library);

        Patches.patchWasmModule();
        Patches.patchWasmInstantiate();

        Benchmark.stopTiming(timeKey);
    },

    checkGlobalPolyfill(name, msg) {
        if (typeof globals[name] === "undefined") {
            const customMsg = msg ? msg + " " : "";
            throw new LoaderError(`${customMsg}${name} polyfill not loaded`, name);
        }
    },

    _loadedPatches: [],
    _patchPrefixes: ["patch", "polyfill"],

    _loadedPatch: (...names) => {
        for (const name of names) {
            if (!Patches._loadedPatches.includes(name)) {
                Patches._loadedPatches.push(name);
            }
        }
    },

    clearLoadedPatches: () => {
        Patches._loadedPatches.length = 0;
    },

    _safePatchGlobals: objs => {
        const loadedObjs = {};

        for (const prop of Object.keys(objs)) {
            if (Patches._loadedPatches.includes(prop)) {
                const descriptor = Object.getOwnPropertyDescriptor(objs, prop);
                Object.defineProperty(loadedObjs, prop, descriptor);
            }
        }

        Patches.patchGlobalContext(loadedObjs);
    }
};

// misc loader
let wasmDecoderLoaded = false;

function loadBase2nDecoder() {
    function loadJsBase2nDecoder(charset = "normal") {
        if (typeof globalThis.decodeBase2n !== "undefined") return;
        Benchmark.startTiming("load_decoder");

        const { base2n } = ModuleLoader.loadModule(
            null,
            tags.Base2nTagName,

            {
                /* breakpoint: config.enableDebugger */
            }
        );

        if (typeof base2n === "undefined") return;

        let charsetRanges,
            sortRanges = true;

        switch (charset) {
            case "normal":
                charsetRanges = String.fromCodePoint(
                    0x0021,
                    0xd7ff,
                    0xe000,
                    0xe000 - (0xd7ff - 0x0021 + 1) + 2 ** 20 - 1
                );
                break;
            case "linear":
                charsetRanges = charset = String.fromCodePoint(0x10000, 0x10000 + 2 ** 20 - 1);
                break;
            case "base64":
                charsetRanges = "AZaz09++//";
                sortRanges = false;
                break;
            default:
                throw new LoaderError("Unknown charset: " + charset, charset);
        }

        const table = base2n.Base2nTable.generate(charsetRanges, {
            tableType: base2n.Base2nTableTypes.typedarray,
            generateTables: [base2n.Base2nTableNames.decode],
            sortRanges
        });

        const originalDecode = base2n.decodeBase2n,
            patchedDecode = Benchmark.wrapFunction("decode", originalDecode);

        Patches.patchGlobalContext({
            ...base2n,
            decodeBase2n: patchedDecode,
            table
        });

        Benchmark.stopTiming("load_decoder");
    }

    function unloadJsBase2nDecoder() {
        const keys = Object.keys(globalThis).filter(key => {
            key = key.toLowerCase();
            return key.includes("base2n") && !key.includes("fast");
        });
        keys.push("table");

        Patches.removeFromGlobalContext(keys);
    }

    function loadWasmBase2nDecoder() {
        if (typeof globalThis.fastDecodeBase2n !== "undefined") return;
        Patches.checkGlobalPolyfill("Promise", "Can't load WASM Base2n decoder.");

        Benchmark.startTiming("load_wasm_decoder");

        const Base2nWasmDec = ModuleLoader.loadModule(
            null,
            tags.Base2nWasmWrapperTagName,

            {
                scope: {
                    CustomError
                },

                cache: false /*,
                breakpoint: config.enableDebugger */
            }
        );

        if (typeof Base2nWasmDec === "undefined") return;

        const DecoderInit = ModuleLoader.loadModule(
            null,
            tags.Base2nWasmInitTagName,

            {
                cache: false /*,
                breakpoint: config.enableDebugger */
            }
        );

        const decoderWasm = ModuleLoader.getModuleCode(null, tags.Base2nWasmWasmTagName, FileDataTypes.binary, {
            encoded: true,
            cache: false
        });

        Base2nWasmDec.init(DecoderInit, decoderWasm);

        const originalDecode = Base2nWasmDec.decodeBase2n.bind(Base2nWasmDec),
            patchedDecode = Benchmark.wrapFunction("decode", originalDecode);

        console.replyWithLogs("warn");

        Patches.patchGlobalContext({
            fastDecodeBase2n: patchedDecode
        });

        wasmDecoderLoaded = true;
        Benchmark.stopTiming("load_wasm_decoder");
    }

    const base2nCharset = config.useWasmBase2nDecoder ? "base64" : "normal";

    loadJsBase2nDecoder(base2nCharset);

    if (config.useWasmBase2nDecoder) {
        loadWasmBase2nDecoder();
        unloadJsBase2nDecoder();
    }
}

function loadXzDecompressor() {
    if (typeof globalThis.XzDecompressor !== "undefined") return;
    Benchmark.startTiming("load_xz_decompressor");

    const XzDecompressor = ModuleLoader.loadModule(
        null,
        tags.XzDecompressorTagName,

        {
            cache: false /*,
            breakpoint: config.enableDebugger */
        }
    );

    if (typeof XzDecompressor === "undefined") return;

    const xzWasm = ModuleLoader.getModuleCode(null, tags.XzWasmTagName, FileDataTypes.binary, {
        encoded: true,
        buf_size: 13 * 1024,
        cache: false
    });

    XzDecompressor.loadWasm(xzWasm);

    const originalDecompress = XzDecompressor.decompress,
        patchedDecompress = Benchmark.wrapFunction("xz_decompress", originalDecompress);
    XzDecompressor.decompress = patchedDecompress;

    Patches.patchGlobalContext({ XzDecompressor });

    Benchmark.stopTiming("load_xz_decompressor");
}

function loadZstdDecompressor() {
    if (typeof globalThis.ZstdDecompressor !== "undefined") return;
    Benchmark.startTiming("load_zstd_decompressor");

    const ZstdDecompressor = ModuleLoader.loadModule(
        null,
        tags.ZstdDecompressorTagName,

        {
            cache: false /*,
            breakpoint: config.enableDebugger */
        }
    );

    if (typeof ZstdDecompressor === "undefined") return;

    const zstdWasm = ModuleLoader.getModuleCode(null, tags.ZstdWasmTagName, FileDataTypes.binary, {
        encoded: true,
        buf_size: 50 * 1024,
        cache: false
    });

    ZstdDecompressor.loadWasm(zstdWasm);

    const originalDecompress = ZstdDecompressor.decompress,
        patchedDecompress = Benchmark.wrapFunction("zstd_decompress", originalDecompress);
    ZstdDecompressor.decompress = patchedDecompress;

    Patches.patchGlobalContext({ ZstdDecompressor });

    Benchmark.stopTiming("load_zstd_decompressor");
}

// canvaskit loader
function loadCanvasKit() {
    if (typeof globalThis.CanvasKit !== "undefined") return;
    Benchmark.startTiming("load_canvaskit");

    const CanvasKitInit = ModuleLoader.loadModule(
        urls.CanvasKitLoaderUrl,
        tags.CanvasKitLoaderTagName,

        {
            cache: false,
            breakpoint: config.enableDebugger
        }
    );

    console.replyWithLogs("warn");

    let wasmTagName, buf_size;

    if (features.useXzDecompressor) {
        wasmTagName = tags.CanvasKitWasm1TagName;
        buf_size = 2100 * 1024;
    } else if (features.useZstdDecompressor) {
        wasmTagName = tags.CanvasKitWasm2TagName;
        buf_size = 2300 * 1024;
    }

    let wasm = ModuleLoader.getModuleCode(urls.CanvasKitWasmUrl, wasmTagName, FileDataTypes.binary, {
        encoded: true,
        buf_size,
        cache: false
    });

    if (ModuleLoader.loadSource === "tag") {
        if (features.useXzDecompressor) {
            wasm = XzDecompressor.decompress(wasm);
        } else if (features.useZstdDecompressor) {
            wasm = ZstdDecompressor.decompress(wasm);
        }
    }

    Benchmark.startTiming("canvaskit_init");
    let CanvasKit;
    CanvasKitInit({
        wasmBinary: wasm
    })
        .then(ck => (CanvasKit = ck))
        .catch(err => console.error("Error occured while loading CanvasKit:", err));
    Benchmark.stopTiming("canvaskit_init");

    console.replyWithLogs("warn");

    Patches.patchGlobalContext({ CanvasKit });

    Benchmark.stopTiming("load_canvaskit");
}

// resvg loader
function loadResvg() {
    if (typeof globalThis.Resvg !== "undefined") return;
    Benchmark.startTiming("load_resvg");

    const ResvgInit = ModuleLoader.loadModule(
        urls.ResvgLoaderUrl,
        tags.ResvgLoaderTagName,

        {
            cache: false,
            breakpoint: config.enableDebugger
        }
    );

    console.replyWithLogs("warn");

    let wasm = ModuleLoader.getModuleCode(urls.ResvgWasmUrl, tags.ResvgWasmTagName, FileDataTypes.binary, {
        encoded: true,
        buf_size: 700 * 1024,
        cache: false
    });

    if (ModuleLoader.loadSource === "tag") {
        wasm = XzDecompressor.decompress(wasm);
    }

    Benchmark.startTiming("resvg_init");
    try {
        ResvgInit.initWasm(wasm);
    } catch (err) {
        console.error("Error occured while loading resvg:", err);
    }
    Benchmark.stopTiming("resvg_init");

    console.replyWithLogs("warn");

    Patches.patchGlobalContext({ Resvg: ResvgInit.Resvg });

    Benchmark.stopTiming("load_resvg");
}

// libvips loader
function loadLibVips() {
    if (typeof globalThis.vips !== "undefined") return;
    Benchmark.startTiming("load_libvips");

    const initCode = ModuleLoader.getModuleCode(urls.LibVipsLoaderUrl, tags.LibVipsLoaderTagName);

    const LibVipsInit = ModuleLoader.loadModuleFromSource(
        initCode,

        {
            navigator: {
                hardwareConcurrency: 1
            },
            document: {},
            self: {
                location: {
                    href: new Blob(initCode)
                }
            },
            clearInterval: _ => 1
        },

        config.enableDebugger,
        {
            cache: false
        }
    );

    console.replyWithLogs("warn");

    let wasm = ModuleLoader.getModuleCode(urls.LibVipsWasmUrl, tags.LibVipsWasmTagName, FileDataTypes.binary, {
        encoded: true
    });

    if (ModuleLoader.loadSource === "tag") {
        wasm = XzDecompressor.decompress(wasm);
    }

    Benchmark.startTiming("libvips_init");
    let vips;
    LibVipsInit({
        wasmBinary: wasm,
        dynamicLibraries: []
    })
        .then(lib => (vips = lib))
        .catch(err => console.error("Error occured while loading LibVips:", err));
    Benchmark.stopTiming("libvips_init");

    console.replyWithLogs("warn");

    Patches.patchGlobalContext({ vips });

    Benchmark.stopTiming("load_libvips");
}

// lodepng loader
function loadLodepng() {
    if (typeof globalThis.lodepng !== "undefined") return;
    Benchmark.startTiming("load_lodepng");

    const wasm = ModuleLoader.getModuleCode(urls.LodepngWasmUrl, tags.LodepngWasmTagName, FileDataTypes.binary, {
        encoded: true
    });

    const fakeRequire = ModuleRequireUtil.createFakeRequire({
        path: {
            join: (...args) => {}
        },

        fs: {
            readFileSync: (path, options) => wasm
        },

        "@canvas/image-data": globals.ImageData
    });

    const lodepng = ModuleLoader.loadModule(
        urls.LodepngInitUrl,
        tags.LodepngInitTagName,

        {
            scope: {
                require: fakeRequire,
                __dirname: ""
            },

            cache: false,
            breakpoint: config.enableDebugger
        }
    );

    console.replyWithLogs("warn");

    Patches.patchGlobalContext({ lodepng });

    Benchmark.stopTiming("load_lodepng");
}

// main
function mainPatch(loadLibrary) {
    if (Array.isArray(loadLibrary)) {
        loadLibrary.forEach(Patches.applyAll);
    } else {
        Patches.applyAll(loadLibrary);
    }

    Patches.clearLoadedPatches();
}

const loadFuncLibs = ["none"];

function mainLoadMisc(loadLibrary) {
    function decideMiscConfig(library) {
        switch (library) {
            case "none":
                break;
            case "canvaskit":
                features.useBase2nDecoder = true;

                if (config.forceXzDecompressor) {
                    features.useXzDecompressor = true;
                } else {
                    features.useZstdDecompressor = true;
                }

                break;
            case "resvg":
                features.useBase2nDecoder = true;
                features.useXzDecompressor = true;
                break;
            case "libvips":
                features.useBase2nDecoder = true;
                features.useXzDecompressor = true;
                break;
            case "lodepng":
                features.useBase2nDecoder = true;
                break;
            default:
                throw new LoaderError("Unknown library: " + library, library);
        }
    }

    if (Array.isArray(loadLibrary)) {
        if (loadLibrary.every(library => loadFuncLibs.includes(library))) {
            features.useLoadFuncs = true;
        }

        loadLibrary.forEach(decideMiscConfig);
    } else {
        if (loadFuncLibs.includes(loadLibrary)) {
            features.useLoadFuncs = true;
        }

        decideMiscConfig(loadLibrary);
    }

    if (ModuleLoader.loadSource === "tag") {
        if (features.useBase2nDecoder) {
            loadBase2nDecoder();
        }

        if (features.useXzDecompressor) {
            loadXzDecompressor();
        }

        if (features.useZstdDecompressor) {
            loadZstdDecompressor();
        }
    }
}

function mainLoadLibrary(loadLibrary) {
    function subLoadLibrary(library) {
        switch (library) {
            case "none":
                break;
            case "canvaskit":
                loadCanvasKit();
                break;
            case "resvg":
                loadResvg();
                break;
            case "libvips":
                loadLibVips();
                break;
            case "lodepng":
                loadLodepng();
                break;
            default:
                throw new LoaderError("Unknown library: " + library, library);
        }
    }

    if (Array.isArray(loadLibrary)) {
        loadLibrary.forEach(subLoadLibrary);
    } else {
        subLoadLibrary(loadLibrary);
    }
}

function addLoadFuncs() {
    const wrapLoadFunc = func => {
        return function (library) {
            ModuleLoader.useDefault(() => {
                func(library);
            });
        };
    };

    const loadFuncs = {
        loadBase2nDecoder: wrapLoadFunc(loadBase2nDecoder),
        loadXzDecompressor: wrapLoadFunc(loadXzDecompressor),
        loadZstdDecompressor: wrapLoadFunc(loadZstdDecompressor),
        loadLibrary: wrapLoadFunc(mainLoad)
    };

    Patches.patchGlobalContext(loadFuncs);
}

function mainLoad(loadLibrary) {
    Benchmark.restartTiming("load_total");

    mainPatch(loadLibrary);
    mainLoadMisc(loadLibrary);
    mainLoadLibrary(loadLibrary);

    Benchmark.stopTiming("load_total");
}

function main() {
    ModuleLoader.useDefault(() => {
        mainLoad(config.loadLibrary);
    });

    if (features.useLoadFuncs) {
        addLoadFuncs();
    }
}

function insideEval() {
    const evalExp = new RegExp(
        util.env
            ? `^.+\\n\\s+at\\s${insideEval.name}\\s\\(eval\\sat\\s.+\\)\\n\\s+at eval\\s\\(eval at\\s.+\\)`
            : `^.+\\n\\s+at\\s${insideEval.name}\\s\\(eval\\sat\\s.+?\\(eval\\sat\\s.+\\)\\n\\s+at\\seval\\s\\(eval\\sat\\s.+?\\(eval\\sat\\s.+\\)`
    );

    try {
        throw new Error();
    } catch (err) {
        return Boolean(err.stack.match(evalExp));
    }
}

try {
    if (config.enableDebugger) debugger;

    // eval check
    if (!insideEval()) {
        exit(
            msg.reply(":information_source: This is meant to be used inside eval, not as a standalone tag.", {
                embed: {
                    fields: [
                        {
                            name: "Usage examples",
                            value: usage
                        },
                        {
                            name: "Script examples",
                            value: scripts
                        },
                        {
                            name: "Docs",
                            value: docs
                        }
                    ]
                }
            })
        );
    }

    // run main
    main();

    if (config.enableDebugger) debugger;
    else exit(".");
} catch (err) {
    // output
    if (err instanceof ExitError) {
        err.message;
    } else {
        throw err;
    }
}
