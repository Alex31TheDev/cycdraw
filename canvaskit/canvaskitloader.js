"use strict";

// config
const loadLibrary = util.loadLibrary ?? "canvaskit",
    loadSource = util.loadSource ?? (0 ? "url" : "tag"),
    enableDebugger = util.inspectorEnabled ?? false;

const isolateGlobals = util._isolateGlobals ?? true,
    useWasmBase2nDecoder = util._useWasmBase2nDecoder ?? true,
    forceXzDecompressor = util._forceXzDecompressor ?? false;

let useBase2nDecoder = false,
    useXzDecompressor = false,
    useZstdDecompressor = false;

let useLoadFuncs = false;

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
    LibVipsWasmUrl: "https://cdn.jsdelivr.net/npm/wasm-vips@0.0.11/lib/vips.wasm"
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
        LibVipsWasmTagName: ""
    },
    tagOwner = "883072834790916137";

// info
const usage = `Leveret: \`util.executeTag("canvaskitloader");\`
El Levert: \`eval(util.fetchTag("canvaskitloader").body);\``;

const scripts = `%t canvaskitexample
%t caption`;

const docs = `CanvasKit GitHub: https://github.com/google/skia/tree/main/modules/canvaskit
CanvasKit API docs: https://github.com/google/skia/blob/a004a27085d7dcc4efc3766c9abe92df03654c7c/modules/canvaskit/npm_build/types/index.d.ts

Tag repo: https://github.com/Alex31TheDev/cycdraw/tree/main/canvaskit`;

// misc
const outCharLimit = util.outCharLimit ?? 1000,
    outLineLimit = util.outLineLimit ?? 6;

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
class LoaderError extends RefError {}
class UtilError extends RefError {}

// delete config props
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

function deleteConfigProps() {
    for (const key of Object.keys(util)) {
        if (!defaultUtilProps.includes(key)) {
            delete util[key];
        }
    }
}

deleteConfigProps();

// classes
class Logger {
    static levels = {
        info: 0,
        warn: 1,
        error: 2
    };

    static _getLevelInd(level) {
        const levels = Object.entries(Logger.levels);

        let find = levels.find(([key]) => key === level);

        if (typeof find === "undefined") {
            throw new LoggerError("Unknown logger level: " + level);
        }

        return find[1];
    }

    static _getIndLevel(ind) {
        const levels = Object.entries(Logger.levels);

        let find = levels.find(([_, value]) => value === ind);

        if (typeof find === "undefined") {
            throw new LoggerError("Unknown level index: " + ind);
        }

        return find[0];
    }

    constructor(enabled = true, options = {}) {
        this.enabled = enabled;
        this.options = options;

        this.level = options.level ?? "info";
        this.objIndentation = options.objIndentation ?? 4;

        this.clearLogs();
        this._defineLogFuncs();
    }

    clearLogs() {
        this.log_str = "";
    }

    get level() {
        return Logger._getIndLevel(this._level);
    }

    set level(level) {
        this._level = Logger._getLevelInd(level);
    }

    createEntry(level, msg, ...objs) {
        if (!this.enabled) {
            return;
        }

        if (Logger._getLevelInd(level) < this._level) {
            return;
        }

        let info = `${level}: ${msg}`;

        if (objs.length > 0) {
            const objStrs = objs.map(obj => {
                if (Array.isArray(obj)) {
                    return `[${obj.join(", ")}]`;
                }

                if (obj instanceof Error) {
                    return `\n${obj.message}\n${obj.stack}`;
                }

                return JSON.stringify(obj, Object.getOwnPropertyNames(obj), this.objIndentation);
            });

            info += " " + objStrs.join(" ");
        }

        this.log_str += info + "\n";
    }

    _defineLogFuncs() {
        for (const level of Object.keys(Logger.levels)) {
            const logFunc = this.createEntry.bind(this, level);
            this[level] = logFunc;
        }

        this.log = this.createEntry.bind(this, "info");
    }

    replyWithLogs() {
        if (this.log_str.length < 1) {
            return;
        }

        let log_str = this.log_str;

        if (this.log_str.length <= 1000) {
            log_str = "```\n" + log_str + "```";
        }

        msg.reply(log_str);
        throw new ExitError();
    }
}

