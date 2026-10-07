"use strict";
/* global decodeBase2n:readonly, table:readonly, fastDecodeBase2n:readonly, fastDecodeBase127:readonly */

// config
const config = {
    loadLibrary: util.loadLibrary ?? "canvaskit",
    loadSource: util.loadSource ?? (0 ? "url" : "tag"),
    enableDebugger: util.inspectorEnabled ?? false,

    isolateGlobals: util._isolateGlobals ?? true,
    integrityChecks: util._integrityChecks ?? false,

    useWasmBase2nDecoder: util._useWasmBase2nDecoder ?? true,
    forceXzDecompressor: util._forceXzDecompressor ?? false,

    tagOwner: "883072834790916137"
};

const features = {};

function resetFeatures() {
    features.useBase64Utils = false;
    features.useBase2nDecoder = false;
    features.useBase127Decoder = false;
    features.useXzDecompressor = false;
    features.useZstdDecompressor = false;
    features.useLoadFuncs = false;
}

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

    CycdrawUrl: "https://raw.githubusercontent.com/Alex31TheDev/cycdraw/refs/heads/main/canvaskit/cycdraw.js",

    ResvgLoaderUrl: "https://files.catbox.moe/5fiy8q.js",
    ResvgWasmUrl: "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm",

    LodepngInitUrl: "https://cdn.jsdelivr.net/npm/@cwasm/lodepng@0.1.7/index.js",
    LodepngWasmUrl: "https://cdn.jsdelivr.net/npm/@cwasm/lodepng@0.1.7/lodepng.wasm",

    GifEncoderUrl: "https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.js",

    H264MP4EncoderLoaderUrl: "https://litter.catbox.moe/rm64ryry8k2yn7yx.js",
    H264MP4EncoderWasmUrl: "https://litter.catbox.moe/21fy4nilwzy2c2al.wasm",

    SatoriLoaderUrl: "https://files.catbox.moe/c2xoqd.js",
    SatoriWasmUrl: "https://files.catbox.moe/jw8hmm.wasm",

    DropflowLoaderUrl: "file:///D:/projects/nodejs/dropflow/dist/index.cjs",
    DropflowWasmUrl: "file:///D:/projects/nodejs/dropflow/dist/dropflow.wasm",

    BabelStandaloneUrl: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.28.5/babel.min.js"
};

const tags = {
    Base64TagName: "ck_base64",

    Base2nTagName: "ck_base2n",
    Base2nWasmWrapperTagName: "ck_base2nwasm_dec",
    Base2nWasmInitTagName: "ck_base2nwasm_init",
    Base2nWasmWasmTagName: "ck_base2nwasm_wasm",

    Base127WasmWrapperTagName: "ck_base127wasm_dec",
    Base127WasmWasmTagName: "ck_base127wasm_wasm",

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

    CycdrawTagName: "ck_cycdraw",

    ResvgLoaderTagName: "ck_resvg_init",
    ResvgWasmTagName: /^ck_resvg_wasm\d+$/,

    LodepngInitTagName: "ck_lodepng_init",
    LodepngWasmTagName: "ck_lodepng_wasm",

    GifEncoderTagName: "ck_gifenc",

    H264MP4EncoderLoaderTagName: /^ck_h264_mp4_enc\d+$/,
    H264MP4EncoderWasmTagName: /^ck_h264_mp4_wasm\d+$/,

    SatoriLoaderTagName: /^ck_satori_init\d+$/,
    SatoriWasmTagName: /^ck_satori_wasm\d+$/,

    DropflowLoaderTagName: /^ck_dropflow_init\d+$/,
    DropflowWasmTagName: /^ck_dropflow_wasm\d+$/,

    BabelStandaloneTagName: /^ck_babel_standalone\d+$/
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

class ReferenceError extends CustomError {
    constructor(message = "", ref, ...args) {
        super(message, ...args);
        this.ref = ref;
    }
}

class ExitError extends CustomError {}
class LoggerError extends CustomError {}

class UtilError extends ReferenceError {}

class LoaderError extends ReferenceError {
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

function deleteConfigProps() {
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
        "executeTag"
    ];

    if (globalThis.util) {
        for (const key of Object.keys(globalThis.util)) {
            if (!defaultUtilProps.includes(key)) delete globalThis.util[key];
        }
    }
}

// classes
class Logger {
    static levels = {
        info: 0,
        warn: 1,
        error: 2
    };

    static _defaultOptions = {
        level: "info",
        objIndentation: 4
    };

    constructor(enabled = true, options = {}) {
        options = ObjectUtil.setValuesWithDefaults({}, options, this.constructor._defaultOptions);

        this.enabled = enabled;
        this.options = options;

        this.level = options.level;

        this._objIndent = options.objIndentation;

        if (typeof options.formatLog === "function") {
            this._formatLog = options.formatLog.bind(this);
        }

        this.logs = [];
        this._seqLogId = 0;

        this.clearLogs();
        this._defineLogFuncs();
    }

    clearLogs() {
        this.logText = "";
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
        if (LoaderUtils.empty(this.logs)) return "";
        else if (level == null && last == null) return this.logText.slice(0, -1);

        let logs = this.logs;

        if (typeof level === "string") {
            const levelInd = Logger._getLevelIndex(level);
            logs = logs.filter(log => Logger._getLevelIndex(log.level) >= levelInd);
        }

        if (typeof last === "number") logs = logs.slice(-last);
        if (LoaderUtils.empty(logs)) return "";

        const format = logs.map(info => this._formatLog(info)).join("\n");
        return format;
    }

    replyWithLogs(level, last) {
        const logText = this.getLogs(level, last);
        if (LoaderUtils.empty(logText)) return;

        const codeBlock = LoaderUtils.codeBlock(logText);
        msg.reply(codeBlock);
    }

    static _getLevelIndex(level) {
        const levels = Object.entries(Logger.levels),
            find = levels.find(([key]) => key === level);

        if (typeof find === "undefined") {
            throw new LoggerError("Unknown logger level: " + level);
        }

        return find[1];
    }

    static _getLevelByIndex(idx) {
        const levels = Object.entries(Logger.levels),
            find = levels.find(([, value]) => value === idx);

        if (typeof find === "undefined") {
            throw new LoggerError("Unknown level index: " + idx);
        }

        return find[0];
    }

    _createEntry(level, msg, ...objs) {
        if (!this.enabled) return;

        const levelInd = Logger._getLevelIndex(level);
        if (levelInd < this._level) return;

        const info = {
            id: this._getSeqLogId(),
            level,
            timestamp: Date.now(),
            msg,
            objs
        };

        this.logs.push(info);

        const format = this._formatLog(info);
        this.logText += format + "\n";
    }

    _formatLog(info) {
        let format = `${info.level}: ${info.msg}`;

        if (!LoaderUtils.empty(info.objs)) {
            const objStrs = info.objs.map(obj => this._formatObject(obj));
            format += " " + objStrs.join(" ");
        }

        return format;
    }

    _formatObject(obj) {
        if (obj === null) return "null";
        else if (typeof obj === "undefined") return "undefined";

        switch (typeof obj) {
            case "bigint":
            case "number":
                return obj.toString(10);
            case "boolean":
                return obj.toString();
            case "string":
                return obj;
        }

        if (Array.isArray(obj)) return `[${obj.join(", ")}]`;
        else if (obj instanceof Error) return `${obj.message}\n${obj.stack}`;
        else {
            const props = Object.getOwnPropertyNames(obj);
            return JSON.stringify(obj, props, this._objIndent);
        }
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
/* eslint-disable */
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
        for (let i = 0; i < arr.length; i++) str[i] = rhex(arr[i]);
        return str.join("");
    }

    return function md5(str) {
        return hex(md5_raw(str));
    };
})();
/* eslint-enable */

