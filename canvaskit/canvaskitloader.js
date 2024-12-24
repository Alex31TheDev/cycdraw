"use strict";
/* global fastDecodeBase2n:readonly, decodeBase2n:readonly, table:readonly */

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

const scripts = `%t canvaskitexample
%t caption`;

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

        if (typeof options.formatLog !== "undefined") {
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
        if (this.logs.length < 1) {
            return "";
        }

        if (typeof level === "undefined" && typeof last === "undefined") {
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

        if (logs.length < 1) {
            return "";
        }

        const format = logs.map(info => this._formatLog(info)).join("\n");
        return format;
    }

    replyWithLogs(level, last) {
        const log_str = this.getLogs(level, last);

        if (log_str.length < 1) {
            return;
        }

        const codeBlock = LoaderUtils.codeBlock(log_str);

        msg.reply(codeBlock);
        throw new ExitError();
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
const FileDataTypes = {
    text: "text",
    json: "json",
    binary: "binary",
    module: "module"
};

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

const LoaderUtils = {
    md5,

    outCharLimit: util.outCharLimit ?? 1000,
    outLineLimit: util.outLineLimit ?? 6,

    capitalize: str => {
        str = String(str).toLowerCase();
        return str[0].toUpperCase() + str.substring(1);
    },

    removeRangeStr: (str, i, length = 1) => {
        return str.slice(0, i) + str.slice(i + length);
    },

    replaceRangeStr: (str, replacement, i, length = 1) => {
        return str.slice(0, i) + replacement + str.slice(i + length);
    },

    clamp: (x, a, b) => {
        return Math.max(Math.min(x, b), a);
    },

    round: (num, digits) => {
        const exp = 10 ** digits;
        return Math.round((num + Number.EPSILON) * exp) / exp;
    },

    firstElement: (arr, start = 0) => {
        return arr[start];
    },

    lastElement: (arr, start = 0) => {
        return arr[arr.length + start - 1];
    },

    randomElement: (arr, a = 0, b = arr.length) => {
        return arr[a + ~~(Math.random() * (b - a))];
    },

    isArray: arr => {
        return Array.isArray(arr) || ArrayBuffer.isView(arr);
    },

    urlRegex: /(\S*?):\/\/(?:([^/.]+)\.)?([^/.]+)\.([^/\s]+)\/?(\S*)?/,
    validUrl: url => {
        const exp = new RegExp(`^${LoaderUtils.urlRegex.toString()}$`);
        return exp.test(url);
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

    _parseScriptRegex: /^(?:`{3}([\S]+\n)?([\s\S]+)`{3}|`([^`]+)`)$/,
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

    randomString: n => {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        let result = "";
        while (result.length < n) {
            result += alphabet[~~(Math.random() * alphabet.length)];
        }

        return result;
    },

    exceedsLimits: str => {
        return str.length > LoaderUtils.outCharLimit || str.split("\n").length > LoaderUtils.outLineLimit;
    },

    codeBlock: str => {
        const formatted = `\`\`\`\n${str}\`\`\``;

        if (!LoaderUtils.exceedsLimits(formatted)) {
            return formatted;
        }

        return str;
    },

    assign: (target, source, options, props) => {
        switch (typeof options) {
            case "undefined":
                options = ["both"];
                break;
            case "string":
                options = [options];
                break;
        }

        let enumerable,
            nonEnumerable,
            both = options.includes("both");

        if (both) {
            enumerable = nonEnumerable = true;
        } else {
            enumerable = options.includes("enum");
            nonEnumerable = options.includes("nonenum");

            both = enumerable && nonEnumerable;
        }

        const keys = options.includes("keys");

        if ((!enumerable && !nonEnumerable && !both && !keys) || (both && keys)) {
            throw new UtilError("Invalid options: " + options.join(", "));
        }

        if (keys) {
            Object.assign(target, source);
        }

        const allDescriptors = Object.entries(Object.getOwnPropertyDescriptors(source));
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

    fetchAttachment: (msg, returnType = FileDataTypes.text, allowedContentTypes) => {
        let attach, url, contentType;

        if (typeof msg.file !== "undefined") {
            attach = msg.file;
        } else if (msg.attachments.length > 0) {
            attach = msg.attachments[0];
        } else if (typeof msg.fileUrl !== "undefined") {
            url = msg.fileUrl;
        }

        if (typeof attach !== "undefined") {
            url = attach.url;
            contentType = attach.contentType;
        }

        if (typeof url === "undefined") {
            throw new UtilError("Message doesn't have any attachments");
        }

        if (typeof allowedContentTypes !== "undefined") {
            if (typeof contentType === "undefined") {
                throw new UtilError("Attachment doesn't have a content type");
            }

            if (typeof allowedContentTypes === "string") {
                allowedContentTypes = [allowedContentTypes];
            }

            if (!allowedContentTypes.some(type => contentType.includes(type))) {
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

    fullDump: (search, excludedNames = [], excludedUsers = []) => {
        let all = LoaderUtils.dumpTags(search);

        const enableNameBlacklist = excludedNames.length > 0,
            enableUserBlacklist = excludedUsers.length > 0;

        if (enableNameBlacklist) {
            all = all.filter(name =>
                excludedNames.every(bl => {
                    if (bl instanceof RegExp) {
                        return !bl.test(name);
                    }

                    return bl !== name;
                })
            );
        }

        return all.reduce((tags, name) => {
            let tag;

            try {
                tag = util.fetchTag(name);
            } catch (err) {}

            if (tag !== null && typeof tag !== "undefined") {
                const userExcluded = enableUserBlacklist && excludedUsers.includes(tag.owner);

                if (!userExcluded && tag.owner !== config.tagOwner) {
                    tags.push(tag);
                }
            }

            return tags;
        }, []);
    },

    fetchTag: (name, owner) => {
        const tag = util.fetchTag(name);

        if (tag === null || typeof tag === "undefined") {
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

    _templateReplaceRegex: /(?<!\\){{(.*?)}}(?!\\)/g,
    templateReplace: (template, strings) => {
        return template.replace(LoaderUtils._templateReplaceRegex, (match, key) => {
            key = key.trim();
            return strings[key] ?? match;
        });
    },

    removeUndefinedValues: obj => {
        return Object.fromEntries(Object.entries(obj).filter(([, value]) => typeof value !== "undefined"));
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
    makeInfiniteObject: _ => {
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

    parseRanges: (str, base = 16) => {
        return str.split(" ").map(range => {
            const split = range.split("-");

            const first = parseInt(split[0], base),
                last = split[1] ? parseInt(split[1], base) : first;

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

const HttpUtil = {
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
        if (params === null || typeof params === "undefined") {
            return "";
        }

        const query = [];

        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && typeof value !== "undefined") {
                query.push(key + "=" + encodeURIComponent(value));
            }
        });

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

        const status = parseInt(statusMatch[1], 10);
        return status;
    }
};

const LoaderTextEncoder = {
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
};

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

    static timeToUse = (_ => {
        if (typeof this._performance !== "undefined") {
            return "performanceNow";
        }

        if (typeof this._vm !== "undefined") {
            return "vmTime";
        }

        if (typeof this._Date !== "undefined") {
            return "dateNow";
        }

        throw new UtilError("No suitable timing function detected");
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

        if (typeof name === "undefined") {
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
                case "object":
                    return ret;
                case "function":
                    return ret(id);
                default:
                    return LoaderUtils.makeInfiniteObject();
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

        stackFrames = stackFrames.map(frame => this.indent + frame);
        return msgLine + "\n" + stackFrames.join("\n");
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
        if (url === null || typeof url === "undefined" || url.length < 1) {
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
        if (tagName === null || typeof tagName === "undefined") {
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

        if (typeof moduleCode !== "string" || moduleCode.length < 1) {
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

        const cleanup = _ => {
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
                if (url === null || typeof url === "undefined") {
                    throw new LoaderError("No URL provided");
                }

                return this.loadModuleFromUrl(url, options);
            case "tag":
                if (tagName === null || typeof tagName === "undefined") {
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
            if (tagName.length < 1) {
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
                .filter(tag => tag !== null && typeof tag !== "undefined");

            if (tags.length < 1) {
                throw new LoaderError("No matching tag(s) found", tagName);
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
            }

            if (typeof table === "undefined") {
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

ModuleLoader._fetchFromUrl = Benchmark.wrapFunction("url_fetch", ModuleLoader._fetchFromUrl);
ModuleLoader._fetchTagBody = Benchmark.wrapFunction("tag_fetch", ModuleLoader._fetchTagBody);
ModuleLoader.loadModuleFromSource = Benchmark.wrapFunction("module_load", ModuleLoader.loadModuleFromSource);

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
    Worker: undefined
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
        globalObjs.FileDataTypes ??= FileDataTypes;
        globalObjs.LoaderUtils ??= LoaderUtils;
        globalObjs.HttpUtil ??= HttpUtil;

        globalObjs.ModuleLoader ??= ModuleLoader;

        if (!("loadSource" in globalObjs)) {
            Object.defineProperty(globalObjs, "loadSource", {
                get: function () {
                    return ModuleLoader.loadSource;
                },
                enumerable: true
            });
        }

        globalObjs.enableDebugger ??= config.enableDebugger;

        globalObjs.Patches ??= {
            globals,
            clearLoadedPatches: Patches.clearLoadedPatches,
            apply: Patches.apply,
            patchGlobalContext: Patches.patchGlobalContext,
            addContextGlobals: Patches.addContextGlobals
        };

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

    clearLoadedPatches: _ => {
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
        if (typeof globalThis.decodeBase2n !== "undefined") {
            return;
        }

        Benchmark.startTiming("load_decoder");

        const { base2n } = ModuleLoader.loadModule(
            null,
            tags.Base2nTagName,

            {
                /* breakpoint: config.enableDebugger */
            }
        );

        if (typeof base2n === "undefined") {
            return;
        }

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
        if (typeof globalThis.fastDecodeBase2n !== "undefined") {
            return;
        }

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

        if (typeof Base2nWasmDec === "undefined") {
            return;
        }

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
    if (typeof globalThis.XzDecompressor !== "undefined") {
        return;
    }

    Benchmark.startTiming("load_xz_decompressor");

    const XzDecompressor = ModuleLoader.loadModule(
        null,
        tags.XzDecompressorTagName,

        {
            cache: false /*,
            breakpoint: config.enableDebugger */
        }
    );

    if (typeof XzDecompressor === "undefined") {
        return;
    }

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
    if (typeof globalThis.ZstdDecompressor !== "undefined") {
        return;
    }

    Benchmark.startTiming("load_zstd_decompressor");

    const ZstdDecompressor = ModuleLoader.loadModule(
        null,
        tags.ZstdDecompressorTagName,

        {
            cache: false /*,
            breakpoint: config.enableDebugger */
        }
    );

    if (typeof ZstdDecompressor === "undefined") {
        return;
    }

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
    if (typeof globalThis.CanvasKit !== "undefined") {
        return;
    }

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
    if (typeof globalThis.Resvg !== "undefined") {
        return;
    }

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
    if (typeof globalThis.vips !== "undefined") {
        return;
    }

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
    if (typeof globalThis.lodepng !== "undefined") {
        return;
    }

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
        }
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
            ModuleLoader.useDefault(_ => {
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
    ModuleLoader.useDefault(_ => {
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

        throw new ExitError();
    }

    // run main
    main();

    if (config.enableDebugger) debugger;
    else throw new ExitError(".");
} catch (err) {
    // output
    if (err instanceof ExitError) {
        const out = err.message;
        out;
    } else {
        throw err;
    }
}