// util
const HttpUtil = {
    protocolRegex: /^[^/:]+:\/*$/,
    leadingSlashRegex: /^[\/]+/,
    trailingSlashRegex: /[\/]+$/,
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
        if (typeof params === "undefined" || params.length < 1) {
            return "";
        }

        const query = [];

        Object.keys(params).forEach(x => {
            query.push(x + "=" + encodeURIComponent(params[x]));
        });

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

const FileDataTypes = {
    text: "text",
    binary: "binary"
};

const LoaderUtils = {
    HttpUtil,
    md5,

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

    randomElement: (arr, a = 0, b = arr.length - 1) => {
        return arr[a + ~~(Math.random() * (b - a))];
    },

    isArray: arr => {
        return Array.isArray(arr) || ArrayBuffer.isView(arr);
    },

    urlRegex: /(\S*?):\/\/(?:([^\/\.]+)\.)?([^\/\.]+)\.([^\/\s]+)\/?(\S*)?/,
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

    exceedsLimits: str => {
        return str.length > outCharLimit || str.split("\n").length > outLineLimit;
    },

    codeBlock: str => {
        const formatted = `\`\`\`\n${str}\`\`\``;

        if (!LoaderUtils.exceedsLimits(formatted)) {
            return formatted;
        }

        return str;
    },

    shallowClone: (obj, options) => {
        switch (typeof options) {
            case "undefined":
                options = ["both"];
                break;
            case "string":
                options = [options];
                break;
        }

        let enumerable, nonEnumerable, both;

        if (options.includes("both")) {
            enumerable = nonEnumerable = both = true;
        } else {
            enumerable = options.includes("enum");
            nonEnumerable = options.includes("nonenum");
        }

        let clone = Object.create(Object.getPrototypeOf(obj)),
            descriptors = {};

        if (both) {
            descriptors = Object.getOwnPropertyDescriptors(obj);
        } else if (enumerable) {
            const enumerableProps = Object.keys(obj);
            enumerableProps.forEach(prop => {
                descriptors[prop] = Object.getOwnPropertyDescriptor(obj, prop);
            });
        } else if (nonEnumerable) {
            const nonEnumerableProps = Object.getOwnPropertyNames(obj).filter(prop => !obj.propertyIsEnumerable(prop));
            nonEnumerableProps.forEach(prop => {
                descriptors[prop] = Object.getOwnPropertyDescriptor(obj, prop);
            });
        } else {
            throw new UtilError("Invalid options: " + options.join(", "));
        }

        Object.defineProperties(clone, descriptors);
        return clone;
    },

    fetchAttachment: (msg, returnType = FileDataTypes.text, allowedContentType) => {
        let attach, url;

        if (msg.attachments.length > 0) {
            attach = msg.attachments[0];
        } else if (typeof msg.file !== "undefined") {
            attach = msg.file;
        } else if (typeof msg.fileUrl !== "undefined") {
            url = msg.fileUrl;
        } else {
            throw new UtilError("Message doesn't have any attachments");
        }

        if (attach) {
            url = attach.url;

            if (allowedContentType !== null && typeof allowedContentType !== "undefined") {
                if (!attach.contentType.includes(allowedContentType)) {
                    throw new UtilError("Invalid content type: " + attach.contentType, attach.contentType);
                }
            }
        }

        return ModuleLoader.getModuleCodeFromUrl(url, returnType, {
            cache: false
        });
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

                if (!userExcluded && tag.owner !== tagOwner) {
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

        if (owner !== null && typeof owner !== "undefined") {
            if (tag.owner !== owner) {
                throw new UtilError(`Incorrect tag owner (${tag.owner} =/= ${owner}) for tag: ${name}`, {
                    original: tag.owner,
                    needed: owner
                });
            }
        }

        return tag;
    },

    leveretScriptBodyRegex: /^`{3}([\S]+)?\n([\s\S]+)\n`{3}$/u,
    getTagBody: tag => {
        let body = tag.body,
            match = body.match(LoaderUtils.leveretScriptBodyRegex);

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

    removeUndefinedValues: obj => {
        return Object.fromEntries(Object.entries(obj).filter(([_, value]) => typeof value !== "undefined"));
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

        return new Proxy(newObj, {
            defineProperty(target, prop, descriptor) {
                return Reflect.defineProperty(target, prop, {
                    ...descriptor,
                    configurable: false
                });
            },

            set(target, prop, value) {
                if (!Object.prototype.hasOwnProperty.call(target, prop)) {
                    Reflect.defineProperty(target, prop, {
                        value,
                        writable: true,
                        enumerable: true,
                        configurable: false
                    });
                } else {
                    target[prop] = value;
                }

                return true;
            }
        });
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

    static useVmTime = typeof vm !== "undefined";
    static ns_per_ms = 10n ** 6n;

    static getCurrentTime() {
        return this.useVmTime ? vm.getWallTime() : Date.now();
    }

    static startTiming(key) {
        key = this._formatTimeKey(key);

        const t1 = this.getCurrentTime();
        this.timepoints.set(key, t1);
    }

    static restartTiming(key) {
        key = this._formatTimeKey(key);
        let time = this.data[key];

        if (typeof time === "undefined") {
            return this.startTiming(key);
        }

        delete this.data[key];

        if (this.useVmTime) {
            time = BigInt(time) * this.ns_per_ms;
        }

        const t1 = this.getCurrentTime();
        this.timepoints.set(key, t1 - time);
    }

    static stopTiming(key) {
        key = this._formatTimeKey(key);
        const t1 = this.timepoints.get(key);

        if (typeof t1 === "undefined") {
            return;
        }

        this.timepoints.delete(key);

        let t2 = this.getCurrentTime(),
            dt = t2 - t1;

        if (this.useVmTime) {
            dt = Number((t2 - t1) / this.ns_per_ms);
        } else {
            dt = t2 - t1;
        }

        this.data[key] = dt;
    }

    static getTime(key) {
        key = this._formatTimeKey(key);
        const time = this.data[key];

        if (typeof time === "undefined") {
            return "Key not found";
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
            sumTimes = keys.map(key => this.data[key]).filter(time => typeof time !== "undefined");
        } else {
            sumTimes = Object.values(this.data);
        }

        return sumTimes.reduce((a, b) => a + b, 0);
    }

    static getAll(...includeSum) {
        let format = true;

        if (typeof LoaderUtils.lastElement(includeSum) === "boolean") {
            format = LoaderUtils.lastElement(includeSum);
            if (!format) includeSum.pop();
        }

        let useSum = includeSum.length > 0,
            sum;

        if (useSum) {
            const allKeys = includeSum[0] === true,
                keys = allKeys ? [] : includeSum;

            sum = this.getSum(...keys);
        }

        if (format) {
            const times = Object.keys(this.data).map(key => this.getTime(key));
            if (useSum) times.push(this._formatTime("sum", sum));

            return times.join(",\n");
        } else {
            const times = Object.assign({}, this.data);
            if (useSum) times["sum"] = sum;

            return times;
        }
    }

    static getCount(name) {
        name = this._formatCountName(name);

        const count = this.counts[name],
            origName = this._origCountNames.get(name);

        if (typeof count === "undefined" || typeof origName === "undefined") {
            return "Count not found";
        }

        return this._formatCount(origName, count);
    }

    static incrementCount(name) {
        if (typeof this.counts[name] === "undefined") {
            this._defineCount(name);
        }

        name = this._formatCountName(name);

        this.counts[name]++;
        return this.counts[name];
    }

    static deleteCount(name) {
        name = this._formatCountName(name);

        if (name in this.counts) {
            this.counts[name] = 0;
            return true;
        }

        return false;
    }

    static deleteLastCountTime(name) {
        name = this._formatCountName(name);

        const count = this.counts[name],
            origName = this._origCountNames.get(name);

        if (typeof count === "undefined" || typeof origName === "undefined" || count < 1) {
            return false;
        }

        const timeKey = this._formatCount(origName, count);
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

        this._defineCount(name);
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
            return "Wrapper not found";
        }

        const origFunc = this._origCountFuncs.get(formattedName);
        this._deleteCount(name);

        return origFunc;
    }

    static _origCountNames = new Map();
    static _origCountFuncs = new Map();

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

    static _defineCount(name) {
        const origName = this._formatCountOrigName(name);
        name = this._formatCountName(name);

        this.counts[name] ??= 0;
        this._origCountNames.set(name, origName);
    }

    static _deleteCount(name) {
        name = this._formatCountName(name);

        delete this.counts[name];
        this._origCountNames.delete(name);
        this._origCountFuncs.delete(name);
    }
}

// globals
let globals = {
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
};

const globalsProxyHandler = {
    set(target, prop, value) {
        if (typeof value === "undefined") {
            return false;
        }

        target[prop] = value;
        Patches._loadedPatch(prop);

        return true;
    }
};

globals = new Proxy(LoaderUtils.makeNonConfigurableObject(globals), globalsProxyHandler);
const globalObjs = new Proxy(LoaderUtils.makeNonConfigurableObject(), globalsProxyHandler);

// module loader
const cleanGlobal = LoaderUtils.shallowClone(globalThis, "nonenum"),
    globalKeys = ["global", "globalThis"];

class Module {
    constructor(name, id) {
        if (name instanceof Module) {
            const module = name;
            name = id ? id.toString() : module.name;

            this.name = name;
            this.id = module.id;
            this.exports = module.exports;
            this.loaded = module.loaded;

            return this;
        }

        this.name = (name ?? "").toString();
        this.id = id ?? "";
        this.exports = {};
        this.loaded = false;
    }
}

class ModuleLoader {
    static loadSource = loadSource;
    static isolateGlobals = isolateGlobals;

    static tagOwner;
    static breakpoint = false;
    static enableCache = true;

    static getModuleCodeFromUrl(url, returnType = FileDataTypes.text, options = {}) {
        if (url === null || typeof url === "undefined" || url.length < 1) {
            throw new LoaderError("Invalid URL");
        }

        const cache = this.enableCache && (options.cache ?? true),
            name = options.name ?? url;

        if (cache) {
            const foundCode = this._getCodeByName(name);
            if (typeof foundCode !== "undefined") return foundCode;
        }

        let moduleCode = this._fetchFromUrl(url, returnType, options);
        moduleCode = this._parseModuleCode(moduleCode, returnType);

        if (cache) this._addCode(name, moduleCode);
        return moduleCode;
    }

    static getModuleCodeFromTag(tagName, returnType = FileDataTypes.text, options = {}) {
        if (tagName === null || typeof tagName === "undefined") {
            throw new LoaderError("Invalid tag name");
        }

        const cache = this.enableCache && (options.cache ?? true),
            name = options.name ?? tagName;

        if (cache) {
            const foundCode = this._getCodeByName(name);
            if (typeof foundCode !== "undefined") return foundCode;
        }

        const encoded = options.encoded ?? false,
            owner = options.owner ?? this.tagOwner,
            buf_size = options.buf_size ?? 50 * 1024;

        let moduleCode = this._fetchTagBody(tagName, owner);

        if (encoded) {
            moduleCode = this._decodeModuleCode(moduleCode, buf_size);
        }

        moduleCode = this._parseModuleCode(moduleCode, returnType);

        if (cache) this._addCode(name, moduleCode);
        return moduleCode;
    }

    static getModuleCode(url, tagName, ...args) {
        switch (loadSource) {
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
                throw new LoaderError("Invalid load source: " + loadSource, loadSource);
        }
    }

    static loadModuleFromSource(moduleCode, loaderScope = {}, breakpoint = this.breakpoint, options = {}) {
        let moduleName = options.name,
            cache = this.enableCache && (options.cache ?? true),
            isolateGlobals = options.isolateGlobals ?? this.isolateGlobals;

        if (cache && typeof moduleName !== "undefined") {
            const foundModule = this._getModuleByName(moduleName);
            if (typeof foundModule !== "undefined") return foundModule.exports;
        }

        moduleCode = moduleCode.trim();

        if (typeof moduleCode !== "string" || moduleCode.length < 1) {
            throw new LoaderError("Invalid module code");
        }

        let moduleId;

        if (cache) {
            moduleId = md5(moduleCode);
            const foundModule = this._getModuleById(moduleId);

            if (typeof foundModule !== "undefined") {
                if (foundModule.name !== moduleName) this._addModule(foundModule, moduleName);
                return foundModule.exports;
            }
        }

        const module = new Module(moduleName ?? this._seqModuleId, moduleId),
            exports = module.exports;

        if (cache) this._addModule(module);
        this._incModuleId();

        const moduleObjs = {
            module,
            exports
        };

        const filteredGlobals = LoaderUtils.removeUndefinedValues(globals),
            filteredScope = LoaderUtils.removeUndefinedValues(loaderScope);

        const filteredKeys = Object.keys(filteredGlobals),
            patchedGlobal = LoaderUtils.shallowClone(isolateGlobals ? cleanGlobal : globalThis);
        Object.assign(patchedGlobal, filteredGlobals);

        const loaderParams = [
            ...Object.keys(moduleObjs),
            ...globalKeys,
            ...filteredKeys,
            ...Object.keys(filteredScope)
        ];

        const loaderArgs = [
            ...Object.values(moduleObjs),
            ...Array(globalKeys.length).fill(patchedGlobal),
            ...Object.values(filteredGlobals),
            ...Object.values(filteredScope)
        ];

        let originalGlobal;

        if (isolateGlobals) {
            originalGlobal = LoaderUtils.shallowClone(globalThis, "enum");

            try {
                Patches.removeFromGlobalContext(Object.keys(globalThis));
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
        }

        moduleCode = this._addDebuggerStmt(moduleCode, breakpoint);

        try {
            const loaderFn = new Function(loaderParams, moduleCode);
            loaderFn(...loaderArgs);

            module.loaded = true;
        } finally {
            if (cache && !module.loaded) this._deleteModule(module);
        }

        if (isolateGlobals) {
            Patches.removeFromGlobalContext(Object.keys(globalThis));
            Patches.patchGlobalContext(originalGlobal);
        }

        return module.exports;
    }

    static loadModuleFromUrl(url, codeArgs = [], loadArgs = [], options = {}) {
        const [newCodeArgs, newLoadArgs] = this._getLoadArgs(url, codeArgs, loadArgs, options),
            cache = this.enableCache && (options.cache ?? true);

        if (cache) {
            const foundModule = this._getModuleByName(url);
            if (typeof foundModule !== "undefined") return foundModule.exports;
        }

        const moduleCode = this.getModuleCodeFromUrl(url, ...newCodeArgs);
        return this.loadModuleFromSource(moduleCode, ...newLoadArgs);
    }

    static loadModuleFromTag(tagName, codeArgs = [], loadArgs = [], options = {}) {
        const [newCodeArgs, newLoadArgs] = this._getLoadArgs(tagName, codeArgs, loadArgs, options),
            cache = this.enableCache && (options.cache ?? true);

        if (cache) {
            const foundModule = this._getModuleByName(tagName);
            if (typeof foundModule !== "undefined") return foundModule.exports;
        }

        const moduleCode = this.getModuleCodeFromTag(tagName, ...newCodeArgs);
        return this.loadModuleFromSource(moduleCode, ...newLoadArgs);
    }

    static loadModule(url, tagName, ...args) {
        switch (this.loadSource) {
            case "url":
                if (url === null || typeof url === "undefined") {
                    break;
                }

                return this.loadModuleFromUrl(url, ...args);
            case "tag":
                if (tagName === null || typeof tagName === "undefined") {
                    break;
                }

                return this.loadModuleFromTag(tagName, ...args);
            default:
                throw new LoaderError("Invalid load source: " + this.loadSource, loadSource);
        }

        throw new LoaderError("No URL or tag name provided");
    }

    static _fetchFromUrl(url, returnType, options = {}) {
        let responseType;

        switch (returnType) {
            case FileDataTypes.text:
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

    static _fetchTagBody(tagName, owner) {
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
                .filter(tag => tag !== null);

            if (tags.length < 1) {
                throw new LoaderError("No matching tag(s) found");
            }

            body = tags.map(tag => LoaderUtils.getTagBody(tag)).join("");
        }

        return body;
    }

    static _decodeModuleCode(moduleCode, buf_size) {
        if (wasmDecoderLoaded) {
            if (typeof fastDecodeBase2n === "undefined") {
                throw new LoaderError("WASM Base2n decoder not initialized");
            }

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

    static _parseModuleCode(moduleCode, returnType) {
        switch (returnType) {
            case FileDataTypes.text:
                if (LoaderUtils.isArray(moduleCode)) {
                    return TextEncoder.bytesToString(moduleCode);
                }

                return moduleCode;
            case FileDataTypes.binary:
                if (LoaderUtils.isArray(moduleCode)) {
                    return moduleCode;
                }

                return TextEncoder.stringToBytes(moduleCode);
            default:
                throw new LoaderError("Unknown return type: " + returnType, returnType);
        }
    }

    static _addDebuggerStmt(moduleCode, breakpoint) {
        return breakpoint ? `debugger;\n\n${moduleCode}` : moduleCode;
    }

    static _cache = new Map();
    static _code = new Map();
    static _seqModuleId = 0;

    static _getCodeByName(name) {
        name = name.toString();
        return this._code.get(name);
    }

    static _addCode(name, code) {
        name = name.toString();
        this._code.set(name, code);
    }

    static _deleteCode(name) {
        name = name.toString();
        this._code.delete(name);
    }

    static _incModuleId() {
        this._seqModuleId++;
    }

    static _getLoadArgs(name, codeArgs, loadArgs, options) {
        if (!Array.isArray(codeArgs)) {
            throw new LoaderError("Code args must be an array");
        }
        if (!Array.isArray(loadArgs)) {
            throw new LoaderError("Load args must be an array");
        }

        const codeArgCount = 3,
            loadArgCount = 4;

        const codeOptions = codeArgs[codeArgCount - 2],
            newCodeOptions =
                typeof codeOptions === "object" ? { name, ...codeOptions, ...options } : { name, ...options };

        const loadOptions = loadArgs[loadArgCount - 2],
            newLoadOptions =
                typeof loadOptions === "object" ? { name, ...loadOptions, ...options } : { name, ...options };

        const paddedCodeArgs = [
            codeArgs.slice(0, codeArgCount - 2),
            Array(Math.max(0, codeArgCount - 2 - codeArgs.length)).fill(undefined),
            newCodeOptions
        ].flat();

        const paddedLoadArgs = [
            loadArgs.slice(0, loadArgCount - 2),
            Array(Math.max(0, loadArgCount - 2 - loadArgs.length)).fill(undefined),
            newLoadOptions
        ].flat();

        return [paddedCodeArgs, paddedLoadArgs];
    }

    static _getModuleByName(name) {
        name = name.toString();
        return this._cache.get(name);
    }

    static _getModuleById(id) {
        for (const module of this._cache.values()) {
            if (module.id === id) {
                return module;
            }
        }
    }

    static _addModule(module, newName) {
        this._cache.set(module.name, module);

        if (typeof newName !== "undefined") {
            const newModule = new Module(module, newName);
            this._cache.set(newName, newModule);
        }
    }

    static _deleteModule(id) {
        if (id instanceof Module) {
            id = id.id;
        }

        for (const [key, module] of this._cache.entries()) {
            if (module.id === id) {
                this._cache.delete(key);
            }
        }
    }

    static clearCache() {
        this._cache.clear();
        this._code.clear();
    }
}

ModuleLoader._fetchFromUrl = Benchmark.wrapFunction("url_fetch", ModuleLoader._fetchFromUrl);
ModuleLoader._fetchTagBody = Benchmark.wrapFunction("tag_fetch", ModuleLoader._fetchTagBody);
ModuleLoader.loadModuleFromSource = Benchmark.wrapFunction("module_load", ModuleLoader.loadModuleFromSource);

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
            tags.PromisePolyfillTagName

            /*, [undefined, enableDebugger] */
        );
    },

    polyfillBuffer: () => {
        if (typeof globals.Buffer !== "undefined") return;

        const { Buffer } = ModuleLoader.loadModule(
            urls.BufferPolyfillUrl,
            tags.BufferPolyfillTagName

            /*, [undefined, enableDebugger] */
        );

        globals.Buffer = Buffer;
    },

    polyfillTextEncoderDecoder: () => {
        if (typeof globals.TextDecoder !== "undefined") return;

        const { TextEncoder, TextDecoder } = ModuleLoader.loadModule(
            urls.TextEncoderDecoderPolyfillUrl,
            tags.TextEncoderDecoderPolyfillTagName

            /*, [undefined, enableDebugger] */
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

            undefined,
            [
                {
                    document: {},
                    window: { navigator: {} },
                    self: {
                        requestAnimationFrame: _ => false
                    }
                } /*, enableDebugger*/
            ]
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
            try {
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
            } catch (err) {
                console.error(err);
            }
        });

        Patches._origWasmInstantiate = original;
        WebAssembly.patchedInstantiate = true;
    },

    patchGlobalContext: objs => {
        Object.assign(globalThis, objs);
    },

    removeFromGlobalContext: keys => {
        for (const key of keys) {
            if (key !== "global") delete globalThis[key];
        }
    },

    addContextGlobals: objs => {
        if (typeof objs === "object") {
            Object.assign(global, objs);
        }

        Patches._safePatchGlobals(globals);
    },

    addGlobalObjects: (library = loadLibrary) => {
        globalObjs.CustomError ??= CustomError;
        globalObjs.RefError ??= RefError;

        globalObjs.FileDataTypes ??= FileDataTypes;
        globalObjs.LoaderUtils ??= LoaderUtils;
        globalObjs.Benchmark ??= Benchmark;

        globalObjs.loadSource ??= loadSource;
        globalObjs.ModuleLoader ??= ModuleLoader;

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
            default:
                throw new LoaderError("Unknown library: " + library);
        }

        Patches._safePatchGlobals(globalObjs);
    },

    apply: (...patches) => {
        const patchFuncs = patches.map(patch => {
            const err = new LoaderError("Unknown patch: " + patch);

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
    },

    applyAll: (library = loadLibrary) => {
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
            default:
                throw new LoaderError("Unknown library: " + library);
        }

        Patches.addContextGlobals();
        Patches.addGlobalObjects(library);

        Patches.patchWasmModule();
        Patches.patchWasmInstantiate();
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
        const newObjs = {};

        for (const name of Object.keys(objs)) {
            if (Patches._loadedPatches.includes(name)) {
                newObjs[name] = objs[name];
            }
        }

        Patches.patchGlobalContext(newObjs);
    }
};