let LoaderUtils = {
    md5,

    outCharLimit: util.outCharLimit ?? 1000,
    outLineLimit: util.outLineLimit ?? 6,

    durationSeconds: Object.freeze({
        milli: 1 / 1000,
        second: 1,
        minute: 60,
        hour: 3600,
        day: 86400,
        month: 2592000,
        week: 604800,
        year: 31536000
    }),

    dataBytes: Object.freeze({
        byte: 1,
        kilobyte: 1024,
        megabyte: 1048576,
        gigabyte: 1073741824,
        terabyte: 1099511627776
    }),

    numbers: "0123456789",
    alphabet: "abcdefghijklmnopqrstuvwxyz",

    random: (a, b) => {
        return a + ~~(Math.random() * (b - a));
    },

    parseInt: (str, radix = 10, defaultValue) => {
        if (typeof str !== "string" || typeof radix !== "number") return defaultValue ?? NaN;
        else if (radix < 2 || radix > 36) return defaultValue ?? NaN;

        str = str.trim();

        const exp = LoaderUtils._validNumberRegexes.get(radix);
        if (!exp.test(str)) return defaultValue ?? NaN;

        str = str.replaceAll(",", "");
        return Number.parseInt(str, radix);
    },

    truthyStrings: new Set(["true", "yes", "y", "t"]),
    falsyStrings: new Set(["false", "no", "n", "f"]),

    parseBool: (str, defaultValue) => {
        if (typeof str !== "string") return defaultValue ?? null;
        str = str.trim().toLowerCase();

        if (LoaderUtils.truthyStrings.has(str)) return true;
        else if (LoaderUtils.falsyStrings.has(str)) return false;
        else return defaultValue ?? null;
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

    splitChars: str => {
        return [...str];
    },

    _leadingSpacesRegex: /^\s*/,
    _trailingSpacesRegex: /\s*$/,
    capitalize: str => {
        str = String(str);

        const leading = str.match(LoaderUtils._leadingSpacesRegex)[0],
            trailing = str.match(LoaderUtils._trailingSpacesRegex)[0];

        const content = str.slice(leading.length, str.length - trailing.length);

        if (content.length < 1) return str;
        else {
            return leading + content[0].toUpperCase() + content.slice(1) + trailing;
        }
    },

    _camelToWordsRegex: /([a-z])([A-Z])/g,
    camelCaseToWords: str => {
        LoaderUtils._camelToWordsRegex.lastIndex = 0;

        const words = str.replace(LoaderUtils._camelToWordsRegex, "$1 $2");
        return words.toLowerCase();
    },

    camelCaseToKebab: str => {
        return LoaderUtils.camelCaseToWords(str).replaceAll(" ", "-");
    },

    _wordsToCamelRegex: /(?:^\w|[A-Z]|\b\w|\s+)/g,
    wordsToCamelCase: str => {
        str = str.toLowerCase();
        LoaderUtils._wordsToCamelRegex.lastIndex = 0;

        const camel = str.replace(LoaderUtils._wordsToCamelRegex, (match, i) =>
            match[`to${i ? "Upper" : "Lower"}Case`]()
        );

        return LoaderUtils.stripSpaces(camel);
    },

    _camelSplitRegex: /(?<!^)(?=[A-Z])/,
    splitCamelCase: str => {
        str = String(str);
        return str.split(LoaderUtils._camelSplitRegex);
    },

    hasDuplicates: (str, sep = "") => {
        if (LoaderUtils.empty(str)) return false;

        const split = sep === "" ? str : str.split(sep);
        return new Set(split).size !== split.length;
    },

    unique: (str, sep = "") => {
        if (LoaderUtils.empty(str)) return str;

        const split = sep === "" ? str : str.split(sep);
        return [...new Set(split)].join(sep);
    },

    removeStringRange: (str, i, length = 1, end = false) => {
        const last = end ? length : i + length;
        return str.slice(0, i) + str.slice(last);
    },

    replaceStringRange: (str, replacement, i, length = 1, end = false) => {
        const last = end ? length : i + length;
        return str.slice(0, i) + replacement + str.slice(last);
    },

    maskRanges: (str, ranges, mask = " ") => {
        if (!LoaderUtils.nonemptyString(str) || LoaderUtils.empty(ranges) || !LoaderUtils.nonemptyString(mask)) {
            return str;
        }

        const normalized = ranges
            .filter(range => range.length >= 2)
            .map(([start, end]) => {
                start = LoaderUtils.clamp(Math.trunc(start), 0, str.length);
                end = LoaderUtils.clamp(Math.trunc(end), 0, str.length);
                return start <= end ? [start, end] : [end, start];
            })
            .filter(([start, end]) => end > start)
            .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

        if (LoaderUtils.empty(normalized)) return str;

        let out = [],
            [maskStart, maskEnd] = normalized[0],
            lastIndex = 0;

        const pushMask = () => {
            out.push(str.slice(lastIndex, maskStart));
            out.push(mask.repeat(maskEnd - maskStart));
            lastIndex = maskEnd;
        };

        for (let i = 1; i < normalized.length; i++) {
            const [start, end] = normalized[i];

            if (start <= maskEnd) {
                maskEnd = Math.max(maskEnd, end);
                continue;
            }

            pushMask();
            maskStart = start;
            maskEnd = end;
        }

        pushMask();
        out.push(str.slice(lastIndex));

        return out.join("");
    },

    randomString: n => {
        return LoaderUtils.randomElement(LoaderUtils.alphanumeric, 0, LoaderUtils.alphanumeric.length, n).join("");
    },

    utf8ByteLength: str => {
        return LoaderTextEncoder.stringUtf8Length(str);
    },

    countChars: str => {
        return str?.length ?? 0;
    },

    countLines: str => {
        if (typeof str !== "string") return 0;

        let count = 1,
            pos = 0;

        while ((pos = str.indexOf("\n", pos)) !== -1) {
            count++;
            pos++;
        }

        return count;
    },

    getCount: (str, countType) => {
        if (!LoaderUtils.nonemptyString(countType)) {
            throw new UtilError("No count type provided");
        }

        let countFunc = null;

        switch (countType) {
            case "chars":
                countFunc = LoaderUtils.countChars;
                break;
            case "lines":
                countFunc = LoaderUtils.countLines;
                break;
            default:
                throw new UtilError("Invalid count type: " + countType, countType);
        }

        return countFunc(str);
    },

    overSizeLimits: (obj, charLimit, lineLimit) => {
        if (obj == null) return false;

        if (typeof charLimit === "number") {
            const count = LoaderUtils.countChars(obj);
            if (count > charLimit) return [count, null];
        }

        if (typeof lineLimit === "number") {
            const count = LoaderUtils.countLines(obj);
            if (count > lineLimit) return [null, count];
        }

        return false;
    },

    splitAt: (str, sep = " ") => {
        const idx = str.indexOf(sep);

        let first, second;

        if (idx === -1) {
            first = str;
            second = "";
        } else {
            first = str.slice(0, idx);
            second = str.slice(idx);
        }

        return [first, second];
    },

    _splitArgsDefaults: {
        sep: [" ", "\n"],
        n: 1
    },
    splitArgs: (str, lowercase = false, options = {}) => {
        let multipleLowercase = Array.isArray(lowercase);

        if (!multipleLowercase && TypeTester.isObject(lowercase)) {
            options = ObjectUtil.guaranteeObject(lowercase);

            lowercase = options.lowercase ?? false;
            multipleLowercase = Array.isArray(lowercase);
        }

        options = ObjectUtil.setValuesWithDefaults({}, options, LoaderUtils._splitArgsDefaults);

        const lowercaseFirst = multipleLowercase ? lowercase[0] ?? false : lowercase,
            lowercaseSecond = multipleLowercase ? lowercase[1] ?? false : false;

        let { sep, n } = options;

        if (LoaderUtils.empty(sep)) {
            return [lowercaseFirst ? str.toLowerCase() : str, ""];
        } else sep = ArrayUtil.guaranteeArray(sep);

        let idx = -1,
            sepLength;

        if (LoaderUtils.single(sep)) {
            sep = sep[0] ?? sep;

            idx = str.indexOf(sep);
            sepLength = sep.length;

            if (n > 1) {
                for (let i = 1; i < n; i++) {
                    idx = str.indexOf(sep, idx + 1);
                    if (idx === -1) break;
                }
            }
        } else {
            const escaped = sep.map(item => RegexUtil.escapeRegex(item)),
                exp = new RegExp(escaped.join("|"), "g");

            exp.lastIndex = 0;
            if (n <= 1) {
                const match = exp.exec(str);

                if (match) {
                    idx = match.index;
                    sepLength = match[0].length;
                }
            } else {
                let match;

                for (let i = 1; (match = exp.exec(str)) !== null; i++) {
                    if (i === n) {
                        idx = match.index;
                        sepLength = match[0].length;

                        break;
                    } else if (i > n) {
                        idx = -1;
                        break;
                    }
                }
            }
        }

        let first, second;

        if (idx === -1) {
            first = str;
            second = "";
        } else {
            first = str.slice(0, idx);
            second = str.slice(idx + sepLength);
        }

        return [lowercaseFirst ? first.toLowerCase() : first, lowercaseSecond ? second.toLowerCase() : second];
    },

    _trimStringDefaults: {
        tight: false,
        showDiff: false
    },
    trimString: (str, charLimit, lineLimit, options = {}) => {
        if (typeof str !== "string") return str;

        options = ObjectUtil.setValuesWithDefaults({}, options, LoaderUtils._trimStringDefaults);

        const { tight, showDiff } = options;

        let oversized = options.oversized;

        if (oversized == null) oversized = LoaderUtils.overSizeLimits(str, charLimit, lineLimit);
        if (!oversized) return str;

        const [chars, lines] = oversized;

        if (chars !== null) {
            if (showDiff) {
                const getSuffix = limit => {
                    const diff = chars - limit,
                        s = diff > 1 ? "s" : "";

                    return ` ... (${diff} more character${s})`;
                };

                let suffix, trimmed;

                if (tight) {
                    let newLimit = charLimit;

                    do {
                        newLimit--;

                        trimmed = str.slice(0, newLimit);
                        suffix = getSuffix(newLimit);
                    } while (trimmed.length + suffix.length > charLimit && newLimit > 0);

                    if (suffix.length > charLimit) suffix = "...";
                } else {
                    trimmed = str.slice(0, charLimit);
                    suffix = getSuffix(charLimit);
                }
                return (trimmed + suffix).trim();
            } else {
                const newLimit = tight ? LoaderUtils.clamp(charLimit - 3, 0) : charLimit,
                    trimmed = str.slice(0, newLimit);

                return trimmed + "...";
            }
        } else if (lines !== null) {
            if (showDiff) {
                let split = str.split("\n"),
                    trimmed = split.slice(0, lineLimit).join("\n");

                const diff = lines - lineLimit,
                    s = diff > 1 ? "s" : "";

                let suffix = ` ... (${diff} more line${s})`;

                if (tight) {
                    if (suffix.length > charLimit) suffix = "...";

                    const newLimit = LoaderUtils.clamp(charLimit - suffix.length, 0);
                    trimmed = trimmed.slice(0, newLimit);
                }

                return (trimmed + suffix).trim();
            } else {
                let split = str.split("\n"),
                    trimmed = split.slice(0, lineLimit).join("\n");

                if (tight) {
                    const newLimit = LoaderUtils.clamp(charLimit - 3, 0);
                    trimmed = trimmed.slice(0, newLimit);
                }

                return trimmed + "...";
            }
        }
    },

    findNthCharacter: (str, char, n) => {
        let idx = -1;

        for (; n > 0; n--) {
            idx = str.indexOf(char, idx + 1);
            if (idx === -1) return -1;
        }

        return idx;
    },

    hasPrefix: (prefixes, str) => {
        if (typeof str !== "string") return false;

        prefixes = [].concat(prefixes);
        return prefixes.some(prefix => str.startsWith(prefix));
    },

    exceedsLimits: str => {
        return LoaderUtils.overSizeLimits(str, LoaderUtils.outCharLimit, LoaderUtils.outLineLimit);
    },

    length: obj => {
        return obj?.length ?? obj?.size ?? 0;
    },

    stringLength: obj => {
        return obj == null ? 0 : String(obj).length;
    },

    getLength: (val, lengthType) => {
        if (!LoaderUtils.nonemptyString(lengthType)) {
            throw new UtilError("No length type provided");
        }

        let lengthFunc = null;

        switch (lengthType) {
            case "array":
                lengthFunc = LoaderUtils.length;
                break;
            case "string":
                lengthFunc = LoaderUtils.stringLength;
                break;
            default:
                throw new UtilError("Invalid length type: " + lengthType, lengthType);
        }

        return lengthFunc(val);
    },

    nonemptyString: str => {
        return typeof str === "string" && str.length > 0;
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

    first: (val, start = 0, n = 1) => {
        if (val == null) return n > 1 ? [] : undefined;
        return n > 1 ? val.slice(start, start + n) : val[start];
    },

    last: (val, end = 0, n = 1) => {
        return n > 1 ? val.slice(-end - n, -end || undefined) : val.at(-end - 1);
    },

    after: (val, start = 0, n = -1) => {
        return n > 0 ? val.slice(start + 1, start + 1 + n) : val.slice(start + 1);
    },

    before: (val, end = 0, n = -1) => {
        return n > 0 ? val.slice(Math.max(0, end - n), end) : val.slice(0, end);
    },

    randomElement: (val, a = 0, b = val.length, n = 1) => {
        return n > 1 ? Array.from({ length: n }, () => val[LoaderUtils.random(a, b)]) : val[LoaderUtils.random(a, b)];
    },

    setFirst(array, value, start = 0) {
        array[start] = value;
        return array;
    },

    setLast(array, value, end = 0) {
        array[array.length - end - 1] = value;
        return array;
    },

    setAfter(array, value, start = 0) {
        array.splice(start + 1, value.length, ...value);
        return array;
    },

    setRandomElement(array, value, a = 0, b = array.length) {
        array[a + ~~(Math.random() * (b - a))] = value;
        return array;
    },

    codeBlock: (str, lang) => {
        let formatted = LoaderUtils.empty(lang) ? "```\n" : `\`\`\`${lang}\n`;
        formatted += str + "```";

        return LoaderUtils.exceedsLimits(formatted) ? str : formatted;
    },

    _escapeMarkdownDefaults: {
        codeBlock: true,
        inlineCode: true,
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        spoiler: true,
        codeBlockContent: true,
        inlineCodeContent: true,
        escape: true,
        heading: true,
        bulletedList: true,
        numberedList: true,
        maskedLink: true
    },
    escapeMarkdown: (text, options = {}) => {
        options = ObjectUtil.setValuesWithDefaults({}, options, LoaderUtils._escapeMarkdownDefaults);

        const {
            codeBlock,
            inlineCode,
            bold,
            italic,
            underline,
            strikethrough,
            spoiler,
            codeBlockContent,
            inlineCodeContent,
            escape,
            heading,
            bulletedList,
            numberedList,
            maskedLink
        } = options;

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
        if (num === 0) return 0;

        const tresh = 1 / 10 ** digits;
        if (Math.abs(num) <= tresh) digits = -Math.floor(Math.log10(Math.abs(num)));

        return LoaderUtils.round(num, digits);
    },

    approxEquals: (a, b, epsilon = Number.EPSILON) => {
        return Math.abs(a - b) <= epsilon;
    },

    deviate: (x, y) => {
        return x + (Math.random() * (2 * y) - y);
    },

    countDigits: (num, base = 10) => {
        if (num === 0) return 1;

        const log = Math.log(Math.abs(num)) / Math.log(base);
        return Math.floor(log) + 1;
    },

    numberToBytes: num => {
        if (!Number.isSafeInteger(num) || num < 0) return null;

        const bytes = new Uint8Array(num === 0 ? 0 : Math.ceil(LoaderUtils.countDigits(num, 2) / 8));

        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = num % 0x100;
            num = Math.floor(num / 0x100);
        }

        return bytes;
    },

    bytesToNumber: bytes => {
        let num = 0,
            place = 1;

        for (let i = 0; i < bytes.length; i++) {
            num += bytes[i] * place;
            place *= 0x100;
        }

        return num;
    },

    urlRegex: /(\S*?):\/\/(?:([^/.]+)\.)?([^/.]+)\.([^/\s]+)\/?(\S*)?/,

    validUrl: url => {
        return LoaderUtils._validUrlRegex.test(url);
    },

    timeDelta: (d1, d2, div = 1) => {
        let t1 = d1.getTime?.() ?? d1,
            t2 = d2.getTime?.() ?? d2;

        if ([typeof d1, typeof d2].includes("bigint")) {
            t1 = BigInt(t1);
            t2 = BigInt(t2);
            div = BigInt(div);

            const dt = (t2 - t1) / div;
            return dt < 0n ? -dt : dt;
        } else {
            t1 = Number(t1);
            t2 = Number(t2);

            const dt = (t2 - t1) / div;
            return Math.round(Math.abs(dt));
        }
    },

    _durationDefaults: {
        format: false,
        largestOnly: false,
        largestN: 0,
        whitelist: [],
        blacklist: ["milli"]
    },
    duration: (delta, options) => {
        options = ObjectUtil.setValuesWithDefaults({}, options, LoaderUtils._durationDefaults);

        const { format, largestOnly, largestN } = options,
            whitelist = Array.isArray(options.whitelist) ? options.whitelist : [],
            blacklist = Array.isArray(options.blacklist) ? options.blacklist : ["milli"];

        const durationNames = Object.keys(LoaderUtils.durationSeconds).filter(name => {
                const inWhitelist = LoaderUtils.empty(whitelist) || whitelist.includes(name),
                    inBlacklist = blacklist.includes(name);

                return inWhitelist && !inBlacklist;
            }),
            durations = {};

        let seconds = delta * LoaderUtils.durationSeconds.milli;

        if (seconds < 1 && durationNames.includes("second")) durations.second = seconds;
        else {
            let hitFirst = false,
                n = 0;

            for (const name of durationNames) {
                const unitSeconds = LoaderUtils.durationSeconds[name],
                    duration = Math.floor(seconds / unitSeconds);

                if (duration > 0) {
                    hitFirst = true;
                    seconds -= duration * unitSeconds;
                    durations[name] = duration;

                    if (largestOnly) break;
                }

                if (hitFirst) n++;
                if (largestN > 0 && n >= largestN) break;
            }
        }

        if (!format) return durations;

        return Object.entries(durations)
            .map(([name, duration]) => {
                const durationText = LoaderUtils.formatNumber(duration),
                    suffix = duration !== 1 ? "s" : "";

                return `${durationText} ${name}${suffix}`;
            })
            .join(", ");
    }
};

const ArrayUtil = Object.freeze({
    withLength: (length, callback) => {
        return Array.from({ length }, (_, i) => callback(i));
    },

    guaranteeArray: (val, length, nullEmpty = false) => {
        if (nullEmpty && val == null) return [];
        else if (typeof length !== "number") return Array.isArray(val) ? val : [val];

        return Array.isArray(val)
            ? val.concat(new Array(LoaderUtils.clamp(length - val.length, 0)).fill())
            : new Array(length).fill(val);
    },

    guaranteeFirst: val => {
        return Array.isArray(val) ? val[0] : val;
    },

    _indexFunc: (array, item) => {
        switch (typeof item) {
            case "number":
                return item;
            case "function":
                const callback = item;
                return array.findIndex(callback);
            default:
                return array.indexOf(item);
        }
    },
    _valueFunc: callback => {
        switch (typeof callback) {
            case "string":
                const propName = callback;
                return obj => obj[propName];
            case "function":
                return callback;
            default:
                return val => val;
        }
    },

    sum: (array, callback) => {
        const getValue = ArrayUtil._valueFunc(callback);
        return array.reduce((total, item) => total + getValue(item), 0);
    },

    concat: (array, ...args) => {
        return Array.isArray(array) ? array.concat(...args) : [array, ...args].join("");
    },

    frequency: (array, callback) => {
        const getValue = ArrayUtil._valueFunc(callback);

        return array.reduce((map, item) => {
            const val = getValue(item);
            map.set(val, (map.get(val) || 0) + 1);

            return map;
        }, new Map());
    },

    hasDuplicates: (array, callback) => {
        const getValue = ArrayUtil._valueFunc(callback),
            values = array.map(item => getValue(item));

        return new Set(values).size !== values.length;
    },

    unique: (array, callback) => {
        const getValue = ArrayUtil._valueFunc(callback),
            seen = new Set();

        return array.filter(item => {
            const val = getValue(item);

            if (seen.has(val)) return false;
            else {
                seen.add(val);
                return true;
            }
        });
    },

    sameElements(arr1, arr2, strict = true, callback) {
        if (arr1.length !== arr2.length) return false;

        if (strict) {
            const getValue = ArrayUtil._valueFunc(callback);

            return arr1.every((a, i) => {
                const b = arr2[i];
                return getValue(a) === getValue(b);
            });
        }

        const aFreq = ArrayUtil.frequency(arr1, callback),
            bFreq = ArrayUtil.frequency(arr2, callback);

        if (aFreq.size !== bFreq.size) return false;

        for (const [val, count] of aFreq) {
            if (bFreq.get(val) !== count) return false;
        }

        return true;
    },

    diff: (oldArray, newArray, callback) => {
        const getValue = ArrayUtil._valueFunc(callback),
            counts = new Map();

        const shared = [],
            removed = [],
            added = [];

        for (const item of oldArray) {
            const value = getValue(item);
            counts.set(value, (counts.get(value) || 0) + 1);
        }

        for (const item of newArray) {
            const value = getValue(item),
                count = counts.get(value) || 0;

            if (count > 0) {
                counts.set(value, count - 1);
                shared.push(item);
            } else added.push(item);
        }

        for (const item of oldArray) {
            const value = getValue(item),
                count = counts.get(value) || 0;

            if (count > 0) {
                counts.set(value, count - 1);
                removed.push(item);
            }
        }

        return { shared, removed, added };
    },

    sort: (array, callback) => {
        const getValue = ArrayUtil._valueFunc(callback);

        return array.sort((a, b) => {
            const a_val = getValue(a),
                b_val = getValue(b);

            if (typeof a_val === "number" && typeof b_val === "number") {
                return a_val - b_val;
            }

            return a_val.localeCompare(b_val, undefined, {
                numeric: true,
                sensitivity: "base"
            });
        });
    },

    groupBy: (array, callback) => {
        const getValue = ArrayUtil._valueFunc(callback),
            groups = Object.create(null);

        let i = 0;

        for (const item of array) {
            const key = getValue(item, i++);

            groups[key] ??= [];
            groups[key].push(item);
        }

        return groups;
    },

    groupByMap: (array, callback) => {
        const getValue = ArrayUtil._valueFunc(callback),
            groups = new Map();

        let i = 0;

        for (const item of array) {
            const key = getValue(item, i++);
            let group = groups.get(key);

            if (typeof group === "undefined") {
                group = [];
                groups.set(key, group);
            }

            group.push(item);
        }

        return groups;
    },

    split: (array, callback) => {
        return array.reduce(
            (acc, item, i) => {
                const idx = Number(callback(item, i));

                while (acc.length <= idx) acc.push([]);
                acc[idx].push(item);

                return acc;
            },
            [[], []]
        );
    },

    zip: (arr1, arr2) => {
        const len = Math.min(arr1.length, arr2.length);
        return Array.from({ length: len }, (_, i) => [arr1[i], arr2[i]]);
    },

    maxLength: (array, lengthType = "string") => {
        return Math.max(...array.map(x => LoaderUtils.getLength(x, lengthType)));
    }
});

const RegexUtil = Object.freeze({
    _regexEscapeRegex: /[.*+?^${}()|[\]\\]/g,
    escapeRegex: str => {
        RegexUtil._regexEscapeRegex.lastIndex = 0;
        return str.replace(RegexUtil._regexEscapeRegex, "\\$&");
    },

    _charClassExcapeRegex: /[-\\\]^]/g,
    escapeCharClass: str => {
        RegexUtil._charClassExcapeRegex.lastIndex = 0;
        return str.replace(RegexUtil._charClassExcapeRegex, "\\$&");
    },

    flagsRegex: /^[gimsuy]*$/,

    validFlags: flags => {
        return RegexUtil.flagsRegex.test(flags) && !LoaderUtils.hasDuplicates(flags);
    },

    firstGroup: (match, name) => {
        if (!match || typeof match.groups === "undefined") return null;

        const foundName = Object.entries(match.groups).find(
            ([key, value]) => typeof value !== "undefined" && key.startsWith(name)
        )?.[0];

        return foundName && match.groups[foundName];
    },

    wordStart: (str, idx) => {
        const char = str[idx - 1];
        return idx <= 0 || char === " " || !LoaderUtils.alphanumeric.includes(char);
    },

    wordEnd: (str, idx) => {
        const char = str[idx + 1];
        return idx >= str.length - 1 || char === " " || !LoaderUtils.alphanumeric.includes(char);
    },

    getWordRegex: (words, flags = "gu") => {
        words = ArrayUtil.guaranteeArray(words, null, true);
        const validWords = [...new Set(words.filter(word => typeof word === "string" && !LoaderUtils.empty(word)))];

        if (LoaderUtils.empty(validWords)) return null;

        const expFlags = LoaderUtils.unique(flags.includes("u") ? flags : flags + "u"),
            patterns = validWords
                .map(word => RegexUtil.escapeRegex(word))
                .sort((a, b) => b.length - a.length || a.localeCompare(b));

        return new RegExp(`(?<![\\p{L}\\p{N}])(?:${patterns.join("|")})(?![\\p{L}\\p{N}])`, expFlags);
    },

    getMergedRegex: exps => {
        exps = Array.isArray(exps) ? exps.filter(TypeTester.isRegex) : [];
        if (LoaderUtils.empty(exps)) return null;

        const regexCtor = exps[0].constructor,
            expText = `(?:${exps.map(exp => exp.source).join(")|(?:")})`,
            expFlags = LoaderUtils.unique(exps.map(exp => exp.flags).join(""));

        return new regexCtor(expText, expFlags);
    },

    multipleReplace: (str, ...rules) => {
        if (LoaderUtils.empty(rules)) return str;

        const regexCtor = rules[0][0].constructor,
            matchInfo = [];

        for (const [regex, replacement] of rules) {
            const newFlags = LoaderUtils.unique(regex.flags + "g"),
                globalRegex = new regexCtor(regex.source, newFlags);

            globalRegex.lastIndex = 0;

            for (const match of str.matchAll(globalRegex)) {
                const start = match.index,
                    end = match.index + match[0].length;

                matchInfo.push({ regex, replacement, match, start, end });
            }
        }

        matchInfo.sort((a, b) => a.start - b.start || b.end - a.end);

        let out = [],
            lastIndex = 0;

        for (const info of matchInfo) {
            if (info.start < lastIndex) continue;

            out.push(str.slice(lastIndex, info.start));
            lastIndex = info.end;

            const fullMatch = info.match[0];
            let replaced;

            if (typeof info.replacement === "function") {
                replaced = info.replacement(fullMatch, ...info.match.slice(1), info.start, str);
            } else {
                info.regex.lastIndex = 0;
                replaced = fullMatch.replace(info.regex, info.replacement);
            }

            out.push(replaced ?? "");
        }

        out.push(str.slice(lastIndex));
        return out.join("");
    },

    _templateReplaceRegex: /(?<!\\){{(.*?)}}(?!\\)/g,
    templateReplace: (template, strings) => {
        RegexUtil._templateReplaceRegex.lastIndex = 0;

        return template.replace(RegexUtil._templateReplaceRegex, (match, key) => {
            key = key.trim();
            return strings[key] ?? match;
        });
    }
});