// misc loader
let wasmDecoderLoaded = false;

function loadBase2nDecoder() {
    function loadJsBase2nDecoder(charset = "normal") {
        if (typeof globalThis.decodeBase2n !== "undefined") {
            return;
        }

        const { base2n } = ModuleLoader.loadModule(null, tags.Base2nTagName);

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
                throw new LoaderError("Unknown charset: " + charset);
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
    }

    function unloadJsBase2nDecoder() {
        const keys = Object.keys(globalThis).filter(key => key.toLowerCase().includes("base2n"));
        keys.push("table");

        Patches.removeFromGlobalContext(keys);
    }

    function loadWasmBase2nDecoder() {
        if (typeof globalThis.fastDecodeBase2n !== "undefined") {
            return;
        }

        const Base2nWasmDec = ModuleLoader.loadModule(
            null,
            tags.Base2nWasmWrapperTagName,
            undefined,
            [
                {
                    CustomError
                }
            ],
            {
                cache: false
            }
        );

        if (typeof Base2nWasmDec === "undefined") {
            return;
        }

        const DecoderInit = ModuleLoader.loadModule(null, tags.Base2nWasmInitTagName, undefined, undefined, {
                cache: false
            }),
            decoderWasm = ModuleLoader.getModuleCode(null, tags.Base2nWasmWasmTagName, FileDataTypes.binary, {
                encoded: true,
                cache: false
            });

        Base2nWasmDec.init(DecoderInit, decoderWasm);

        const originalDecode = Base2nWasmDec.decodeBase2n.bind(Base2nWasmDec),
            patchedDecode = Benchmark.wrapFunction("decode", originalDecode);

        unloadJsBase2nDecoder();
        Patches.patchGlobalContext({
            fastDecodeBase2n: patchedDecode
        });

        wasmDecoderLoaded = true;
    }

    const base2nCharset = useWasmBase2nDecoder ? "base64" : "normal";

    Benchmark.startTiming("load_decoder");
    loadJsBase2nDecoder(base2nCharset);
    Benchmark.stopTiming("load_decoder");

    if (useWasmBase2nDecoder) {
        Benchmark.startTiming("load_wasm_decoder");
        loadWasmBase2nDecoder();
        Benchmark.stopTiming("load_wasm_decoder");
    }
}

function loadXzDecompressor() {
    if (typeof globalThis.XzDecompressor !== "undefined") {
        return;
    }

    Benchmark.startTiming("load_xz_decompressor");
    const XzDecompressor = ModuleLoader.loadModule(null, tags.XzDecompressorTagName, undefined, undefined, {
        cache: false
    });

    if (typeof XzDecompressor === "undefined") {
        return;
    }

    const xzWasm = ModuleLoader.getModuleCode(null, tags.XzWasmTagName, FileDataTypes.binary, {
        encoded: true,
        buf_size: 13 * 1024,
        cache: false
    });

    XzDecompressor.loadWasm(xzWasm);
    Benchmark.stopTiming("load_xz_decompressor");

    const originalDecompress = XzDecompressor.decompress,
        patchedDecompress = Benchmark.wrapFunction("xz_decompress", originalDecompress);
    XzDecompressor.decompress = patchedDecompress;

    Patches.patchGlobalContext({ XzDecompressor });
}

function loadZstdDecompressor() {
    if (typeof globalThis.ZstdDecompressor !== "undefined") {
        return;
    }

    Benchmark.startTiming("load_zstd_decompressor");
    const ZstdDecompressor = ModuleLoader.loadModule(null, tags.ZstdDecompressorTagName, undefined, undefined, {
        cache: false
    });

    if (typeof ZstdDecompressor === "undefined") {
        return;
    }

    const zstdWasm = ModuleLoader.getModuleCode(null, tags.ZstdWasmTagName, FileDataTypes.binary, {
        encoded: true,
        buf_size: 50 * 1024,
        cache: false
    });

    ZstdDecompressor.loadWasm(zstdWasm);
    Benchmark.stopTiming("load_zstd_decompressor");

    const originalDecompress = ZstdDecompressor.decompress,
        patchedDecompress = Benchmark.wrapFunction("zstd_decompress", originalDecompress);
    ZstdDecompressor.decompress = patchedDecompress;

    Patches.patchGlobalContext({ ZstdDecompressor });
}