let DiscordUtil = {
    _tagNameRegex: /^[A-Za-z0-9\-_]+$/,
    validTagName: name => {
        return name.length > 0 && name.length <= 32 && DiscordUtil._tagNameRegex.test(name);
    },

    _userIdRegex: /\d{17,20}/g,
    findUserIds: str => {
        DiscordUtil._userIdRegex.lastIndex = 0;

        const matches = Array.from(str.matchAll(DiscordUtil._userIdRegex));
        return matches.map(match => match[0]);
    },

    _mentionRegex: /<@(\d{17,20})>/g,
    findMentions: str => {
        DiscordUtil._mentionRegex.lastIndex = 0;

        const matches = Array.from(str.matchAll(DiscordUtil._mentionRegex));
        return matches.map(match => match[1]);
    },

    codeblockRegex: /(?<!\\)(?:`{3}([\S]+\n)?([\s\S]*?)`{3}|`([^`\n]+)`)/g,

    findCodeblocks: str => {
        DiscordUtil.codeblockRegex.lastIndex = 0;

        const matches = str.matchAll(DiscordUtil.codeblockRegex);
        return Array.from(matches).map(match => [match.index, match.index + match[0].length]);
    },

    maskCodeblocks: (str, mask = " ") => {
        return LoaderUtils.maskRanges(str, DiscordUtil.findCodeblocks(str), mask);
    },

    _parseScriptResult: (body, isScript = false, lang = "") => ({ body, isScript, lang }),
    parseScript: script => {
        const match = script.match(DiscordUtil._parseScriptRegex);
        if (!match) return DiscordUtil._parseScriptResult(script);

        const body = (match[2] ?? match[3])?.trim(),
            lang = match[1]?.trim() ?? "";

        return typeof body === "undefined"
            ? DiscordUtil._parseScriptResult(script)
            : DiscordUtil._parseScriptResult(body, true, lang);
    },

    getMessageUrl: (serverId, channelId, messageId) => {
        return `https://www.discord.com/channels/${serverId}/${channelId}/${messageId}`;
    },

    _msgUrlRegex:
        /(?:(https?:)\/\/)?(?:(www|ptb)\.)?discord\.com\/channels\/(?<sv_id>\d{18,19}|@me)\/(?<ch_id>\d{18,19})(?:\/(?<msg_id>\d{18,19}))/gi,
    _msgUrlMatchResult: match => {
        if (!match) return null;

        const groups = match.groups;

        return {
            raw: match[0],
            protocol: match[1] ?? "",
            subdomain: match[2] ?? "",

            serverId: groups.sv_id,
            channelId: groups.ch_id,
            messageId: groups.msg_id
        };
    },

    parseMessageUrl: url => {
        const match = url.match(DiscordUtil._parseMessageUrlRegex);
        return DiscordUtil._msgUrlMatchResult(match);
    },

    findMessageUrls: str => {
        DiscordUtil._msgUrlRegex.lastIndex = 0;

        const matches = Array.from(str.matchAll(DiscordUtil._msgUrlRegex));
        return matches.map(match => DiscordUtil._msgUrlMatchResult(match));
    },

    _attachUrlRegex:
        /(?<prefix>(?:(https?:)\/\/)?(cdn|media)\.discordapp\.(com|net)\/attachments\/(?<sv_id>\d+)\/(?<ch_id>\d+)\/(?<filename>[^/?#\s]+?)(?<ext>\.[^.?#\s]+)?(?=\?|\s|$))\??(?:ex=(?<ex>[0-9a-f]+)&is=(?<is>[0-9a-f]+)&hm=(?<hm>[0-9a-f]+))?/giu,
    _attachUrlMatchResult: match => {
        if (!match) return null;

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

    parseAttachmentUrl: url => {
        const match = url.match(DiscordUtil._parseAttachmentUrlRegex);
        return DiscordUtil._attachUrlMatchResult(match);
    },

    findAttachmentUrls: str => {
        DiscordUtil._attachUrlRegex.lastIndex = 0;

        const matches = Array.from(str.matchAll(DiscordUtil._attachUrlRegex));
        return matches.map(match => DiscordUtil._attachUrlMatchResult(match));
    },

    discordEpoch: 1420070400000,

    snowflakeFromDate: date => {
        const timestamp = date.getTime() - DiscordUtil.discordEpoch,
            snowflakeBits = BigInt(timestamp) << 22n;

        return snowflakeBits.toString(10);
    },

    dateFromSnowflake: snowflake => {
        const snowflakeBits = BigInt.asUintN(64, snowflake),
            timestamp = Number(snowflakeBits >> 22n);

        return new Date(timestamp + DiscordUtil.discordEpoch);
    },

    _fetchAttachmentDefaults: {
        allowedContentType: [],
        allowedContentTypes: [],
        maxSize: Infinity
    },
    fetchAttachment: (msg, returnType = FileDataTypes.text, options = {}) => {
        options = ObjectUtil.setValuesWithDefaults({}, options, DiscordUtil._fetchAttachmentDefaults);

        const ctypes = [].concat(options.allowedContentType, options.allowedContentTypes);

        const maxSizeKb = Math.round(options.maxSize),
            maxSize = maxSizeKb * LoaderUtils.dataBytes.kilobyte;

        const maxSizeError = attachSize =>
            new UtilError(`The attachment can take up at most ${maxSizeKb} kb`, { attachSize, maxSizeKb });

        const attach = msg.file ?? msg.attachments?.at(0),
            url = msg.fileUrl ?? attach?.url;

        if (!LoaderUtils.nonemptyString(url)) {
            throw new UtilError("Message doesn't have any attachments");
        }

        const attachInfo = msg.attachInfo ?? DiscordUtil.parseAttachmentUrl(url),
            contentType =
                attach?.contentType ??
                (LoaderUtils.nonemptyString(attachInfo?.ext) ? HttpUtil.getContentType(attachInfo.ext) : null);

        const [ctypePrefs, extensions] = ArrayUtil.split(ctypes, type => type.startsWith("."));

        if (!LoaderUtils.empty(extensions)) {
            if (attachInfo == null || LoaderUtils.empty(attachInfo.ext)) {
                throw new UtilError("Extension can only be validated for attachment URLs");
            }

            TypeTester.normalizeEnum(attachInfo.ext, extensions, "file extension", UtilError);
        }

        if (!LoaderUtils.empty(ctypePrefs)) {
            if (contentType == null) {
                throw new UtilError("Attachment doesn't have a content type");
            } else if (!LoaderUtils.hasPrefix(ctypePrefs, contentType)) {
                throw new UtilError("Invalid content type: " + contentType, contentType);
            }
        }

        if (attach?.size > maxSize) throw maxSizeError();

        let data = ModuleLoader._fetchFromUrl(url, returnType);
        data = ModuleLoader._parseModuleCode(data, returnType);

        return { attach, body: data, contentType };
    },

    fetchTag: (name, owner) => {
        const tag = util.fetchTag(name);

        if (tag == null) {
            throw new UtilError("Unknown tag: " + name, name);
        }

        if (LoaderUtils.nonemptyString(owner) && tag.owner !== owner) {
            throw new UtilError(`Incorrect tag owner (${tag.owner} =/= ${owner}) for tag: ${name}`, {
                original: tag.owner,
                needed: owner
            });
        }

        return tag;
    },

    dumpTags: search => {
        const all = util.dumpTags();

        if (search != null) {
            return all.filter(name => {
                if (search instanceof RegExp) {
                    search.lastIndex = 0;
                    return search.test(name);
                } else {
                    return name.includes(search);
                }
            });
        } else return all;
    },

    _fullDumpDefaults: {
        excludedNames: [],
        excludedUsers: [],
        fixTags: true
    },
    fullDump: (search, options = {}) => {
        options = ObjectUtil.setValuesWithDefaults({}, options, DiscordUtil._fullDumpDefaults);

        const { excludedNames, excludedUsers, fixTags } = options;

        const enableNameBlacklist = excludedNames.length > 0,
            enableUserBlacklist = excludedUsers.length > 0;

        const isAllowed = tag => {
            if (search) {
                let matches;

                if (search instanceof RegExp) {
                    search.lastIndex = 0;
                    matches = search.test(tag.name);
                } else {
                    matches = tag.name.includes(search);
                }

                if (!matches) return false;
            }

            if (tag.owner === config.tagOwner) return false;

            if (enableNameBlacklist) {
                if (
                    excludedNames.some(bl => {
                        if (bl instanceof RegExp) {
                            bl.lastIndex = 0;
                            return bl.test(tag.name);
                        }

                        return bl === tag.name;
                    })
                )
                    return false;
            }

            if (enableUserBlacklist) {
                if (excludedUsers.includes(tag.owner)) return false;
            }

            return true;
        };

        let tags = util.dumpTags(true).filter(tag => isAllowed(tag));
        if (!fixTags) return tags;

        const validProps = tag => [tag.name, tag.body].every(prop => typeof prop === "string");
        tags = tags.filter(tag => validProps(tag) && DiscordUtil.validTagName(tag.name));

        for (const tag of tags) {
            const hasHops = Array.isArray(tag.hops) && tag.hops.length > 1;
            tag.isAlias = hasHops || LoaderUtils.nonemptyString(tag.aliasName);

            if (tag.isAlias) {
                tag.isScript = false;

                if (hasHops) {
                    tag.aliasName = tag.hops[1];
                    tag.name = tag.hops[0];
                }

                tag.body = "";
            } else {
                tag.aliasName = "";
                tag.args = "";

                const newBody = DiscordUtil.getTagBody(tag);
                tag.isScript = tag.body !== newBody;

                tag.body = newBody;
            }
        }

        return tags;
    },

    _mdDelimiters: [
        { pattern: "```", length: 3 },
        { pattern: "**", length: 2 },
        { pattern: "__", length: 2 },
        { pattern: "~~", length: 2 },
        { pattern: "||", length: 2 },
        { pattern: "*", length: 1 },
        { pattern: "_", length: 1 },
        { pattern: "`", length: 1 }
    ],
    markdownTrimString: (str, charLimit, lineLimit) => {
        let stack = [],
            contentCount = 0,
            i = 0,
            isEscaped = false;

        while (i < str.length && contentCount < charLimit) {
            if (str[i] === "\\" && !isEscaped) {
                isEscaped = true;
                i++;

                continue;
            }

            let mdFound = false;

            if (!isEscaped) {
                for (const { pattern, length } of DiscordUtil._mdDelimiters) {
                    const part = str.slice(i, i + length);

                    if (part === pattern) {
                        const hasContentAfter = part.trim().length > 0;

                        if (hasContentAfter) {
                            stack[stack.length - 1] === pattern ? stack.pop() : stack.push(pattern);
                        }

                        i += length;
                        mdFound = true;

                        break;
                    }
                }
            }

            if (!mdFound) {
                if (!isEscaped) contentCount++;

                isEscaped = false;
                i++;
            }
        }

        const suffix = stack.reverse().join("");
        return LoaderUtils.trimString(str, charLimit + 2 * suffix.length, lineLimit + 1) + suffix;
    },

    _leveretScriptBodyRegex: /^`{3}([\S]+)?\n([\s\S]+)\n`{3}$/u,
    getTagBody: tag => {
        const match = tag.body.match(DiscordUtil._leveretScriptBodyRegex);
        return match?.[2] ?? tag.body;
    },

    formatOutput: out => {
        if (out === null) return undefined;
        else if (Array.isArray(out)) return out.join(", ");

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

const FunctionUtil = Object.freeze({
    bindArgs: (fn, boundArgs) => {
        boundArgs = ArrayUtil.guaranteeArray(boundArgs);

        return function (...args) {
            return fn.apply(this, boundArgs.concat(args));
        };
    },

    _funcArgsRegex: /^[^(]*\(([^)]*)\)/,
    functionArgumentNames: func => {
        if (typeof func !== "function") return [];

        const code = func.toString(),
            match = code.match(FunctionUtil._funcArgsRegex);

        if (!match) return [];
        return match[1]
            .split(",")
            .map(arg => arg.trim())
            .filter(Boolean);
    },

    getArgumentPositions: (func, names) => {
        const argsNames = FunctionUtil.functionArgumentNames(func),
            positions = ArrayUtil.guaranteeArray(names).map(name => argsNames.indexOf(name));

        return positions.filter(pos => pos !== -1);
    }
});

const TypeTester = Object.freeze({
    isObject: obj => {
        return obj !== null && typeof obj === "object";
    },

    isArray: arr => {
        return Array.isArray(arr) || ArrayBuffer.isView(arr);
    },

    isTypedArray: arr => {
        return ArrayBuffer.isView(arr) && !(arr instanceof DataView);
    },

    isClass: obj => {
        if (typeof obj !== "function") return false;
        else if (obj.toString().startsWith("class")) return true;
        else if (!obj.prototype) return false;
        else {
            return Object.getOwnPropertyNames(obj.prototype).length > 1;
        }
    },

    isPromise: obj => {
        return typeof obj?.then === "function";
    },

    isRegex: exp => {
        return TypeTester.isObject(exp) && typeof exp.source === "string" && typeof exp.flags === "string";
    },

    className: obj => {
        if (obj == null) return "";
        else if (typeof obj === "function") {
            if (obj.name) return obj.name;
            obj = obj.prototype;
            if (obj == null) return "Function";
        } else return obj.constructor?.name ?? "";
    },

    charType: char => {
        if (typeof char !== "string" || char.length !== 1) return "invalid";
        const code = char.charCodeAt(0);

        if (code === 32) return "space";
        else if (code >= 48 && code <= 57) return "number";
        else if (code >= 65 && code <= 90) return "uppercase";
        else if (code >= 97 && code <= 122) return "lowercase";
        else return "other";
    },

    parseRanges: (str, base = 16) => {
        const split = str.split(/\s+/).filter(Boolean);
        return split.map(range => {
            const [first, last] = range.split("-").map(x => LoaderUtils.parseInt(x, base));
            return [first, last ?? first];
        });
    },

    isInRange: (value, range) => {
        return range.some(([first, last]) => value >= first && value <= last);
    },

    outOfRange(propName, min, max, ...args) {
        const hasPropName = typeof propName === "string",
            getProp = hasPropName ? obj => obj[propName] : obj => obj;

        if (!hasPropName) {
            args = [max].concat(args);

            max = min;
            min = propName;
        }

        const check = val => {
            if (val == null) return true;
            return Number.isNaN(val) || val < min || val > max;
        };

        if (args.length === 1) {
            const obj = args[0];
            return check(getProp(obj));
        } else {
            return args.find(obj => check(getProp(obj)));
        }
    },

    _normalizeEnumValues(valid) {
        if (valid instanceof Set) return valid;
        else if (TypeTester.isArray(valid)) return new Set(valid);
        else if (TypeTester.isObject(valid)) return new Set(Object.values(valid));
        else return new Set();
    },

    _missingEnumMessage(input, name, options) {
        const msg = options.missing ?? options.message ?? false;

        if (typeof msg === "function") return msg(input);
        else if (typeof msg === "boolean") return msg ? `No ${name} provided` : `Invalid ${name}`;
        else return `${msg} ${name}`;
    },

    _unknownEnumMessage(input, name, options) {
        let msg = options.unknown ?? options.message ?? false;

        if (typeof msg === "function") return msg(input);
        else if (typeof msg === "boolean") msg = msg ? "Unknown" : "Invalid";

        const out = `${msg} ${name}`;
        return options.ref === false ? out : `${out}: ${input}`;
    },

    _checkEnum(value, valid, options) {
        const input = value,
            allowEmpty = options.allowEmpty ?? false;

        if (!allowEmpty && LoaderUtils.empty(value)) return { input, state: "missing" };
        if (typeof options.normalize === "function") value = options.normalize(value);
        if (!valid.has(value)) return { input, state: "unknown" };

        return { input, value, state: null };
    },

    _throwEnum(res, name, errorClass, options) {
        switch (res.state) {
            case "missing":
                throw new errorClass(TypeTester._missingEnumMessage(res.input, name, options), res.input);
            case "unknown":
                throw new errorClass(TypeTester._unknownEnumMessage(res.input, name, options), res.input);
        }
    },

    normalizeEnum(value, valid, name = "value", errorClass = UtilError, options) {
        options = ObjectUtil.guaranteeObject(options);
        valid = TypeTester._normalizeEnumValues(valid);

        const res = TypeTester._checkEnum(value, valid, options);
        TypeTester._throwEnum(res, name, errorClass, options);

        return res.value;
    },

    normalizeEnums(values, valid, name = "value", errorClass = UtilError, options) {
        values = ArrayUtil.guaranteeArray(values);
        options = ObjectUtil.guaranteeObject(options);
        valid = TypeTester._normalizeEnumValues(valid);

        const collectInvalid = options.collectInvalid ?? false;

        const out = [],
            invalid = [];

        for (const value of values) {
            const res = TypeTester._checkEnum(value, valid, options);

            if (res.state === null) out.push(res.value);
            else if (collectInvalid) invalid.push(res.input);
            else TypeTester._throwEnum(res, name, errorClass, options);
        }

        if (!LoaderUtils.empty(invalid)) {
            throw new errorClass(TypeTester._unknownEnumMessage(invalid[0], name, options), invalid);
        }

        return out;
    },

    _validProp: (obj, expected) => {
        if (typeof expected === "string") {
            return expected === "object" ? TypeTester.isObject(obj) : typeof obj === expected;
        } else if (typeof expected === "function") {
            return obj instanceof expected;
        } else if (TypeTester.isObject(expected)) {
            return TypeTester.validateProps(obj, expected);
        } else {
            throw new UtilError("Invalid expected type provided", expected);
        }
    },
    validateProps: (obj, requiredProps) => {
        if (!TypeTester.isObject(obj)) return false;

        for (const [name, expected] of Object.entries(requiredProps)) {
            if (!Object.hasOwn(obj, name)) return false;

            const prop = obj[name];
            if (!TypeTester._validProp(prop, expected)) return false;
        }

        return true;
    },

    bufferIsGif: buf => {
        if (buf == null || buf.length < 6) return false;
        const header = LoaderTextEncoder.bytesToString(buf.slice(0, 6));
        return ["GIF87a", "GIF89a"].includes(header);
    },

    asUint8Array: data => {
        if (data instanceof Uint8Array) {
            return data;
        } else if (TypeTester.isTypedArray(data)) {
            return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        } else if (data instanceof ArrayBuffer) {
            return new Uint8Array(data);
        } else {
            throw new LoaderError("Invalid input binary");
        }
    }
});

const ObjectUtil = Object.freeze({
    filterObject: (obj, keyFunc, valFunc) => {
        keyFunc ??= () => true;
        valFunc ??= () => true;

        const entries = Object.entries(obj),
            filtered = entries.filter(([key, value], i) => keyFunc(key, i) && valFunc(value, i));

        return Object.fromEntries(filtered);
    },

    rewriteObject: (obj, keyFunc, valFunc) => {
        keyFunc ??= key => key;
        valFunc ??= value => value;

        const entries = Object.entries(obj),
            newEntries = entries.map(([key, value], i) => [keyFunc(key, i), valFunc(value, i)]);

        return Object.fromEntries(newEntries);
    },

    removeNullValues: obj => {
        return Object.fromEntries(Object.entries(obj).filter(([, value]) => value != null));
    },

    removeUndefinedValues: obj => {
        return ObjectUtil.filterObject(obj, null, value => typeof value !== "undefined");
    },

    reverseObject: obj => {
        return Object.fromEntries(Object.entries(obj).map(([key, value]) => [value, key]));
    },

    groupBy: (items, callback) => {
        return ArrayUtil.groupBy(items, callback);
    },

    guaranteeObject: (obj, fallback = {}) => {
        return TypeTester.isObject(obj) ? obj : fallback;
    },

    setValuesWithDefaults: (target, source, defaults = {}) => {
        source = ObjectUtil.guaranteeObject(source);
        const values = {};

        for (const key of Object.keys(defaults)) {
            if (source[key] != null) continue;

            let defaultValue = defaults[key];
            if (TypeTester.isObject(defaultValue)) {
                defaultValue = ObjectUtil.shallowClone(defaultValue);
            }

            values[key] = defaultValue;
        }

        return Object.assign(target, source, values);
    },

    _validPropOptions: Object.freeze(["both", "enum", "nonenum", "keys"]),
    assign: (target, source, options, props) => {
        let enumerable, nonEnumerable, both, keys;

        if (options == null) {
            options = [ObjectUtil._validPropOptions[0]];
            both = true;
        } else {
            options = TypeTester.normalizeEnums(
                ArrayUtil.guaranteeArray(options),
                ObjectUtil._validPropOptions,
                "property option"
            );

            both = options.includes("both");
            keys = options.includes("keys");
        }

        if (options.length < 1) {
            throw new UtilError("Invalid property options", ObjectUtil._validPropOptions);
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

        let descriptors = [];

        if (both) descriptors = allDescriptors;
        else {
            descriptors = allDescriptors.filter(([, desc]) => (enumerable ? desc.enumerable : !desc.enumerable));
        }

        if (TypeTester.isObject(props)) {
            descriptors = descriptors.map(([key, desc]) => [key, { ...desc, ...props }]);
        }

        descriptors = Object.fromEntries(descriptors);
        Object.defineProperties(target, descriptors);

        return target;
    },

    shallowClone: (obj, options = "keys") => {
        if (Array.isArray(obj)) return [...obj];

        const clone = Object.create(Object.getPrototypeOf(obj));
        return ObjectUtil.assign(clone, obj, options);
    },

    defineProperty(obj, factory, ...args) {
        const props = [].concat(factory(...args)).filter(Boolean);

        for (const prop of props) {
            let { propName, desc } = prop;

            if (!LoaderUtils.nonemptyString(propName) || !TypeTester.isObject(desc)) {
                throw new UtilError("Invalid property recieved from factory", prop);
            }

            desc = ObjectUtil.shallowClone(desc);
            desc.enumerable ??= false;
            desc.configurable ??= false;

            if ([desc.get, desc.set].every(val => typeof val === "undefined")) {
                desc.writable ??= false;
            } else delete desc.writable;

            Object.defineProperty(obj, propName, desc);
        }
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
        return new Proxy({}, ObjectUtil._infiniteProxyHandler);
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
                value: obj[key],
                writable: true,
                enumerable: true,
                configurable: false
            })
        );

        return new Proxy(newObj, ObjectUtil._nonConfigurableProxyHandler);
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
    }
});

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

    DiscordUtil._parseScriptRegex = new RegExp(`^${DiscordUtil.codeblockRegex.source}$`);
    DiscordUtil._parseMessageUrlRegex = new RegExp(
        `^(?:${DiscordUtil._msgUrlRegex.source})$`,
        DiscordUtil._msgUrlRegex.flags.replace("g", "")
    );
    DiscordUtil._parseAttachmentUrlRegex = new RegExp(
        `^(?:${DiscordUtil._attachUrlRegex.source})$`,
        DiscordUtil._attachUrlRegex.flags.replace("g", "")
    );
    DiscordUtil = Object.freeze(DiscordUtil);

    LoaderUtils = Object.freeze({
        ...ArrayUtil,
        ...ObjectUtil,
        ...TypeTester,
        ...DiscordUtil,
        ...FunctionUtil,
        ...RegexUtil,
        ...LoaderUtils
    });
}

const IntegrityChecker = (() => {
    let originalUtil = null,
        originalMsg = null,
        originalVm = null,
        originalHttp = null,
        originalTag = null;

    let initialized = false;

    let fnToString = null,
        objHasOwn = null,
        reflectOwnKeys = null,
        reflectGetProto = null,
        getProtoDesc = null,
        dateToString = null,
        mapHas = null;

    let nativeRegex = null;

    let allowedHostFunctionRefs = null,
        allowedConstructors = null,
        failures = null;

    const acceptedShapes = [
        /^\(\.\.\.args\)\s*=>\s*\{\s*return\s+\$0\.applySync\(undefined,\s*args,\s*\{\s*arguments:\s*\{\s*copy:\s*true\s*\}\s*\}\);\s*\}/,
        /^\(\.\.\.args\)\s*=>\s*\{\s*return\s+\$0\.applySyncPromise\(undefined,\s*args,\s*\{\s*arguments:\s*\{\s*copy:\s*true\s*\}\s*\}\);\s*\}/,
        /^\(\.\.\.args\)\s*=>\s*\{\s*const\s+res\s*=\s*\$0\.applySync\(undefined,\s*args,\s*\{\s*arguments:\s*\{\s*copy:\s*true\s*\}\s*\}\);;\s*throw\s+new\s+ManevraError__[a-zA-Z0-9]{16}\(res\);\s*\}/,
        /^\(\.\.\.args\)\s*=>\s*\{\s*return\s+executeTag\(\.\.\.args\);\s*\}/,
        /^\(\.\.\.args\)\s*=>\s*\{\s*return\s+executeTagSafe\(\.\.\.args\);\s*\}/
    ];

    const customReplyShape = /^\(text,\s*reply\)\s*=>\s*\{/;

    const expectedFunctions = [
        "util.delay",
        "util.fetchTag",
        "util.findTags",
        "util.dumpTags",
        "util.fetchMessage",
        "util.fetchMessages",
        "util.findUserById",
        "util.findUsers",
        "util.executeTag",
        "util.executeTagSafe",
        "vm.getCpuTime",
        "vm.getWallTime",
        "vm.timeElapsed",
        "vm.timeRemaining",
        "http.request",
        "msg.reply"
    ];

    const expectedUtilKeys = [
        "version",
        "env",
        "timeLimit",
        "inspectorEnabled",
        "outCharLimit",
        "outLineLimit",
        ...expectedFunctions.filter(path => path.startsWith("util.")).map(path => path.slice(5))
    ];

    const providedRootNames = ["util", "msg", "vm", "http", "tag"];

    const coreRoots = [
        globalThis.Object,
        globalThis.Function,
        globalThis.Array,
        globalThis.Number,
        globalThis.String,
        globalThis.Boolean,
        globalThis.Symbol,
        globalThis.Date,
        globalThis.RegExp,
        globalThis.Error,
        globalThis.EvalError,
        globalThis.RangeError,
        globalThis.ReferenceError,
        globalThis.SyntaxError,
        globalThis.TypeError,
        globalThis.URIError,
        globalThis.Math,
        globalThis.JSON,
        globalThis.Reflect,
        globalThis.Proxy,
        globalThis.Map,
        globalThis.Set,
        globalThis.WeakMap,
        globalThis.WeakSet,
        globalThis.ArrayBuffer,
        globalThis.SharedArrayBuffer,
        globalThis.DataView,
        globalThis.Int8Array,
        globalThis.Uint8Array,
        globalThis.Uint8ClampedArray,
        globalThis.Int16Array,
        globalThis.Uint16Array,
        globalThis.Int32Array,
        globalThis.Uint32Array,
        globalThis.Float32Array,
        globalThis.Float64Array,
        globalThis.BigInt64Array,
        globalThis.BigUint64Array,
        globalThis.BigInt,
        globalThis.Promise,
        globalThis.WebAssembly,
        globalThis.eval,
        globalThis.parseInt,
        globalThis.parseFloat,
        globalThis.isNaN,
        globalThis.isFinite,
        globalThis.decodeURI,
        globalThis.decodeURIComponent,
        globalThis.encodeURI,
        globalThis.encodeURIComponent
    ];

    function fail(msg) {
        failures.push(msg);
    }

    function getOriginalRootObjects() {
        return {
            util: originalUtil,
            msg: originalMsg,
            vm: originalVm,
            http: originalHttp,
            tag: originalTag
        };
    }

    function getLiveRootObjects() {
        const roots = getOriginalRootObjects();

        for (const rootName of providedRootNames) {
            roots[rootName] = globalThis[rootName] || roots[rootName];
        }

        return roots;
    }

    function stringIncludes(str, pat) {
        if (pat.length > str.length) return false;

        for (let startIndex = 0; startIndex <= str.length - pat.length; startIndex++) {
            let match = true;

            for (let offset = 0; offset < pat.length; offset++) {
                if (str[startIndex + offset] !== pat[offset]) {
                    match = false;
                    break;
                }
            }

            if (match) return true;
        }

        return false;
    }

    function primitiveSplit(str, delim) {
        const arr = [];

        let current = "";

        for (let charIndex = 0; charIndex < str.length; charIndex++) {
            const char = str[charIndex];

            if (char === delim) {
                arr.push(current);
                current = "";
            } else current += char;
        }

        arr.push(current);
        return arr;
    }

    function verifyToStringNative() {
        const backupPrepare = Error.prepareStackTrace;
        delete Error.prepareStackTrace;

        try {
            Function.prototype.toString.call({});
            return false;
        } catch (err) {
            if (backupPrepare != null) Error.prepareStackTrace = backupPrepare;

            const stack = err.stack || "",
                lines = primitiveSplit(stack, "\n");

            if (lines[1] == null || lines[2] == null) return false;
            if (!stringIncludes(lines[1], "toString")) return false;
            if (!stringIncludes(lines[2], "verifyToStringNative")) return false;

            return true;
        }
    }

    function checkPrx(val) {
        if (typeof val !== "object" && typeof val !== "function") return false;
        if (val == null) return false;

        const backupPrepare = Error.prepareStackTrace;
        delete Error.prepareStackTrace;

        try {
            dateToString.call(val);
        } catch (err) {
            if (backupPrepare != null) Error.prepareStackTrace = backupPrepare;

            const stack = err.stack || "";
            if (stringIncludes(stack, "Proxy.")) return true;
        }

        try {
            mapHas.call(val);
        } catch (err) {
            if (backupPrepare != null) Error.prepareStackTrace = backupPrepare;

            const stack = err.stack || "";
            if (stringIncludes(stack, "Proxy.")) return true;
        }

        return false;
    }

    function isNativeFunction(fn) {
        if (typeof fn !== "function") return false;
        if (fn !== Function.prototype && objHasOwn.call(fn, "toString")) return false;

        const str = fnToString.call(fn);

        if (!nativeRegex.test(str)) return false;
        if (checkPrx(fn)) return false;

        let isWasmConstructor = false;

        if (globalThis.WebAssembly != null) {
            const keys = reflectOwnKeys(globalThis.WebAssembly);

            for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
                const key = keys[keyIndex];

                if (fn === globalThis.WebAssembly[key]) {
                    isWasmConstructor = true;
                    break;
                }
            }
        }

        if (!allowedConstructors.has(fn) && !isWasmConstructor) {
            if (str.startsWith("class ")) return true;
            else if ("prototype" in fn) return false;
        }

        return true;
    }

    function checkFunctionShape(fn, name) {
        const str = fnToString.call(fn);

        let matched = false;

        for (let shapeIndex = 0; shapeIndex < acceptedShapes.length; shapeIndex++) {
            const acceptedShape = acceptedShapes[shapeIndex];

            if (acceptedShape.test(str)) {
                matched = true;
                break;
            }
        }

        if (!matched) fail("Function " + name + " does not match any accepted shapes: " + str);
    }

    function verifyDeepEqual(live, original, path, phase, expectedKeys) {
        const typeL = typeof live,
            typeO = typeof original;

        if (live === original) return;

        if (typeL !== typeO) fail("Type mismatch at " + path);
        if (typeL !== "object" || live == null || original == null) fail("Value mismatch at " + path);

        const keysL = reflectOwnKeys(live);
        expectedKeys ??= reflectOwnKeys(original);

        if (keysL.length < expectedKeys.length) fail("Missing keys at " + path);

        for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex++) {
            const expectedKey = expectedKeys[expectedIndex];

            let found = false;

            for (let liveIndex = 0; liveIndex < keysL.length; liveIndex++) {
                if (keysL[liveIndex] === expectedKey) {
                    found = true;
                    break;
                }
            }

            if (!found) fail("Missing property " + String(expectedKey) + " at " + path);

            if (!(path === "msg" && expectedKey === "reply" && phase === "after"))
                verifyDeepEqual(live[expectedKey], original[expectedKey], path + "." + String(expectedKey), phase);
        }
    }

    function collectFunctionRefs(val, visited) {
        if (val == null) return;

        const type = typeof val;
        if (type !== "object" && type !== "function") return;
        if (visited.has(val)) return;

        visited.add(val);
        if (type === "function") allowedHostFunctionRefs.add(val);

        let keys;

        try {
            keys = reflectOwnKeys(val);
        } catch (err) {
            return;
        }

        for (const key of keys) {
            let desc;

            try {
                desc = getProtoDesc(val, key);
            } catch (err) {
                continue;
            }

            if (desc != null && "value" in desc) collectFunctionRefs(desc.value, visited);
        }
    }

    function allowOriginalFunctions() {
        const roots = getOriginalRootObjects(),
            visited = new Set();

        for (const rootName of providedRootNames) collectFunctionRefs(roots[rootName], visited);
    }

    function traverse(val, path, visited) {
        if (val == null) return;

        const type = typeof val;
        if (type !== "object" && type !== "function") return;

        if (visited.has(val)) {
            const firstPath = visited.get(val);
            if (firstPath !== path)
                fail('Duplicate reference detected: path "' + path + '" shares reference with "' + firstPath + '"');
            return;
        }

        visited.set(val, path);
        if (checkPrx(val)) fail("Proxy detected at path: " + path);

        const proto = reflectGetProto(val);

        if (type === "function") {
            if (proto !== Function.prototype) fail("Invalid prototype on function at path: " + path);
        } else {
            if (proto !== Object.prototype && proto !== Array.prototype && proto !== null)
                fail("Invalid prototype on object/array at path: " + path);
        }

        const keys = reflectOwnKeys(val);

        for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
            const key = keys[keyIndex],
                propPath = path ? path + "." + String(key) : String(key);

            const desc = getProtoDesc(val, key);
            if (desc == null) continue;

            if (desc.get || desc.set) fail("Property getter/setter detected at path: " + propPath);

            if ("value" in desc) {
                const propVal = desc.value;
                if (typeof propVal === "function" && !allowedHostFunctionRefs.has(propVal))
                    fail("Unauthorized function found at path: " + propPath);

                traverse(propVal, propPath, visited);
            }
        }
    }

    function walkCore(obj, path, coreVisited, phase) {
        if (obj == null) return;

        if (coreVisited.has(obj)) return;
        coreVisited.add(obj);

        const keys = reflectOwnKeys(obj);

        for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
            const key = keys[keyIndex],
                propPath = path ? path + "." + String(key) : String(key);

            let value;

            try {
                const desc = getProtoDesc(obj, key);
                if (desc == null) continue;

                if (desc.get) {
                    checkCoreVal(desc.get, propPath + " <getter>", coreVisited, phase);
                    walkCore(desc.get, propPath + " <getter>", coreVisited, phase);
                }

                if (desc.set) {
                    checkCoreVal(desc.set, propPath + " <setter>", coreVisited, phase);
                    walkCore(desc.set, propPath + " <setter>", coreVisited, phase);
                }

                if ("value" in desc) value = desc.value;
                else continue;
            } catch (err) {
                continue;
            }

            checkCoreVal(value, propPath, coreVisited, phase);
        }
    }

    function checkCoreVal(value, path, coreVisited, phase) {
        if (typeof value === "function") {
            if (allowedHostFunctionRefs.has(value)) return;

            if (phase === "after" && (path === "WebAssembly.Module" || path === "WebAssembly.instantiate")) {
                if (value.patched !== true || checkPrx(value))
                    fail("WebAssembly patch has been tampered with at path: " + path);
                return;
            }

            if (phase === "after" && (path.startsWith("Promise") || path.includes("Promise"))) {
                if (checkPrx(value)) fail("Polyfilled Promise has been proxied/tampered at path: " + path);
                return;
            }

            if (!isNativeFunction(value)) fail("Non-native function found at path: " + path);

            walkCore(value, path, coreVisited, phase);
        } else if (typeof value === "object" && value != null) walkCore(value, path, coreVisited, phase);
    }

    function getRootName(root) {
        if (root === globalThis.WebAssembly) return "WebAssembly";
        if (root === globalThis.Math) return "Math";
        if (root === globalThis.JSON) return "JSON";
        if (root === globalThis.Reflect) return "Reflect";

        return root.name || "coreRoot";
    }

    function verifyBootstrap() {
        const bootstrapHelpers = [
            fnToString,
            objHasOwn,
            reflectOwnKeys,
            reflectGetProto,
            getProtoDesc,
            dateToString,
            mapHas
        ];

        for (let helperIndex = 0; helperIndex < bootstrapHelpers.length; helperIndex++) {
            const helper = bootstrapHelpers[helperIndex];

            if (checkPrx(helper)) fail("Bootstrap helper is proxied!");
            if (helper !== fnToString && objHasOwn.call(helper, "toString")) fail("Bootstrap helper has own toString!");

            const str = fnToString.call(helper);

            if (!nativeRegex.test(str)) fail("Bootstrap helper is not native: " + str);
        }
    }

    function verifyProvidedProperties(phase) {
        const msg = globalThis.msg,
            tag = globalThis.tag;

        if (originalUtil != null) verifyDeepEqual(globalThis.util, originalUtil, "util", phase, expectedUtilKeys);
        if (globalThis.vm != null || originalVm != null)
            verifyDeepEqual(globalThis.vm || originalVm, originalVm, "vm", phase);
        if (globalThis.http != null || originalHttp != null)
            verifyDeepEqual(globalThis.http || originalHttp, originalHttp, "http", phase);

        if (msg != null) {
            const author = msg.author,
                channel = msg.channel,
                guild = msg.guild,
                mentions = msg.mentions;

            if (author == null || typeof author !== "object") fail("msg.author is missing or invalid");
            if (channel == null || typeof channel !== "object") fail("msg.channel is missing or invalid");
            if (msg.authorId !== author.id) fail("msg.authorId mismatch with author.id");
            if (msg.authorId !== author.userId) fail("msg.authorId mismatch with author.userId");
            if (msg.channelId !== channel.id) fail("msg.channelId mismatch with channel.id");
            if (guild != null && typeof guild !== "object") fail("msg.guild is invalid");

            if (
                (msg.guildId != null || (guild != null && guild.id != null)) &&
                (guild == null || msg.guildId !== guild.id)
            )
                fail("msg.guildId mismatch with guild.id");
            if ((msg.guildId != null || author.guildId != null) && author.guildId !== msg.guildId)
                fail("author.guildId mismatch with msg.guildId");
            if (msg.cleanContent !== msg.content) fail("msg.cleanContent mismatch with msg.content");
            if (author.tag != null && !stringIncludes(author.tag, author.username)) fail("author.tag is invalid");
            if (author.avatar != null && author.avatarURL != null && !stringIncludes(author.avatarURL, author.avatar))
                fail("author.avatarURL is invalid");

            if (
                author.avatar != null &&
                author.displayAvatarURL != null &&
                !stringIncludes(author.displayAvatarURL, author.avatar)
            )
                fail("author.displayAvatarURL is invalid");

            if (author.banner != null && author.bannerURL != null && !stringIncludes(author.bannerURL, author.banner))
                fail("author.bannerURL is invalid");

            if (mentions != null && typeof mentions === "object") {
                if (Array.isArray(mentions.members) && Array.isArray(mentions.users)) {
                    for (let memberIndex = 0; memberIndex < mentions.members.length; memberIndex++) {
                        const member = mentions.members[memberIndex];
                        if (member == null || typeof member !== "object") continue;

                        if (member.userId !== member.id) fail("Mention member userId mismatch with id");
                        if (guild != null && member.guildId !== guild.id) fail("Mention member guildId mismatch");

                        let found = false;

                        for (let userIndex = 0; userIndex < mentions.users.length; userIndex++) {
                            const user = mentions.users[userIndex];

                            if (user != null && user.id === member.id) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) fail("Mention member lacks corresponding mention user");
                    }
                }
            }

            if (originalMsg != null) {
                if (msg.id !== originalMsg.id) fail("msg.id has been modified");
                if (msg.channelId !== originalMsg.channelId) fail("msg.channelId has been modified");
                if (msg.guildId !== originalMsg.guildId) fail("msg.guildId has been modified");
                if (msg.createdTimestamp !== originalMsg.createdTimestamp)
                    fail("msg.createdTimestamp has been modified");
                if (msg.type !== originalMsg.type) fail("msg.type has been modified");
                if (msg.system !== originalMsg.system) fail("msg.system has been modified");
                if (msg.content !== originalMsg.content) fail("msg.content has been modified");
                if (msg.authorId !== originalMsg.authorId) fail("msg.authorId has been modified");
                if (msg.pinned !== originalMsg.pinned) fail("msg.pinned has been modified");
                if (msg.tts !== originalMsg.tts) fail("msg.tts has been modified");
                if (msg.nonce !== originalMsg.nonce) fail("msg.nonce has been modified");
                if (msg.position !== originalMsg.position) fail("msg.position has been modified");
                if (msg.webhookId !== originalMsg.webhookId) fail("msg.webhookId has been modified");
                if (msg.applicationId !== originalMsg.applicationId) fail("msg.applicationId has been modified");
                if (msg.flags !== originalMsg.flags) fail("msg.flags has been modified");
                if (msg.cleanContent !== originalMsg.cleanContent) fail("msg.cleanContent has been modified");
            }
        }

        if (tag != null) {
            if (originalTag != null) {
                if (tag.name !== originalTag.name) fail("tag.name has been modified");
                if (tag.body !== originalTag.body) fail("tag.body has been modified");
                if (tag.owner !== originalTag.owner) fail("tag.owner has been modified");
                if (tag.args !== originalTag.args) fail("tag.args has been modified");
            }
        }

        const roots = getLiveRootObjects(),
            visited = new Map();

        for (const rootName of providedRootNames) {
            const root = roots[rootName];
            if (root != null) traverse(root, rootName, visited);
        }
    }

    function verifyProvidedFunctions(phase) {
        allowedHostFunctionRefs = new Set();
        allowOriginalFunctions();

        const rootObjects = getLiveRootObjects();
        rootObjects.util = originalUtil;

        for (let functionIndex = 0; functionIndex < expectedFunctions.length; functionIndex++) {
            const path = expectedFunctions[functionIndex],
                parts = primitiveSplit(path, ".");

            const rootName = parts[0],
                funcName = parts[1];

            const rootObj = rootObjects[rootName];
            if (rootObj == null) continue;

            const fn = rootObj[funcName];

            if (typeof fn !== "function") {
                fail("Expected function at: " + path);
                continue;
            }

            if (phase === "after" && path === "msg.reply") {
                if (fn.patched !== true || checkPrx(fn))
                    fail("msg.reply has been tampered with or is missing expected patch");

                const str = fnToString.call(fn);

                if (!customReplyShape.test(str)) fail("msg.reply shape is tampered");
            } else checkFunctionShape(fn, path);

            allowedHostFunctionRefs.add(fn);
        }
    }

    function verifyCoreRoots(phase) {
        const coreVisited = new Set();

        for (let rootIndex = 0; rootIndex < coreRoots.length; rootIndex++) {
            const root = coreRoots[rootIndex];

            if (root != null) checkCoreVal(root, getRootName(root), coreVisited, phase);
        }
    }

    return Object.freeze({
        init() {
            if (initialized) return;

            originalUtil = globalThis.util ? { ...globalThis.util } : null;
            originalMsg = globalThis.msg ? { ...globalThis.msg } : null;
            originalVm = globalThis.vm ? { ...globalThis.vm } : null;
            originalHttp = globalThis.http ? { ...globalThis.http } : null;
            originalTag = globalThis.tag ? { ...globalThis.tag } : null;

            fnToString = Function.prototype.toString;
            objHasOwn = Object.prototype.hasOwnProperty;
            reflectOwnKeys = Reflect.ownKeys;
            reflectGetProto = Reflect.getPrototypeOf;
            getProtoDesc = Object.getOwnPropertyDescriptor;
            dateToString = Date.prototype.toString;
            mapHas = Map.prototype.has;

            nativeRegex = /^(function|class)\s*[^()]*\s*(\(\))?\s*\{\s*\[native code\]\s*\}$/;

            allowedConstructors = new Set([
                globalThis.Object,
                globalThis.Function,
                globalThis.Array,
                globalThis.Number,
                globalThis.String,
                globalThis.Boolean,
                globalThis.Symbol,
                globalThis.Date,
                globalThis.RegExp,
                globalThis.Error,
                globalThis.EvalError,
                globalThis.RangeError,
                globalThis.ReferenceError,
                globalThis.SyntaxError,
                globalThis.TypeError,
                globalThis.URIError,
                globalThis.Proxy,
                globalThis.Map,
                globalThis.Set,
                globalThis.WeakMap,
                globalThis.WeakSet,
                globalThis.ArrayBuffer,
                globalThis.SharedArrayBuffer,
                globalThis.DataView,
                globalThis.Int8Array,
                globalThis.Uint8Array,
                globalThis.Uint8ClampedArray,
                globalThis.Int16Array,
                globalThis.Uint16Array,
                globalThis.Int32Array,
                globalThis.Uint32Array,
                globalThis.Float32Array,
                globalThis.Float64Array,
                globalThis.BigInt64Array,
                globalThis.BigUint64Array,
                globalThis.BigInt,
                globalThis.Promise,
                globalThis.WebAssembly
            ]);

            initialized = true;
            deleteConfigProps();
        },

        check(phase, label) {
            failures = [];

            if (!verifyToStringNative()) fail("Function.prototype.toString has been tampered with!");

            verifyBootstrap();
            verifyProvidedFunctions(phase);
            verifyProvidedProperties(phase);
            verifyCoreRoots(phase);

            if (!LoaderUtils.empty(failures)) {
                const msg = label == null ? "Integrity check failed" : "Integrity check failed at " + label;

                if (config.enableDebugger) exit(msg + ":\n" + failures.join("\n"));
                else exit(msg);
            }
        }
    });
})();

IntegrityChecker.init();

const LoaderTextEncoder = Object.freeze({
    stringToBytes: str => {
        const bytes = new Uint8Array(str.length);

        for (let i = 0; i < str.length; i++) {
            bytes[i] = str.charCodeAt(i);
        }

        return bytes;
    },

    bytesToString: data => {
        let str = "";

        for (let i = 0; i < data.length; i += 0x40) {
            str += String.fromCharCode(...data.subarray(i, i + 0x40));
        }

        return str;
    },

    stringToUtf8: str => {
        const bytes = [];

        for (let i = 0; i < str.length; i++) {
            let cp = str.codePointAt(i);

            if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
            else if (cp > 0xffff) i++;

            if (cp <= 0x7f) {
                bytes.push(cp);
            } else if (cp <= 0x7ff) {
                bytes.push(0xc0 | (cp >> 6));
                bytes.push(0x80 | (cp & 0x3f));
            } else if (cp <= 0xffff) {
                bytes.push(0xe0 | (cp >> 12));
                bytes.push(0x80 | ((cp >> 6) & 0x3f));
                bytes.push(0x80 | (cp & 0x3f));
            } else {
                bytes.push(0xf0 | (cp >> 18));
                bytes.push(0x80 | ((cp >> 12) & 0x3f));
                bytes.push(0x80 | ((cp >> 6) & 0x3f));
                bytes.push(0x80 | (cp & 0x3f));
            }
        }

        return new Uint8Array(bytes);
    },

    stringUtf8Length: str => {
        let i = 0,
            len = LoaderUtils.countChars(str);

        let code,
            length = 0;

        for (; i < len; i++) {
            code = str.codePointAt(i);

            if (code <= 0x7f) length += 1;
            else if (code <= 0x7ff) length += 2;
            else if (code <= 0xffff) length += 3;
            else {
                length += 4;
                i++;
            }
        }

        return length;
    }
});