// canvaskit loader
function loadCanvasKit() {
    const CanvasKitInit = ModuleLoader.loadModule(
        urls.CanvasKitLoaderUrl,
        tags.CanvasKitLoaderTagName,
        undefined,
        [undefined, enableDebugger],
        {
            cache: false
        }
    );

    console.replyWithLogs();

    let wasmTagName, buf_size;

    if (useXzDecompressor) {
        wasmTagName = tags.CanvasKitWasm1TagName;
        buf_size = 2100 * 1024;
    } else if (useZstdDecompressor) {
        wasmTagName = tags.CanvasKitWasm2TagName;
        buf_size = 2300 * 1024;
    }

    let wasm = ModuleLoader.getModuleCode(urls.CanvasKitWasmUrl, wasmTagName, FileDataTypes.binary, {
        encoded: true,
        buf_size,
        cache: false
    });

    if (loadSource === "tag") {
        if (useXzDecompressor) {
            wasm = XzDecompressor.decompress(wasm);
        } else if (useZstdDecompressor) {
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

    console.replyWithLogs();
    Patches.patchGlobalContext({ CanvasKit });
}

// resvg loader
function loadResvg() {
    const ResvgInit = ModuleLoader.loadModule(
        urls.ResvgLoaderUrl,
        tags.ResvgLoaderTagName,
        undefined,
        [undefined, enableDebugger],
        {
            cache: false
        }
    );

    console.replyWithLogs();

    let wasm = ModuleLoader.getModuleCode(urls.ResvgWasmUrl, tags.ResvgWasmTagName, FileDataTypes.binary, {
        encoded: true,
        buf_size: 700 * 1024,
        cache: false
    });

    if (loadSource === "tag") {
        wasm = XzDecompressor.decompress(wasm);
    }

    Benchmark.startTiming("resvg_init");
    try {
        ResvgInit.initWasm(wasm);
    } catch (err) {
        console.error("Error occured while loading resvg:", err);
    }
    Benchmark.stopTiming("resvg_init");

    console.replyWithLogs();
    Patches.patchGlobalContext({ Resvg: ResvgInit.Resvg });
}

// libvips loader
function loadLibVips() {
    const initCode = ModuleLoader._addDebuggerStmt(
            ModuleLoader.getModuleCode(urls.LibVipsLoaderUrl, tags.LibVipsLoaderTagName),
            enableDebugger
        ),
        LibVipsInit = ModuleLoader.loadModuleFromSource(
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
            }
        );

    console.replyWithLogs();

    let wasm = ModuleLoader.getModuleCode(urls.LibVipsWasmUrl, tags.LibVipsWasmTagName, FileDataTypes.binary, {
        encoded: true
    });

    if (loadSource === "tag") {
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

    console.replyWithLogs();
    Patches.patchGlobalContext({ vips });
}

// main
function mainPatch(loadLibrary) {
    function subPatch(library) {
        let timeKey = "apply_patches";

        if (typeof library !== "undefined") {
            timeKey += `_${library.toLowerCase()}`;
        }

        Benchmark.restartTiming(timeKey);
        Patches.applyAll(library);
        Benchmark.stopTiming(timeKey);
    }

    if (Array.isArray(loadLibrary)) {
        loadLibrary.forEach(subPatch);
    } else {
        subPatch(loadLibrary);
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
                useBase2nDecoder = true;

                if (forceXzDecompressor) {
                    useXzDecompressor = true;
                } else {
                    useZstdDecompressor = true;
                }

                break;
            case "resvg":
                useBase2nDecoder = true;
                useXzDecompressor = true;
                break;
            case "libvips":
                useBase2nDecoder = true;
                useXzDecompressor = true;
                break;
            default:
                throw new LoaderError("Unknown library: " + library);
        }
    }

    if (Array.isArray(loadLibrary)) {
        if (loadLibrary.every(library => loadFuncLibs.includes(library))) {
            useLoadFuncs = true;
        }

        loadLibrary.forEach(decideMiscConfig);
    } else {
        if (loadFuncLibs.includes(loadLibrary)) {
            useLoadFuncs = true;
        }

        decideMiscConfig(loadLibrary);
    }

    if (loadSource === "tag") {
        if (useBase2nDecoder) {
            loadBase2nDecoder();
        }

        if (useXzDecompressor) {
            loadXzDecompressor();
        }

        if (useZstdDecompressor) {
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
                Benchmark.startTiming("load_canvaskit");
                loadCanvasKit();
                Benchmark.stopTiming("load_canvaskit");
                break;
            case "resvg":
                Benchmark.startTiming("load_resvg");
                loadResvg();
                Benchmark.stopTiming("load_resvg");
                break;
            case "libvips":
                Benchmark.startTiming("load_libvips");
                loadLibVips();
                Benchmark.stopTiming("load_libvips");
                break;
            default:
                throw new LoaderError("Unknown library: " + library);
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
            const prevOwner = ModuleLoader.tagOwner,
                prevIsolateGlobals = ModuleLoader.isolateGlobals;

            ModuleLoader.tagOwner = tagOwner;
            ModuleLoader.isolateGlobals = true;

            func(library);

            ModuleLoader.tagOwner = prevOwner;
            ModuleLoader.isolateGlobals = prevIsolateGlobals;
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
    ModuleLoader.tagOwner = tagOwner;

    mainLoad(loadLibrary);

    ModuleLoader.tagOwner = undefined;
    ModuleLoader.isolateGlobals = false;

    if (useLoadFuncs) {
        addLoadFuncs();
    }
}

try {
    if (enableDebugger) debugger;

    // eval check
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

    if (enableDebugger) debugger;
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