const EncryptionUtil = Object.freeze({
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

        let alphabet = "";

        let split = LoaderUtils.splitChars(str),
            out;

        switch (mode) {
            case 0:
                alphabet = EncryptionUtil.createShiftedAlphabet(upper, shift);

                out = split.map(char => {
                    const code = char.charCodeAt(0);

                    if ("A" <= char && char <= "Z") return alphabet[code - A];
                    else if ("a" <= char && char <= "z") return alphabet[code - a];
                    else return char;
                });

                break;
            case 1:
                upper = EncryptionUtil.createShiftedAlphabet(upper, shift);
                lower = upper.toLowerCase();
                digit = EncryptionUtil.createShiftedAlphabet(digit, shift);

                out = split.map(char => {
                    const code = char.charCodeAt(0);

                    if ("A" <= char && char <= "Z") return upper[code - A];
                    else if ("a" <= char && char <= "z") return lower[code - a];
                    else if ("0" <= char && char <= "9") return digit[code - zero];
                    else return char;
                });

                break;
            case 2:
                lower = upper.toLowerCase();

                const upper_off = 0,
                    lower_off = upper_off + upper.length,
                    digit_off = lower_off + lower.length;

                alphabet = EncryptionUtil.createShiftedAlphabet(upper + lower + digit, shift);

                out = split.map(char => {
                    const code = char.charCodeAt(0);

                    if ("A" <= char && char <= "Z") return alphabet[code - A + upper_off];
                    else if ("a" <= char && char <= "z") return alphabet[code - a + lower_off];
                    else if ("0" <= char && char <= "9") return alphabet[code - zero + digit_off];
                    else return char;
                });

                break;
            default:
                throw new UtilError("Invalid mode: " + mode, mode);
        }

        return out.join("");
    }
});

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

        if (HttpUtil.protocolRegex.test(firstPart) && LoaderUtils.multiple(input)) {
            firstPart = input.shift() + input.shift();
            input.unshift(firstPart);
        }

        input[0] = firstPart;

        for (let i = 0; i < input.length; i++) {
            let part = input[i];

            if (typeof part !== "string") {
                throw new TypeError("URL part must be a string");
            }

            if (LoaderUtils.empty(part)) continue;

            if (i > 0) part = part.replace(HttpUtil.leadingSlashRegex, "");
            part = part.replace(HttpUtil.trailingSlashRegex, i === input.length - 1 ? "/" : "");

            result.push(part);
        }

        HttpUtil.paramSlashRegex.lastIndex = 0;

        let str = result.join("/");
        str = str.replace(HttpUtil.paramSlashRegex, "$1");

        const [beforeHash, afterHash] = str.split("#"),
            hash = LoaderUtils.empty(afterHash) ? "" : "#" + afterHash;

        let paramParts = beforeHash.split(HttpUtil.paramSplitRegex);
        paramParts = paramParts.filter(part => !LoaderUtils.empty(part));

        const beforeParams = paramParts.shift(),
            params = (LoaderUtils.empty(paramParts) ? "" : "?") + paramParts.join("&");

        str = beforeParams + params + hash;
        return str;
    },

    getQueryString: params => {
        if (params == null) {
            return "";
        }

        const query = [];

        for (const [key, value] of Object.entries(params)) {
            if (value != null) query.push(key + "=" + encodeURIComponent(value));
        }

        if (LoaderUtils.empty(query)) return "";
        return `?${query.join("&")}`;
    },

    _statusRegex: /Request failed with status code (\d+)/,
    getHttpErrStatus: (res, reqErr) => {
        if (
            reqErr == null &&
            (res instanceof Error || (res != null && typeof res.message === "string" && typeof res.status !== "number"))
        ) {
            reqErr = res;
            res = null;
        }

        if (util.env && res?.ok === false) return res.status;
        else if (reqErr == null) return null;

        const statusText = reqErr?.message;
        if (typeof statusText !== "string") return -1;

        const statusMatch = statusText.match(HttpUtil._statusRegex);
        return LoaderUtils.parseInt(statusMatch?.[1], 10, -1);
    },

    _mimeTypes: {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        bmp: "image/bmp",
        webp: "image/webp",
        pdf: "application/pdf",
        txt: "text/plain",
        html: "text/html",
        json: "application/json",
        csv: "text/csv",
        mp3: "audio/mpeg",
        mp4: "video/mp4",
        zip: "application/zip",
        tar: "application/x-tar",
        gz: "application/gzip"
    },
    _defaultMimeType: "application/octet-stream",

    getContentType: ext => {
        if (!LoaderUtils.nonemptyString(ext)) return HttpUtil._defaultMimeType;
        if (ext.startsWith(".")) ext = ext.slice(1);
        ext = ext.toLowerCase();

        return HttpUtil._mimeTypes[ext] ?? HttpUtil._defaultMimeType;
    },

    CRLF: "\r\n",
    CRLF2: "\r\n".repeat(2),

    formContent: "Content-Disposition: form-data; ",

    getFormBoundary: () => {
        return `----WebKitFormBoundary${LoaderUtils.randomString(16)}`;
    },

    getFormCtype: formBoundary => {
        return `multipart/form-data; boundary=${formBoundary}`;
    },

    _mergeFormData: chunks => {
        let formSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0),
            offset = 0;

        const merged = new Uint8Array(formSize);

        for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
        }

        return [formSize, merged];
    },
    encodeFormMeta: (formMeta, data) => {
        const chunks = formMeta.map(line => LoaderTextEncoder.stringToUtf8(line));
        chunks.splice(formMeta.length - 2, 0, data);

        return HttpUtil._mergeFormData(chunks);
    }
});

let UploadUtil = {
    _sendUploadReqDefaults: {
        returnType: FileDataTypes.text,
        headers: {}
    },
    _sendUploadReq(url, formInfo, formData, options = {}) {
        options = ObjectUtil.setValuesWithDefaults({}, options, UploadUtil._sendUploadReqDefaults);

        const { returnType, headers } = options;

        if (true || util.env) {
            headers["Content-Type"] = formInfo.formCtype;
            headers["Content-Length"] = formInfo.formSize;
        } else {
            headers["L-Content-Type"] = formInfo.formCtype;
            headers["L-Content-Length"] = formInfo.formSize;

            formData = Array.from(formData)
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");
        }

        const config = {
            url,
            method: "POST",
            headers,
            data: formData,
            responseType: ModuleLoader._returnTypeToRes(returnType, true)
        };

        if (util.env) config.errorType = "value";

        let res = null,
            reqErr = null;

        try {
            res = http.request(config);
        } catch (err) {
            reqErr = err;
        }

        const status = HttpUtil.getHttpErrStatus(res, reqErr);

        if (status === null) return res?.data ?? null;
        else {
            throw new LoaderError("Upload failed with code: " + status, status);
        }
    },

    _uploadToCustomDefaults: {
        fileField: "file",
        fields: {}
    },
    uploadToCustom: (apiUrl, data, ext, options = {}) => {
        if (ext.startsWith(".")) ext = ext.slice(1);

        options = ObjectUtil.setValuesWithDefaults({}, options, UploadUtil._uploadToCustomDefaults);

        const fileFieldName = options.fileField,
            otherFields = options.fields,
            contentType = options.contentType ?? HttpUtil.getContentType(ext);

        data = TypeTester.asUint8Array(data);

        const formBoundary = HttpUtil.getFormBoundary(),
            formMeta = [];

        for (let [name, value] of Object.entries(otherFields)) {
            value = String(value).trim();

            formMeta.push(
                `--${formBoundary}${HttpUtil.CRLF}`,
                `${HttpUtil.formContent}name="${name}"${HttpUtil.CRLF2}`,
                `${value}${HttpUtil.CRLF}`
            );
        }

        formMeta.push(
            `--${formBoundary}${HttpUtil.CRLF}`,
            `${HttpUtil.formContent}name="${fileFieldName}"; filename="data.${ext}"${HttpUtil.CRLF}`,
            `Content-Type: ${contentType}${HttpUtil.CRLF2}`,

            HttpUtil.CRLF,

            `--${formBoundary}--${HttpUtil.CRLF}`
        );

        const [formSize, formData] = HttpUtil.encodeFormMeta(formMeta, data);

        return UploadUtil._sendUploadReq(
            apiUrl,
            {
                formCtype: HttpUtil.getFormCtype(formBoundary),
                formSize
            },
            formData,
            options
        );
    },

    _catboxUrls: {
        permanent: "https://catbox.moe/user/api.php",
        litter: "https://litterbox.catbox.moe/resources/internals/api.php"
    },
    _uploadToCatboxDefaults: {
        litter: false,
        expiryTime: "1h"
    },
    uploadToCatbox: (data, ext, options = {}) => {
        options = ObjectUtil.setValuesWithDefaults({}, options, UploadUtil._uploadToCatboxDefaults);

        const { litter, userhash, expiryTime } = options;

        if (!litter && !LoaderUtils.nonemptyString(userhash)) {
            throw new UtilError("No userhash provided");
        }

        const apiUrl = UploadUtil._catboxUrls[litter ? "litter" : "permanent"];

        const fields = {
            reqtype: "fileupload"
        };

        if (litter) {
            fields.time = expiryTime;
            fields.fileNameLength = 16;
        } else {
            fields.userhash = userhash;
        }

        return UploadUtil.uploadToCustom(apiUrl, data, ext, {
            fileField: "fileToUpload",
            fields,
            contentType: options.contentType
        });
    },

    _filecanBase: "http://api.example.com/",
    _uploadToFilecanDefaults: {
        password: "",
        expiryTime: 1,
        passwordRequired: true
    },
    uploadToFilecan: (data, ext, options = {}) => {
        options = ObjectUtil.setValuesWithDefaults({}, options, UploadUtil._uploadToFilecanDefaults);

        const password = options.password,
            expiryTime = Math.floor(options.expiryTime * 3600000);

        let token = null;

        if (options.passwordRequired) {
            if (!LoaderUtils.nonemptyString(password)) {
                throw new UtilError("No password provided");
            }

            const config = {
                url: HttpUtil.joinUrl(UploadUtil._filecanBase, "api/auth/authenticate"),
                method: "post",
                data: {
                    type: "upload",
                    password
                },
                responseType: "json"
            };

            let res = null,
                reqErr = null;

            try {
                res = http.request(config);
            } catch (err) {
                reqErr = err;
            }

            const status = HttpUtil.getHttpErrStatus(res, reqErr);

            if (status !== null) {
                throw new LoaderError("Filecan auth failed with code: " + status, status);
            }

            token = res?.data?.token ?? null;

            if (!LoaderUtils.nonemptyString(token)) {
                throw new LoaderError("Filecan auth returned no token");
            }
        }

        const headers = token ? { token } : {};

        const fields = {
            expirylength: expiryTime
        };

        if (LoaderUtils.nonemptyString(password)) {
            fields.password = password;
        }

        const file = UploadUtil.uploadToCustom(UploadUtil._filecanApi, data, ext, {
            fileField: "files",
            fields,
            contentType: options.contentType,
            returnType: "json",

            headers
        }).files[0];

        return HttpUtil.joinUrl(UploadUtil._filecanBase, file.filename);
    }
};

{
    UploadUtil._filecanApi = HttpUtil.joinUrl(UploadUtil._filecanBase, "api/upload");

    UploadUtil = Object.freeze(UploadUtil);
}

class Benchmark {
    static data = Object.create(null);
    static counts = Object.create(null);
    static timepoints = new Map();

    static getCurrentTime(ms = true) {
        let time = 0;

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

        return ms ? this._timeToMs(time) : time;
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
        if (typeof t1 === "undefined") return NaN;

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

        if (!format) return time ?? NaN;

        return typeof time === "undefined" ? `Key "${key}" not found.` : this._formatTime(key, time);
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
        const clearKeys = ArrayUtil.diff(Object.keys(this.data), keys).removed;

        for (const key of clearKeys) {
            delete this.data[key];
        }

        this.timepoints.clear();
        this.clearCounts();
    }

    static clearExceptLast(n = 1) {
        const clearKeys = LoaderUtils.before(Object.keys(this.data), -n);

        for (const key of clearKeys) {
            delete this.data[key];
        }

        this.timepoints.clear();
        this.clearCounts();
    }

    static getSum(...keys) {
        let sumTimes = [];

        if (!LoaderUtils.empty(keys)) {
            sumTimes = keys
                .map(key => {
                    key = this._formatTimeKey(key);
                    return this.data[key];
                })
                .filter(time => typeof time !== "undefined");
        } else {
            sumTimes = Object.values(this.data);
        }

        return ArrayUtil.sum(sumTimes);
    }

    static getAll(...includeSum) {
        let format = LoaderUtils.last(includeSum);

        if (typeof format === "boolean") includeSum.pop();
        else format = true;

        let useSum = !LoaderUtils.empty(includeSum),
            sum;

        if (useSum) {
            const allKeys = LoaderUtils.first(includeSum) === true,
                keys = allKeys ? [] : includeSum;

            sum = this.getSum(...keys);
        }

        if (format) {
            const times = Object.entries(this.data).map(([key, time]) => this._formatTime(key, time));
            if (useSum) times.push(this._formatTime("sum", sum));

            return times.join(",\n");
        } else {
            const times = ObjectUtil.assign({}, this.data, "keys");
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

        if (!format) return count ?? NaN;

        const originalName = this._origCountNames.get(name);

        if (typeof count === "undefined" || typeof originalName === "undefined") {
            return `Count "${name}" not found.`;
        } else {
            return this._formatCount(originalName, count);
        }
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

            try {
                return func.apply(this, args);
            } finally {
                _this.stopTiming(_this.getCount(name));
            }
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
        if (typeof this._performance !== "undefined") return "performanceNow";
        else if (typeof this._vm !== "undefined") return "vmTime";
        else if (typeof this._Date !== "undefined") return "dateNow";
        else {
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
        this.name = String(name ?? "");
        this.code = code;
        this.returnType = returnType;
    }
}

class Module {
    constructor(name, id) {
        if (name instanceof Module) {
            const module = name,
                newName = id;

            this.name = String(newName ?? module.name);
            this.id = module.id;
            this.exports = module.exports;
            this.loaded = module.loaded;

            return this;
        }

        if (name == null) this.name = ModuleLoader._Cache.getSeqModuleName();
        else this.name = String(name);

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
        name = String(name ?? "");
        return this._cache.get(name) ?? null;
    }

    getModuleById(id) {
        for (const module of this._cache.values()) {
            if (module.id === id) return module;
        }

        return null;
    }

    addModule(module, newName, reload = false) {
        const name = module.name,
            existing = this.getModuleByName(name);

        if (!reload && existing !== null && existing.id !== module.id) {
            throw new LoaderError(`Module ${name} already exists`, name);
        }

        this._cache.set(name, module);

        if (newName != null) {
            const alias = this.getModuleByName(newName);

            if (!reload && alias !== null && alias.id !== module.id) {
                throw new LoaderError(`Module ${newName} already exists`, newName);
            }

            const newModule = new Module(module, newName);
            this._cache.set(newName, newModule);
        }
    }

    deleteModule(id) {
        if (id instanceof Module) ({ id } = id);

        for (const [key, module] of this._cache.entries()) {
            if (module.id === id) this._cache.delete(key);
        }
    }

    getCodeByName(name) {
        name = String(name ?? "");
        return this._code.get(name) ?? null;
    }

    addCode(code, reload = false) {
        const name = code.name;

        if (!reload && this.getCodeByName(name) !== null) {
            throw new LoaderError(`Module ${name} already exists`, name);
        }

        this._code.set(name, code);
    }

    deleteCode(name) {
        if (name instanceof ModuleCode) ({ name } = name);
        else name = String(name ?? "");

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
    static cleanGlobal = ObjectUtil.shallowClone(globalThis, "nonenum");
    static globalKeys = ["global", "globalThis"];

    static createGlobalsObject(obj) {
        obj = ObjectUtil.makeNonConfigurableObject(obj);
        return new Proxy(obj, this._globalsProxyHandler);
    }

    static _globalsProxyHandler = {
        get(target, prop, reciever) {
            const value = Reflect.get(target, prop, reciever);
            return value === null ? undefined : value;
        },

        set(target, prop, value, reciever) {
            if (value == null) return false;

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
        return ObjectUtil.makeInfiniteObject();
    };

    static createFakeRequire(obj = {}) {
        return function (id) {
            if (typeof id !== "string") {
                return ObjectUtil.makeInfiniteObject();
            }

            const ret = obj[id];

            switch (typeof ret) {
                case "undefined":
                    return ObjectUtil.makeInfiniteObject();
                case "function":
                    if (!TypeTester.isClass(ret)) {
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

        if (TypeTester.isObject(names)) ObjectUtil.assign(names, randomNames, "keys");

        return RegexUtil.templateReplace(this.moduleCodeTemplate, {
            moduleCode,
            ...randomNames
        });
    }
}

class ModuleStackTraceUtil {
    static indent = " ".repeat(4);
    static errLocationExp = /<anonymous>:(\d+):(\d+)\)$/;

    static getLocation(stackFrame) {
        const match = stackFrame.match(this.errLocationExp);
        if (!match) return [0, 0];

        const lineNum = match[1] ? match[1] - ModuleTemplateUtil.moduleCodeStartLine : 0,
            columnNum = match[2] ?? 0;

        return [lineNum, columnNum];
    }

    static getNewStackFrame(stackFrame, moduleName) {
        const [lineNum, columnNum] = this.getLocation(stackFrame);

        let newStackFrame = `at (<module`;

        if (typeof moduleName === "string") newStackFrame += ` ${moduleName}>)`;
        else newStackFrame += ">)";

        newStackFrame += `:${lineNum}:${columnNum}`;
        return newStackFrame;
    }

    static rewriteStackTrace(err, randomNames, moduleName) {
        if (err == null || typeof err.stack !== "string") {
            return err ? err.stack : undefined;
        }

        let stackFrames = err.stack.split("\n"),
            msgLine;

        [msgLine, ...stackFrames] = stackFrames;
        stackFrames = stackFrames.map(frame => frame.trim());

        const innerFnLine = stackFrames.findIndex(frame => frame.startsWith(`at ${randomNames.innerFnName}`));
        if (innerFnLine === -1) return err.stack;

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
        const cb = LoaderUtils.last(vars),
            useCb = typeof cb === "function";

        let old = null;

        if (useCb) {
            vars.pop();
            old = {};
        }

        if (LoaderUtils.empty(vars)) {
            vars.push(...this._tagConfigVars);
        }

        vars = TypeTester.normalizeEnums(vars, this._tagConfigVars, "config variable", LoaderError);

        for (const name of vars) {
            const defaultValue = config[name];
            if (useCb) old[name] = this[name];

            this[name] = defaultValue;
        }

        if (useCb) {
            try {
                return cb();
            } finally {
                ObjectUtil.assign(this, old, "keys");
            }
        }
    }

    static _getModuleCodeFromUrlDefaults = {
        returnResponse: false,
        cache: true,
        forceReload: false
    };

    static getModuleCodeFromUrl(url, returnType = FileDataTypes.module, options = {}) {
        if (LoaderUtils.empty(url)) {
            throw new LoaderError("Invalid URL");
        }

        options = ObjectUtil.setValuesWithDefaults({}, options, this._getModuleCodeFromUrlDefaults);

        const name = options.name ?? url,
            codename = `${name}:${returnType}`;

        const returnRes = options.returnResponse,
            cache = this.enableCache && options.cache && !returnRes,
            forceReload = options.forceReload;

        if (cache && !forceReload) {
            const foundCode = this._Cache.getCodeByName(codename);
            if (foundCode !== null) return foundCode.code;
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
            const code = new ModuleCode(codename, moduleCode, returnType);
            this._Cache.addCode(code, forceReload);
        }

        return moduleCode;
    }

    static _getModuleCodeFromTagDefaults = {
        cache: true,
        forceReload: false,
        encoded: false
    };

    static getModuleCodeFromTag(tagName, returnType = FileDataTypes.module, options = {}) {
        if (tagName == null) {
            throw new LoaderError("Invalid tag name");
        }

        options = ObjectUtil.setValuesWithDefaults({}, options, this._getModuleCodeFromTagDefaults);

        const name = options.name ?? tagName,
            codename = `${name}:${returnType}`;

        const cache = this.enableCache && options.cache,
            forceReload = options.forceReload;

        if (cache && !forceReload) {
            const foundCode = this._Cache.getCodeByName(codename);
            if (foundCode !== null) return foundCode.code;
        }

        const owner = options.owner ?? this.tagOwner,
            encoded = options.encoded,
            buf_size = options.buf_size;

        let moduleCode = this._fetchTagBody(tagName, owner, options);
        if (encoded) {
            const encoder = encoded === true ? "base2n" : encoded;
            moduleCode = this._decodeModuleCode(moduleCode, encoder, buf_size);
        }

        moduleCode = this._parseModuleCode(moduleCode, returnType);

        if (cache) {
            const code = new ModuleCode(codename, moduleCode, returnType);
            this._Cache.addCode(code, forceReload);
        }

        return moduleCode;
    }

    static getModuleCode(url, tagName, ...args) {
        const loadSource = TypeTester.normalizeEnum(this.loadSource, this._loadSources, "load source", LoaderError);

        switch (loadSource) {
            case "url":
                if (url == null) {
                    return;
                }

                return this.getModuleCodeFromUrl(url, ...args);
            case "tag":
                if (tagName == null) {
                    return;
                }

                return this.getModuleCodeFromTag(tagName, ...args);
        }
    }

    static _loadModuleFromSourceDefaults = {
        cache: true,
        forceReload: false,
        wrapErrors: true
    };

    static loadModuleFromSource(moduleCode, loadScope, breakpoint, options = {}) {
        loadScope ??= {};
        breakpoint ??= this.breakpoint;

        options = ObjectUtil.setValuesWithDefaults({}, options, this._loadModuleFromSourceDefaults);

        const moduleName = options.name,
            cache = this.enableCache && options.cache,
            forceReload = options.forceReload;

        if (cache && moduleName != null && !forceReload) {
            const foundModule = this._Cache.getModuleByName(moduleName);
            if (foundModule !== null) return foundModule.exports;
        }

        if (typeof moduleCode !== "string") {
            throw new LoaderError("Invalid module code");
        } else moduleCode = moduleCode.trim();

        if (!LoaderUtils.nonemptyString(moduleCode)) {
            throw new LoaderError("Invalid module code");
        }

        let moduleId = null;

        if (cache) {
            moduleId = md5(moduleCode);

            if (!forceReload) {
                const foundModule = this._Cache.getModuleById(moduleId);

                if (foundModule !== null) {
                    if (foundModule.name !== moduleName) this._Cache.addModule(foundModule, moduleName);
                    return foundModule.exports;
                }
            }
        }

        const module = new Module(moduleName, moduleId),
            exports = module.exports;

        if (cache) this._Cache.addModule(module, null, forceReload);

        const isolateGlobals = options.isolateGlobals ?? this.isolateGlobals,
            wrapErrors = options.wrapErrors;

        const randomNames = {};

        if (breakpoint) moduleCode = ModuleTemplateUtil.addDebuggerStmt(moduleCode);
        if (wrapErrors) moduleCode = ModuleTemplateUtil.wrapErrorHandling(moduleCode, randomNames);

        const moduleObjs = { module, exports };

        const newLoadScope = {},
            loadGlobals = {},
            customGlobalKeys = [];

        for (const [key, value] of Object.entries(loadScope)) {
            if (!TypeTester.isObject(value)) {
                newLoadScope[key] = value;
                continue;
            }

            if (value.globalHolder === true) customGlobalKeys.push(key);
            else if ("value" in value) {
                const obj = value;
                (obj.global === true ? loadGlobals : newLoadScope)[key] = obj.value;
            } else newLoadScope[key] = value;
        }

        let filteredGlobals = ObjectUtil.removeNullValues({ ...globals, ...loadGlobals }),
            filteredScope = ObjectUtil.removeNullValues(newLoadScope);

        const loadScopeThis = filteredScope.this ?? undefined;
        filteredScope = ObjectUtil.filterObject(filteredScope, key => key !== "this");

        let originalGlobal, patchedGlobal;

        if (isolateGlobals) {
            originalGlobal = ObjectUtil.shallowClone(globalThis, "enum");

            patchedGlobal = ObjectUtil.shallowClone(ModuleGlobalsUtil.cleanGlobal);
            ObjectUtil.assign(patchedGlobal, filteredGlobals, "enum");
        } else {
            patchedGlobal = ObjectUtil.makeMirrorObject(globalThis, filteredGlobals);
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
                throw err instanceof TypeError ? new LoaderError(ModuleLoader._isolateGlobalsError) : err;
            }

            Patches.patchGlobalContext(patchedGlobal);
        } else {
            ObjectUtil.assign(scopeObj, filteredGlobals, "keys");
        }

        const loadParams = Object.keys(scopeObj),
            loadArgs = Object.values(scopeObj);

        const cleanup = () => {
            try {
                if (isolateGlobals) {
                    Patches.removeFromGlobalContext("nondefault");
                    Patches.patchGlobalContext(originalGlobal);
                }
            } finally {
                if (cache && !module.loaded) this._Cache.deleteModule(module);
            }
        };

        if (wrapErrors) {
            let loaderFn = null,
                loadErr = null;

            try {
                loaderFn = new Function(loadParams, moduleCode);
            } catch (err) {
                loadErr = err;
            }

            let loaded = false;

            if (loaderFn !== null) {
                try {
                    [loaded, loadErr] = loaderFn.apply(loadScopeThis, loadArgs);
                } catch (err) {
                    loaded = false;
                    loadErr = err;
                }

                module.loaded = loaded;
            }

            cleanup();

            if (!loaded) {
                if (TypeTester.isObject(loadErr)) {
                    try {
                        loadErr.stack = ModuleStackTraceUtil.rewriteStackTrace(loadErr, randomNames, module.name);
                    } catch (stackErr) {}
                }

                throw new LoaderError(`Error occured while loading module ${module.name}.`, loadErr);
            }
        } else {
            try {
                const loaderFn = new Function(loadParams, moduleCode);
                loaderFn.apply(loadScopeThis, loadArgs);

                module.loaded = true;
            } finally {
                cleanup();
            }
        }

        if (config.integrityChecks) {
            IntegrityChecker.check("after", Benchmark.getCount("module_load"));
        }

        return module.exports;
    }

    static _loadModuleDefaults = {
        cache: true,
        forceReload: false,
        returnType: FileDataTypes.module
    };

    static loadModuleFromUrl(url, options = {}) {
        options = ObjectUtil.setValuesWithDefaults({}, options, this._loadModuleDefaults);

        const [codeArgs, loadArgs] = this._getLoadArgs(url, options);

        const cache = this.enableCache && options.cache,
            forceReload = options.forceReload;

        const isModule = options.returnType === FileDataTypes.module;

        if (cache && isModule && !forceReload) {
            const foundModule = this._Cache.getModuleByName(url);
            if (foundModule !== null) return foundModule.exports;
        }

        const moduleCode = this.getModuleCodeFromUrl(url, ...codeArgs);

        if (!isModule) return moduleCode;
        return this.loadModuleFromSource(moduleCode, ...loadArgs);
    }

    static loadModuleFromTag(tagName, options = {}) {
        options = ObjectUtil.setValuesWithDefaults({}, options, this._loadModuleDefaults);

        const [codeArgs, loadArgs] = this._getLoadArgs(tagName, options);

        const cache = this.enableCache && options.cache,
            forceReload = options.forceReload;

        const isModule = options.returnType === FileDataTypes.module;

        if (cache && isModule && !forceReload) {
            const foundModule = this._Cache.getModuleByName(tagName);
            if (foundModule !== null) return foundModule.exports;
        }

        const moduleCode = this.getModuleCodeFromTag(tagName, ...codeArgs);

        if (!isModule) return moduleCode;
        return this.loadModuleFromSource(moduleCode, ...loadArgs);
    }

    static loadModule(url, tagName, options) {
        const loadSource = TypeTester.normalizeEnum(this.loadSource, this._loadSources, "load source", LoaderError);

        switch (loadSource) {
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
        }
    }

    static clearCache() {
        return this._Cache.clearAll();
    }

    static _loadSources = Object.freeze(["url", "tag"]);
    static _tagConfigVars = Object.freeze(["loadSource", "isolateGlobals", "tagOwner"]);

    static _isolateGlobalsError =
        "You're not allowed to have functions defined via the function keyword or vars in the same scope as the load call. Use an object or an IIFE to isolate them.";

    static _Cache = new ModuleCacheManager();

    static _returnTypeToRes(returnType, allowJson = false) {
        returnType = TypeTester.normalizeEnum(returnType, FileDataTypes, "return type", LoaderError);

        switch (returnType) {
            case FileDataTypes.text:
            case FileDataTypes.module:
                return "text";
            case FileDataTypes.json:
                return allowJson ? "json" : "text";
            case FileDataTypes.binary:
                return "arraybuffer";
        }
    }

    static _fetchFromUrlDefaults = {
        requestMethod: "get",
        requestOptions: {},
        parseError: true,
        returnResponse: false
    };

    static _fetchFromUrl(url, returnType, options = {}) {
        options = ObjectUtil.setValuesWithDefaults({}, options, this._fetchFromUrlDefaults);

        const method = options.requestMethod,
            optionsConfig = options.requestOptions;

        const parseError = options.parseError,
            returnRes = options.returnResponse;

        const config = {
            url,
            method,
            responseType: this._returnTypeToRes(returnType),
            ...optionsConfig
        };

        if (util.env) config.errorType = "value";

        let res = null,
            reqErr = null;

        try {
            res = http.request(config);
        } catch (err) {
            reqErr = err;
        }

        const status = HttpUtil.getHttpErrStatus(res, reqErr);
        if (status === null) return returnRes ? res : res?.data ?? null;

        let msg = "Could not fetch file.";

        if (parseError) {
            if (status > 0) msg += ` Code: ${status}`;
            else if (reqErr?.message) msg += ` Error: ${reqErr.message}`;

            throw new LoaderError(msg, status);
        } else {
            throw reqErr ?? new Error(res?.error?.message ?? msg);
        }
    }

    static _fetchTagBody(tagName, owner, options = {}) {
        const useName = typeof tagName === "string",
            useArray = Array.isArray(tagName),
            usePattern = tagName instanceof RegExp;

        let body = "";

        if (useName) {
            if (tagName == null) {
                throw new LoaderError("Invalid tag name");
            }

            const tag = DiscordUtil.fetchTag(tagName, owner);
            body = DiscordUtil.getTagBody(tag);
        } else {
            if (!useArray && !usePattern) {
                throw new LoaderError("Invalid tag name");
            }

            let tags = [];

            if (util.env) {
                let tagNames = [];

                if (useArray) tagNames = tagName;
                else if (usePattern) tagNames = DiscordUtil.dumpTags(tagName);

                tagNames.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

                tags = tagNames
                    .map(name => {
                        try {
                            return DiscordUtil.fetchTag(name, owner);
                        } catch (err) {
                            if (err.name === "UtilError") return null;
                            throw err;
                        }
                    })
                    .filter(tag => tag != null);
            } else {
                let filter;

                if (usePattern) {
                    filter = tagName;
                } else {
                    const escaped = tagName.map(RegexUtil.escapeRegex);
                    filter = new RegExp(`^(?:${escaped.join("|")})$`);
                }

                tags = util.dumpTags({ filter, full: true });

                if (LoaderUtils.nonemptyString(owner)) {
                    tags = tags.filter(tag => tag.owner === owner);
                }

                tags.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
            }

            if (LoaderUtils.empty(tags)) {
                throw new LoaderError(`No matching tag(s) found: ${tagName}`, tagName);
            }

            body = tags.map(tag => DiscordUtil.getTagBody(tag)).join("");
        }

        return body;
    }

    static _parseModuleCode(moduleCode, returnType) {
        returnType = TypeTester.normalizeEnum(returnType, FileDataTypes, "return type", LoaderError);

        if (!util.env) {
            if (moduleCode instanceof ArrayBuffer) moduleCode = TypeTester.asUint8Array(moduleCode);
            else if (TypeTester.isObject(moduleCode) && moduleCode?.type === "Buffer") {
                moduleCode = new Uint8Array(moduleCode.data);
            }
        }

        switch (returnType) {
            case FileDataTypes.text:
            case FileDataTypes.module:
                if (TypeTester.isArray(moduleCode)) {
                    return LoaderTextEncoder.bytesToString(moduleCode);
                } else return moduleCode;
            case FileDataTypes.json:
                const jsonString = TypeTester.isArray(moduleCode)
                    ? LoaderTextEncoder.bytesToString(moduleCode)
                    : moduleCode;

                return JSON.parse(jsonString);
            case FileDataTypes.binary:
                if (TypeTester.isArray(moduleCode)) return moduleCode;
                else {
                    return LoaderTextEncoder.stringToBytes(moduleCode);
                }
        }
    }

    static _wasmBase2nMult = 5 / 3;

    static _decodeBase64Code(moduleCode) {
        if (typeof moduleCode !== "string") {
            throw new LoaderError("Base64 decoder expects a string");
        }

        if (
            typeof globalThis.Base64 !== "undefined" &&
            TypeTester.isObject(globalThis.Base64) &&
            typeof globalThis.Base64.decode === "function"
        ) {
            return globalThis.Base64.decode(moduleCode);
        } else if (typeof globalThis.Buffer !== "undefined") {
            return Uint8Array.from(globalThis.Buffer.from(moduleCode, "base64"));
        } else if (typeof globalThis.atob === "function") {
            return LoaderTextEncoder.stringToBytes(atob(moduleCode));
        } else {
            throw new LoaderError("No base64 decoder available");
        }
    }

    static _decodeBase2nCode(moduleCode, buf_size) {
        if (wasmBase2nLoaded) {
            if (typeof globalThis.fastDecodeBase2n === "undefined") {
                throw new LoaderError("WASM Base2n decoder not loaded");
            }

            buf_size ??= Math.ceil(moduleCode.length * this._wasmBase2nMult);
            return fastDecodeBase2n(moduleCode, buf_size);
        } else {
            if (typeof globalThis.decodeBase2n === "undefined") {
                throw new LoaderError("Base2n decoder not loaded");
            } else if (typeof globalThis.table === "undefined") {
                throw new LoaderError("Base2n table not initialized");
            }

            return decodeBase2n(moduleCode, table, {
                predictSize: true
            });
        }
    }

    static _decodeBase127Code(moduleCode) {
        if (typeof globalThis.fastDecodeBase127 === "undefined") {
            throw new LoaderError("WASM Base127 decoder not loaded");
        }

        return fastDecodeBase127(moduleCode);
    }

    static _encoders = Object.freeze(["base64", "base2n", "base127"]);

    static _decodeModuleCode(moduleCode, encoder, buf_size) {
        encoder = TypeTester.normalizeEnum(encoder, this._encoders, "encoder", LoaderError, {
            normalize: value => String(value).toLowerCase()
        });

        switch (encoder) {
            case "base64":
                return this._decodeBase64Code(moduleCode);
            case "base2n":
                return this._decodeBase2nCode(moduleCode, buf_size);
            case "base127":
                return this._decodeBase127Code(moduleCode);
        }
    }

    static _getLoadArgs(name, options) {
        if (!TypeTester.isObject(options)) {
            throw new LoaderError("Options must be an object");
        }

        const commonOpts = {
            name: options.name ?? name,
            cache: options.cache,
            forceReload: options.forceReload
        };

        const codeOpts = ObjectUtil.removeUndefinedValues({
            ...commonOpts,

            requestOptions: options.requestOptions,
            parseError: options.parseError,
            returnResponse: options.returnResponse,

            owner: options.owner,
            encoded: options.encoded,
            buf_size: options.buf_size
        });

        const loadOpts = ObjectUtil.removeUndefinedValues({
            ...commonOpts,

            isolateGlobals: options.isolateGlobals
        });

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
    setTimeout: null,
    setImmediate: null,
    clearTimeout: null,
    clearImmediate: null,

    console: null,

    Promise: null,
    Buffer: null,
    TextEncoder: null,
    TextDecoder: null,
    Blob: null,
    XMLHttpRequest: null,
    Event: null,
    Worker: null,
    ImageData: null
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
                    ? null
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

    patchMsgReply: () => {
        let originalReply = globalThis.msg.reply,
            customReply;

        if (originalReply?.patched === true) return;

        if (true) {
            customReply = (text, reply) => {
                let content = null;

                if (TypeTester.isObject(text)) {
                    reply = text;

                    content = String(reply.content || "");
                    delete reply.content;
                } else {
                    reply ??= {};
                    content = String(text || "");
                }

                originalReply(content, reply);
                exit();
            };
        } else {
            customReply = (text, reply) => {
                let content = null;

                if (TypeTester.isObject(text)) {
                    reply = text;

                    content = String(reply.content || "");
                    delete reply.content;
                } else {
                    reply ??= {};
                    content = String(text || "");
                }

                const file = reply?.file;

                if (!TypeTester.isObject(file)) {
                    originalReply(content, reply);
                    return exit();
                } else delete reply.file;

                let fileName = file.name ?? "message.txt",
                    fileData = file.data;

                const fileExt = fileName.includes(".") ? LoaderUtils.last(fileName.split(".")).toLowerCase() : "";

                if (typeof fileData === "string") {
                    fileData = LoaderTextEncoder.stringToUtf8(fileData);
                } else if (!TypeTester.isArray(fileData)) {
                    fileData = LoaderTextEncoder.stringToBytes("Empty file");
                }

                const uploadUrl = UploadUtil.uploadToCatbox(fileData, fileExt, {
                    userhash: EncryptionUtil.caesarCipher("IKquOPtItGsJvIMuuMsPsOvNH", -16, 2)
                });

                content = `${content}\n${uploadUrl}`.trimStart();
                originalReply(content, reply);

                exit();
            };
        }

        customReply.patched = true;
        globalThis.msg.reply = customReply;
    },

    patchWasmModule: () => {
        if (WebAssembly.Module.patched === true) return;

        const original = WebAssembly.Module;

        WebAssembly.Module = Benchmark.wrapFunction("wasm_compile", bufferSource => new original(bufferSource));
        WebAssembly.Module.prototype = original.prototype;

        Patches._origWasmModule = original;
        WebAssembly.Module.patched = true;
    },

    patchWasmInstantiate: () => {
        if (WebAssembly.instantiate.patched === true) return;

        const original = WebAssembly.instantiate,
            originalModule = Patches._origWasmModule ?? WebAssembly.Module;

        WebAssembly.instantiate = Benchmark.wrapFunction("wasm_instantiate", (bufferSource, importObject) => {
            const wasmModule =
                    bufferSource instanceof WebAssembly.Module ? bufferSource : new originalModule(bufferSource),
                instance = new WebAssembly.Instance(wasmModule, importObject);

            return Promise.resolve({
                module: wasmModule,
                instance
            });
        });

        Patches._origWasmInstantiate = original;
        WebAssembly.instantiate.patched = true;
    },

    patchGlobalContext: objs => {
        if (!TypeTester.isObject(objs)) {
            throw new LoaderError("Invalid patch objects");
        }

        ObjectUtil.assign(globalThis, objs, "enum", {
            configurable: true
        });
    },

    removeFromGlobalContext: keys => {
        if (typeof keys === "string") {
            TypeTester.normalizeEnum(keys, Patches._removeOptions, "removal option", LoaderError);
            keys = Object.keys(globalThis);
        } else if (!Array.isArray(keys)) {
            throw new LoaderError("Invalid removal keys");
        }

        for (const key of keys) {
            if (key !== "global") delete globalThis[key];
        }
    },

    addContextGlobals: objs => {
        if (TypeTester.isObject(objs)) {
            ObjectUtil.assign(globals, objs, "enum");
        }

        Patches._safePatchGlobals(globals);
    },

    addGlobalObjects: (library = config.loadLibrary) => {
        TypeTester.normalizeEnum(library, validLibraries, "library", LoaderError);

        globalObjs.CustomError ??= CustomError;
        globalObjs.RefError ??= ReferenceError;
        globalObjs.ExitError ??= ExitError;

        globalObjs.Benchmark ??= Benchmark;
        globalObjs.HttpUtil ??= HttpUtil;
        globalObjs.LoaderUtils ??= LoaderUtils;
        globalObjs.LoaderTextEncoder ??= LoaderTextEncoder;
        globalObjs.ArrayUtil ??= ArrayUtil;
        globalObjs.ObjectUtil ??= ObjectUtil;
        globalObjs.TypeTester ??= TypeTester;
        globalObjs.EncryptionUtil ??= EncryptionUtil;
        globalObjs.UploadUtil ??= UploadUtil;
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

        Patches._safePatchGlobals(globalObjs);
    },

    apply: (...patches) => {
        Benchmark.restartTiming("apply_patches");

        try {
            const patchFuncs = patches.map(patch => {
                const err = new LoaderError("Unknown patch: " + patch, patch);

                if (!LoaderUtils.hasPrefix(Patches._patchPrefixes, patch)) {
                    throw err;
                }

                const func = Patches[patch];

                if (typeof func !== "function" || !LoaderUtils.empty(func)) {
                    throw err;
                }

                return func;
            });

            Patches.clearLoadedPatches();
            patchFuncs.forEach(func => func());
            Patches.addContextGlobals();
        } finally {
            Benchmark.stopTiming("apply_patches");
        }
    },

    applyAll: (library = config.loadLibrary) => {
        library = TypeTester.normalizeEnum(library, validLibraries, "library", LoaderError);

        let timeKey = "apply_patches";

        if (library !== config.loadLibrary) {
            timeKey += `_${library.toLowerCase()}`;
        }

        Patches.clearLoadedPatches();
        Benchmark.restartTiming(timeKey);

        try {
            Patches.polyfillConsole();
            Patches.polyfillTimers();

            switch (library) {
                case "none":
                    break;
                case "canvaskit":
                    Patches.polyfillPromise();
                    break;
                case "cycdraw":
                    break;
                case "resvg":
                    Patches.polyfillPromise();
                    Patches.polyfillBuffer();
                    Patches.polyfillTextEncoderDecoder();
                    break;
                case "lodepng":
                    if (config.useWasmBase2nDecoder) {
                        Patches.polyfillPromise();
                    }

                    Patches.polyfillImageData();
                    break;
                case "gifenc":
                    break;
                case "h264":
                    Patches.polyfillPromise();
                    break;
                case "satori":
                    Patches.polyfillPromise();
                    Patches.polyfillBuffer();
                    Patches.polyfillTextEncoderDecoder();
                    break;
                case "babel":
                    break;
                case "dropflow":
                    Patches.polyfillPromise();
                    Patches.polyfillBuffer();
                    Patches.polyfillTextEncoderDecoder();
                    break;
            }

            Patches.addContextGlobals();
            Patches.addGlobalObjects(library);

            Patches.patchMsgReply();

            Patches.patchWasmModule();
            Patches.patchWasmInstantiate();
        } finally {
            Benchmark.stopTiming(timeKey);
        }
    },

    checkGlobalPolyfill(name, msg) {
        if (typeof globals[name] === "undefined") {
            const customMsg = msg ? msg + " " : "";
            throw new LoaderError(`${customMsg}${name} polyfill not loaded`, name);
        }
    },

    _loadedPatches: [],
    _patchPrefixes: Object.freeze(["patch", "polyfill"]),
    _removeOptions: Object.freeze(["nondefault"]),

    _loadedPatch: (...names) => {
        Patches._loadedPatches = ArrayUtil.unique(Patches._loadedPatches.concat(names));
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
function loadBase64Utils() {
    if (typeof globalThis.Base64 !== "undefined") return;

    Benchmark.startTiming("load_base64");
    let Base64;

    try {
        Base64 = ModuleLoader.loadModuleFromTag(
            tags.Base64TagName,

            {
                cache: false /*,
                breakpoint: config.enableDebugger */
            }
        );

        if (!Base64) {
            throw new LoaderError("Base64 couldn't be loaded");
        }
    } finally {
        Benchmark.stopTiming("load_base64");
    }

    Patches.patchGlobalContext({ Base64 });
}

const base2nCharsets = Object.freeze(["normal", "linear", "base64"]);

let wasmBase2nLoaded = false;

function loadBase2nDecoder() {
    function loadJsBase2nDecoder(charset = "normal") {
        if (typeof globalThis.decodeBase2n !== "undefined") return;

        charset = TypeTester.normalizeEnum(charset, base2nCharsets, "charset", LoaderError);

        Benchmark.startTiming("load_base2n");
        let base2n, patchedDecode, table;

        try {
            base2n = ModuleLoader.loadModuleFromTag(
                tags.Base2nTagName,

                {
                    /* breakpoint: config.enableDebugger */
                }
            );

            if (!base2n) {
                throw new LoaderError("Base2n couldn't be loaded");
            } else ({ base2n } = base2n);

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
            }

            table = base2n.Base2nTable.generate(charsetRanges, {
                tableType: base2n.Base2nTableTypes.typedarray,
                generateTables: [base2n.Base2nTableNames.decode],
                sortRanges
            });

            const originalDecode = base2n.decodeBase2n;
            patchedDecode = Benchmark.wrapFunction("decode", originalDecode);
        } finally {
            Benchmark.stopTiming("load_base2n");
        }

        Patches.patchGlobalContext({
            ...base2n,
            decodeBase2n: patchedDecode,
            table
        });
    }

    function unloadJsBase2nDecoder() {
        const keys = ["table"].concat(
            Object.keys(globalThis).filter(key => {
                key = key.toLowerCase();
                return key.includes("base2n") && !key.includes("fast");
            })
        );

        Patches.removeFromGlobalContext(keys);
    }

    function loadWasmBase2nDecoder() {
        if (typeof globalThis.fastDecodeBase2n !== "undefined") return;
        Patches.checkGlobalPolyfill("Promise", "Can't load WASM Base2n decoder.");

        Benchmark.startTiming("load_base2n_wasm");
        let patchedDecode;

        try {
            const Base2nWasmDec = ModuleLoader.loadModuleFromTag(
                tags.Base2nWasmWrapperTagName,

                {
                    scope: {
                        CustomError
                    },

                    cache: false /*,
                breakpoint: config.enableDebugger */
                }
            );

            const DecoderInit = ModuleLoader.loadModuleFromTag(
                tags.Base2nWasmInitTagName,

                {
                    cache: false /*,
                breakpoint: config.enableDebugger */
                }
            );

            console.replyWithLogs("warn");
            if (!Base2nWasmDec || !DecoderInit) {
                throw new LoaderError("Couldn't load WASM Base2n decoder");
            }

            const decoderWasm = ModuleLoader.getModuleCodeFromTag(tags.Base2nWasmWasmTagName, FileDataTypes.binary, {
                encoded: true,
                cache: false
            });

            Base2nWasmDec.init(DecoderInit, decoderWasm);
            console.replyWithLogs("warn");

            const originalDecode = Base2nWasmDec.decodeBase2n.bind(Base2nWasmDec);
            patchedDecode = Benchmark.wrapFunction("decode", originalDecode);
        } finally {
            Benchmark.stopTiming("load_base2n_wasm");
        }

        Patches.patchGlobalContext({ fastDecodeBase2n: patchedDecode });
        wasmBase2nLoaded = true;
    }

    const base2nCharset = config.useWasmBase2nDecoder ? "base64" : "normal";

    loadJsBase2nDecoder(base2nCharset);

    if (config.useWasmBase2nDecoder) {
        loadWasmBase2nDecoder();
        unloadJsBase2nDecoder();
    }
}

function loadBase127Decoder() {
    if (typeof globalThis.fastDecodeBase127 !== "undefined") return;

    Benchmark.startTiming("load_base127_wasm");
    let patchedDecode;

    try {
        const Base127Wasm = ModuleLoader.loadModuleFromTag(
            tags.Base127WasmWrapperTagName,

            {
                cache: false /*,
                breakpoint: config.enableDebugger */
            }
        );

        console.replyWithLogs("warn");
        if (!Base127Wasm) {
            throw new LoaderError("Couldn't load WASM Base127 decoder");
        }

        const decoderWasm = ModuleLoader.getModuleCodeFromTag(tags.Base127WasmWasmTagName, FileDataTypes.binary, {
            encoded: "base64",
            cache: false
        });

        Base127Wasm.loadWasm(decoderWasm);
        console.replyWithLogs("warn");

        const originalDecode = Base127Wasm.decode.bind(Base127Wasm);
        patchedDecode = Benchmark.wrapFunction("decode_base127", originalDecode);
    } finally {
        Benchmark.stopTiming("load_base127_wasm");
    }

    Patches.patchGlobalContext({ fastDecodeBase127: patchedDecode });
}

function loadXzDecompressor() {
    if (typeof globalThis.XzDecompressor !== "undefined") return;

    Benchmark.startTiming("load_xz_decompressor");
    let XzDecompressor;

    try {
        XzDecompressor = ModuleLoader.loadModuleFromTag(
            tags.XzDecompressorTagName,

            {
                cache: false /*,
            breakpoint: config.enableDebugger */
            }
        );

        console.replyWithLogs("warn");
        if (!XzDecompressor) {
            throw new LoaderError("Couldn't load XZ decompressor");
        }

        const xzWasm = ModuleLoader.getModuleCodeFromTag(tags.XzWasmTagName, FileDataTypes.binary, {
            encoded: true,
            buf_size: 13 * 1024,
            cache: false
        });

        XzDecompressor.loadWasm(xzWasm);
        console.replyWithLogs("warn");

        const originalDecompress = XzDecompressor.decompress,
            patchedDecompress = Benchmark.wrapFunction("xz_decompress", originalDecompress);

        XzDecompressor.decompress = patchedDecompress;
    } finally {
        Benchmark.stopTiming("load_xz_decompressor");
    }

    Patches.patchGlobalContext({ XzDecompressor });
}

function loadZstdDecompressor() {
    if (typeof globalThis.ZstdDecompressor !== "undefined") return;

    Benchmark.startTiming("load_zstd_decompressor");
    let ZstdDecompressor;

    try {
        ZstdDecompressor = ModuleLoader.loadModuleFromTag(
            tags.ZstdDecompressorTagName,

            {
                cache: false /*,
            breakpoint: config.enableDebugger */
            }
        );

        console.replyWithLogs("warn");
        if (!ZstdDecompressor) {
            throw new LoaderError("Couldn't load Zstd decompressor");
        }

        const zstdWasm = ModuleLoader.getModuleCodeFromTag(tags.ZstdWasmTagName, FileDataTypes.binary, {
            encoded: true,
            buf_size: 50 * 1024,
            cache: false
        });

        ZstdDecompressor.loadWasm(zstdWasm);
        console.replyWithLogs("warn");

        const originalDecompress = ZstdDecompressor.decompress,
            patchedDecompress = Benchmark.wrapFunction("zstd_decompress", originalDecompress);

        ZstdDecompressor.decompress = patchedDecompress;
    } finally {
        Benchmark.stopTiming("load_zstd_decompressor");
    }

    Patches.patchGlobalContext({ ZstdDecompressor });
}

function decompress(data, type) {
    if (ModuleLoader.loadSource !== "tag") return data;

    const decompressors = {
        xz: globalThis.XzDecompressor,
        zstd: globalThis.ZstdDecompressor
    };

    let decompressor;

    if (type == null) {
        decompressor = Object.values(decompressors).find(Boolean);

        if (typeof decompressor === "undefined") {
            throw new LoaderError("No decompressors loaded");
        }
    } else {
        type = TypeTester.normalizeEnum(type, Object.keys(decompressors), "decompressor type", LoaderError);

        decompressor = decompressors[type];

        if (typeof decompressor === "undefined") {
            const typeText = type.length <= 2 ? type.toUpperCase() : LoaderUtils.capitalize(type);
            throw new LoaderError(`${typeText} decompressor not loaded.`, type);
        }
    }

    return decompressor.decompress(data);
}

// canvaskit loader
function loadCanvasKit() {
    if (typeof globalThis.CanvasKit !== "undefined") return;

    Benchmark.startTiming("load_canvaskit");
    let CanvasKit;

    try {
        const CanvasKitInit = ModuleLoader.loadModule(
            urls.CanvasKitLoaderUrl,
            tags.CanvasKitLoaderTagName,

            {
                cache: false,
                breakpoint: config.enableDebugger
            }
        );

        console.replyWithLogs("warn");
        if (!CanvasKitInit) {
            throw new LoaderError("Couldn't load CanvasKit");
        }

        let wasmTagName, buf_size, decompType;

        if (features.useXzDecompressor) {
            wasmTagName = tags.CanvasKitWasm1TagName;
            buf_size = 2100 * 1024;
            decompType = "xz";
        } else if (features.useZstdDecompressor) {
            wasmTagName = tags.CanvasKitWasm2TagName;
            buf_size = 2300 * 1024;
            decompType = "zstd";
        }

        let wasm = ModuleLoader.getModuleCode(urls.CanvasKitWasmUrl, wasmTagName, FileDataTypes.binary, {
            encoded: true,
            buf_size,
            cache: false
        });
        wasm = decompress(wasm, decompType);

        Benchmark.startTiming("canvaskit_init");

        CanvasKitInit({
            wasmBinary: wasm
        })
            .then(ck => (CanvasKit = ck))
            .catch(err => console.error("Error occured while loading CanvasKit:", err));

        Benchmark.stopTiming("canvaskit_init");
        console.replyWithLogs("warn");

        if (!CanvasKit) {
            throw new LoaderError("Couldn't load CanvasKit");
        }
    } finally {
        Benchmark.stopTiming("load_canvaskit");
    }

    Patches.patchGlobalContext({ CanvasKit });
}

// cycdraw loader
function loadCycdraw() {
    if (typeof globalThis.f_1 !== "undefined") return;

    Benchmark.startTiming("load_cycdraw");
    let cycdraw;

    try {
        cycdraw = ModuleLoader.loadModule(
            urls.CycdrawUrl,
            tags.CycdrawTagName,

            {
                scope: {
                    CustomError,
                    LoaderUtils
                },
                cache: false,
                breakpoint: config.enableDebugger
            }
        );

        console.replyWithLogs("warn");
        if (!cycdraw) {
            throw new LoaderError("Couldn't load cycdraw");
        }
    } finally {
        Benchmark.stopTiming("load_cycdraw");
    }

    Patches.patchGlobalContext(cycdraw);
}

// resvg loader
function loadResvg() {
    if (typeof globalThis.Resvg !== "undefined") return;

    Benchmark.startTiming("load_resvg");
    let Resvg;

    try {
        const ResvgInit = ModuleLoader.loadModule(
            urls.ResvgLoaderUrl,
            tags.ResvgLoaderTagName,

            {
                cache: false,
                breakpoint: config.enableDebugger
            }
        );

        console.replyWithLogs("warn");
        if (!ResvgInit) {
            throw new LoaderError("Couldn't load resvg");
        }

        let wasm = ModuleLoader.getModuleCode(urls.ResvgWasmUrl, tags.ResvgWasmTagName, FileDataTypes.binary, {
            encoded: true,
            buf_size: 700 * 1024,
            cache: false
        });
        wasm = decompress(wasm, "xz");

        Benchmark.startTiming("resvg_init");

        try {
            ResvgInit.initWasm(wasm);
        } catch (err) {
            console.error("Error occured while loading resvg:", err);
        }

        Benchmark.stopTiming("resvg_init");
        console.replyWithLogs("warn");

        Resvg = ResvgInit.Resvg;
        if (!Resvg) {
            throw new LoaderError("Couldn't load resvg");
        }
    } finally {
        Benchmark.stopTiming("load_resvg");
    }

    Patches.patchGlobalContext({ Resvg });
}

// lodepng loader
function loadLodepng() {
    if (typeof globalThis.lodepng !== "undefined") return;

    Benchmark.startTiming("load_lodepng");
    let lodepng;

    try {
        const wasm = ModuleLoader.getModuleCode(urls.LodepngWasmUrl, tags.LodepngWasmTagName, FileDataTypes.binary, {
            encoded: true,
            cache: false
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

        try {
            lodepng = ModuleLoader.loadModule(
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
        } catch (err) {
            console.error("Error occured while loading lodepng:", err);
        }

        console.replyWithLogs("warn");
        if (!lodepng) {
            throw new LoaderError("Couldn't load lodepng");
        }
    } finally {
        Benchmark.stopTiming("load_lodepng");
    }

    Patches.patchGlobalContext({ lodepng });
}

// gifenc loader
function loadGifEncoder() {
    if (typeof globalThis.gifenc !== "undefined") return;

    Benchmark.startTiming("load_gifenc");
    let gifenc;

    try {
        gifenc = ModuleLoader.loadModule(
            urls.GifEncoderUrl,
            tags.GifEncoderTagName,

            {
                cache: false,
                breakpoint: config.enableDebugger
            }
        );

        console.replyWithLogs("warn");
        if (!gifenc) {
            throw new LoaderError("Couldn't load gifenc");
        }
    } finally {
        Benchmark.stopTiming("load_gifenc");
    }

    Patches.patchGlobalContext({ gifenc });
}

// h264 loader
function loadH264MP4Encoder() {
    if (typeof globalThis.H264MP4Encoder !== "undefined") return;

    Benchmark.startTiming("load_h264");
    let hme, H264MP4Encoder;

    try {
        const H264MP4EncoderInit = ModuleLoader.loadModule(
            urls.H264MP4EncoderLoaderUrl,
            tags.H264MP4EncoderLoaderTagName,

            {
                cache: false,
                breakpoint: config.enableDebugger
            }
        );

        console.replyWithLogs("warn");
        if (!H264MP4EncoderInit) {
            throw new LoaderError("Couldn't load H264MP4Encoder");
        }

        let wasm = ModuleLoader.getModuleCode(
            urls.H264MP4EncoderWasmUrl,
            tags.H264MP4EncoderWasmTagName,
            FileDataTypes.binary,
            {
                encoded: "base127",
                cache: false
            }
        );
        wasm = decompress(wasm, "zstd");

        Benchmark.startTiming("h264_init");

        H264MP4EncoderInit({
            wasmBinary: wasm
        })
            .then(h264 => (hme = h264))
            .catch(err => console.error("Error occured while loading H264MP4Encoder:", err));

        Benchmark.stopTiming("h264_init");
        console.replyWithLogs("warn");

        if (!hme) {
            throw new LoaderError("Couldn't load H264MP4Encoder");
        }

        H264MP4Encoder = {
            createH264MP4Encoder: () => {
                const encoder = new hme.H264MP4Encoder();
                encoder.FS = hme.FS;
                return encoder;
            }
        };
    } finally {
        Benchmark.stopTiming("load_h264");
    }

    Patches.patchGlobalContext({ H264MP4Encoder });
}

// satori loader
function loadSatori() {
    if (typeof globalThis.satori !== "undefined") return;

    Benchmark.startTiming("load_satori");
    let Satori;

    try {
        let code = null;

        if (ModuleLoader.loadSource === "tag") {
            code = ModuleLoader.getModuleCodeFromTag(tags.SatoriLoaderTagName, FileDataTypes.binary, {
                encoded: "base127",
                cache: false
            });

            code = decompress(code, "xz");
            code = ModuleLoader._parseModuleCode(code, FileDataTypes.module);
        } else {
            code = ModuleLoader.getModuleCodeFromUrl(urls.SatoriLoaderUrl, FileDataTypes.module, {
                cache: false
            });
        }

        const SatoriInit = ModuleLoader.loadModuleFromSource(
            code,
            {
                process: { env: {} }
            },
            config.enableDebugger,
            {
                cache: false
            }
        );

        console.replyWithLogs("warn");
        if (!SatoriInit) {
            throw new LoaderError("Couldn't load Satori");
        }

        const wasm = ModuleLoader.getModuleCode(urls.SatoriWasmUrl, tags.SatoriWasmTagName, FileDataTypes.binary, {
            encoded: "base127",
            cache: false
        });

        Benchmark.startTiming("satori_init");

        SatoriInit.init(wasm)
            .then(() => (Satori = SatoriInit.default))
            .catch(err => console.error("Error occured while loading Satori:", err));

        Benchmark.stopTiming("satori_init");
        console.replyWithLogs("warn");

        if (!Satori) {
            throw new LoaderError("Couldn't load Satori");
        }
    } finally {
        Benchmark.stopTiming("load_satori");
    }

    Patches.patchGlobalContext({ Satori });
}

// babel loader
function loadBabelStandalone() {
    if (typeof globalThis.Babel !== "undefined") return;

    Benchmark.startTiming("load_babel");
    let BabelStandalone;

    try {
        let code;

        if (ModuleLoader.loadSource === "tag") {
            code = ModuleLoader.getModuleCodeFromTag(tags.BabelStandaloneTagName, FileDataTypes.binary, {
                encoded: true,
                cache: false
            });

            code = decompress(code, "xz");
            code = ModuleLoader._parseModuleCode(code, FileDataTypes.module);
        } else {
            code = ModuleLoader.getModuleCodeFromUrl(urls.BabelStandaloneUrl, FileDataTypes.module, {
                cache: false
            });
        }

        BabelStandalone = ModuleLoader.loadModuleFromSource(code, null, config.enableDebugger, {
            cache: false
        });

        console.replyWithLogs("warn");
        if (!BabelStandalone) {
            throw new LoaderError("Couldn't load Babel");
        }
    } finally {
        Benchmark.stopTiming("load_babel");
    }

    Patches.patchGlobalContext({ Babel: BabelStandalone });
}

// dropflow loader
function loadDropflow() {
    if (typeof globalThis.dropflow !== "undefined") return;

    Benchmark.startTiming("load_dropflow");
    let dropflow;

    try {
        let code = null;

        if (ModuleLoader.loadSource === "tag") {
            code = ModuleLoader.getModuleCodeFromTag(tags.DropflowLoaderTagName, FileDataTypes.binary, {
                encoded: "base127",
                cache: false
            });

            code = decompress(code, "zstd");
            code = ModuleLoader._parseModuleCode(code, FileDataTypes.module);
        } else {
            code = ModuleLoader.getModuleCodeFromUrl(urls.DropflowLoaderUrl, FileDataTypes.module, {
                cache: false
            });
        }

        const DropflowInit = ModuleLoader.loadModuleFromSource(
            code,
            {
                process: { env: {} }
            },
            config.enableDebugger,
            {
                cache: false
            }
        );

        console.replyWithLogs("warn");
        if (!DropflowInit) {
            throw new LoaderError("Couldn't load dropflow");
        }

        let wasm = ModuleLoader.getModuleCode(urls.DropflowWasmUrl, tags.DropflowWasmTagName, FileDataTypes.binary, {
            encoded: "base127",
            cache: false
        });
        wasm = decompress(wasm, "zstd");

        Benchmark.startTiming("dropflow_init");

        DropflowInit.createDropflow(wasm)
            .then(flow => (dropflow = flow))
            .catch(err => console.error("Error occured while loading dropflow:", err));

        Benchmark.stopTiming("dropflow_init");
        console.replyWithLogs("warn");

        if (!dropflow) {
            throw new LoaderError("Couldn't load dropflow");
        }
    } finally {
        Benchmark.stopTiming("load_dropflow");
    }

    Patches.patchGlobalContext({ dropflow });
}

const libraryLoaderFuncs = Object.freeze({
    none: () => {},
    canvaskit: loadCanvasKit,
    cycdraw: loadCycdraw,
    resvg: loadResvg,
    lodepng: loadLodepng,
    gifenc: loadGifEncoder,
    h264: loadH264MP4Encoder,
    satori: loadSatori,
    babel: loadBabelStandalone,
    dropflow: loadDropflow
});

const validLibraries = Object.freeze(Object.keys(libraryLoaderFuncs));

// main
function mainPatch(libraries) {
    libraries.forEach(Patches.applyAll);

    Patches.clearLoadedPatches();
}

const loadFuncLibs = new Set(["none"]);

function decideMiscConfig(library) {
    switch (library) {
        case "none":
            break;
        case "canvaskit":
            features.useBase2nDecoder = true;

            if (config.forceXzDecompressor) features.useXzDecompressor = true;
            else features.useZstdDecompressor = true;

            break;
        case "cycdraw":
            break;
        case "resvg":
            features.useBase2nDecoder = true;
            features.useXzDecompressor = true;
            break;
        case "lodepng":
            features.useBase2nDecoder = true;
            break;
        case "gifenc":
            break;
        case "h264":
            features.useBase127Decoder = true;
            features.useBase2nDecoder = true;
            features.useZstdDecompressor = true;
            break;
        case "satori":
            features.useBase127Decoder = true;
            features.useBase2nDecoder = true;
            features.useXzDecompressor = true;
            break;
        case "babel":
            features.useBase2nDecoder = true;
            break;
        case "dropflow":
            features.useBase127Decoder = true;
            features.useBase2nDecoder = true;
            features.useZstdDecompressor = true;
            break;
    }

    if (features.useBase127Decoder) features.useBase64Utils = true;
}

function mainLoadMisc(libraries) {
    resetFeatures();

    if (!LoaderUtils.empty(libraries) && libraries.every(library => loadFuncLibs.has(library))) {
        features.useLoadFuncs = true;
    }

    libraries.forEach(decideMiscConfig);

    if (ModuleLoader.loadSource === "tag") {
        if (features.useBase64Utils) loadBase64Utils();
        if (features.useBase2nDecoder) loadBase2nDecoder();
        if (features.useBase127Decoder) loadBase127Decoder();
        if (features.useXzDecompressor) loadXzDecompressor();
        if (features.useZstdDecompressor) loadZstdDecompressor();
    }
}

function mainLoadLibrary(libraries) {
    libraries.forEach(library => libraryLoaderFuncs[library]());
}

function wrapLoadFunc(func) {
    return function (library) {
        ModuleLoader.useDefault(() => func(library));
    };
}

function addLoadFuncs() {
    const loadFuncs = {
        loadBase64Utils: wrapLoadFunc(loadBase64Utils),
        loadBase2nDecoder: wrapLoadFunc(loadBase2nDecoder),
        loadBase127Decoder: wrapLoadFunc(loadBase127Decoder),
        loadXzDecompressor: wrapLoadFunc(loadXzDecompressor),
        loadZstdDecompressor: wrapLoadFunc(loadZstdDecompressor)
    };

    const wrapperFuncs = {
        loadLibrary: wrapLoadFunc(mainLoad),
        decompress
    };

    Patches.patchGlobalContext({ ...loadFuncs, ...wrapperFuncs });
}

function mainLoad(loadLibrary) {
    const libraries = TypeTester.normalizeEnums(
        ArrayUtil.guaranteeArray(loadLibrary),
        validLibraries,
        "library",
        LoaderError
    );

    Benchmark.restartTiming("load_total");

    mainPatch(libraries);
    mainLoadMisc(libraries);
    mainLoadLibrary(libraries);

    Benchmark.stopTiming("load_total");
}

function main() {
    ModuleLoader.useDefault(() => mainLoad(config.loadLibrary));
    if (features.useLoadFuncs) addLoadFuncs();
}

function insideEval() {
    if (config.loadLibrary === "none") return true;

    const evalExp = new RegExp(
        globalThis.util && globalThis.util.env
            ? `^.+\\n\\s+at\\s${insideEval.name}\\s\\(eval\\sat\\s.+\\)\\n\\s+at eval\\s\\(eval at\\s.+\\)`
            : `^.+\\n\\s+at\\s${insideEval.name}\\s\\(eval\\sat\\s.+?\\(eval\\sat\\s.+\\)\\n\\s+at\\seval\\s\\(eval\\sat\\s.+?\\(eval\\sat\\s.+\\)`
    );

    try {
        // eslint-disable-next-line no-restricted-syntax
        throw new Error();
    } catch (err) {
        return Boolean(err.stack.match(evalExp));
    }
}

try {
    if (config.integrityChecks) IntegrityChecker.check("before");
    if (config.enableDebugger) debugger;

    // eval check
    if (!insideEval()) {
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
        });
        exit();
    }

    // run main
    main();

    if (config.enableDebugger) debugger;
    exit(".");
} catch (err) {
    // output
    if (err instanceof ExitError) err.message;
    else throw err;
}
