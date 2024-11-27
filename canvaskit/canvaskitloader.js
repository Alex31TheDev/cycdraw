"use strict";

// config
const loadLibrary = util.loadLibrary ?? "canvaskit",
    loadSource = util.loadSource ?? (0 ? "url" : "tag"),
    enableDebugger = util.inspectorEnabled ?? false;

const isolateGlobals = util._isolateGlobals ?? true,
    useWasmBase2nDecoder = util._useWasmBase2nDecoder ?? true,
    forceXzDecompressor = util._forceXzDecompressor ?? false;

let useXzDecompressor = true,
    useZstdDecompressor = false;

const consoleOpts = {};

delete util.loadLibrary;
delete util.loadSource;
delete util._isolateGlobals;

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

    // globals

    const globalsProxyHandler = {
        set(target, key, value) {
            target[key] = value;
            Patches._loadedPatch(key);

            return true;
        }
    };

    const globals = new Proxy(
        {
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
        },
        globalsProxyHandler
    );

    const globalObjs = new Proxy({}, globalsProxyHandler);

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
    const FileDataTypes = {
        text: "text",
        binary: "binary"
    };

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
        }
    };

    const LoaderUtils = {
        HttpUtil,

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
                const nonEnumerableProps = Object.getOwnPropertyNames(obj).filter(
                    prop => !obj.propertyIsEnumerable(prop)
                );
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

            return ModuleLoader.getModuleCodeFromUrl(url, returnType);
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
            const times = Object.keys(this.data).map(key => this.getTime(key));

            if (includeSum[0]) {
                const keys = includeSum[0] === true ? [] : includeSum,
                    sum = this.getSum(...keys);

                times.push(this._formatTime("sum", sum));
            }

            return times.join(",\n");
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

    // module loader
    const cleanGlobal = LoaderUtils.shallowClone(globalThis, "nonenum"),
        globalKeys = ["global", "globalThis"];

    class ModuleLoader {
        static loadSource = loadSource;
        static isolateGlobals = isolateGlobals;

        static tagOwner;
        static breakpoint = false;

        static getModuleCodeFromUrl(url, returnType = FileDataTypes.text, options = {}) {
            if (url === null || typeof url === "undefined" || url.length < 1) {
                throw new LoaderError("Invalid URL");
            }

            const moduleCode = this._fetchFromUrl(url, returnType, options);
            return this._parseModuleCode(moduleCode, returnType);
        }

        static getModuleCodeFromTag(tagName, returnType = FileDataTypes.text, options = {}) {
            if (tagName === null || typeof tagName === "undefined") {
                throw new LoaderError("Invalid tag name");
            }

            const encoded = options.encoded ?? false,
                owner = options.owner ?? this.tagOwner,
                buf_size = options.buf_size ?? 50 * 1024;

            let moduleCode = this._fetchTagBody(tagName, owner);

            if (encoded) {
                moduleCode = this._decodeModuleCode(moduleCode, buf_size);
            }

            return this._parseModuleCode(moduleCode, returnType);
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
            if (typeof moduleCode !== "string" || moduleCode.length < 1) {
                throw new LoaderError("Invalid module code");
            }

            const isolateGlobals = options.isolateGlobals ?? this.isolateGlobals;

            moduleCode = this._addDebuggerStmt(moduleCode, breakpoint);

            let module = { exports: {} },
                exports = {};

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

            const loaderFn = new Function(loaderParams, moduleCode);
            loaderFn(...loaderArgs);

            if (isolateGlobals) {
                Patches.removeFromGlobalContext(Object.keys(globalThis));
                Patches.patchGlobalContext(originalGlobal);
            }

            return module.exports;
        }

        static loadModuleFromUrl(url, codeArgs = [], loadArgs = []) {
            const moduleCode = this.getModuleCodeFromUrl(url, ...codeArgs);
            return this.loadModuleFromSource(moduleCode, ...loadArgs);
        }

        static loadModuleFromTag(tagName, codeArgs = [], loadArgs = []) {
            const moduleCode = this.getModuleCodeFromTag(tagName, ...codeArgs);
            return this.loadModuleFromSource(moduleCode, ...loadArgs);
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

                const status = LoaderUtils.getReqErrStatus(err);

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
    }

    ModuleLoader._fetchFromUrl = Benchmark.wrapFunction("url_fetch", ModuleLoader._fetchFromUrl);
    ModuleLoader._fetchTagBody = Benchmark.wrapFunction("tag_fetch", ModuleLoader._fetchTagBody);
    ModuleLoader.loadModuleFromSource = Benchmark.wrapFunction("module_load", ModuleLoader.loadModuleFromSource);

    // patches
    const Patches = {
        polyfillConsole: _ => {
            globals.console ??= new Logger(true, consoleOpts);
        },

        polyfillTimers: _ => {
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

        polyfillPromise: _ => {
            globals.Promise ??= ModuleLoader.loadModule(
                urls.PromisePolyfillUrl,
                tags.PromisePolyfillTagName

                /*, [undefined, enableDebugger] */
            );
        },

        polyfillBuffer: _ => {
            if (typeof globals.Buffer !== "undefined") return;

            const { Buffer } = ModuleLoader.loadModule(
                urls.BufferPolyfillUrl,
                tags.BufferPolyfillTagName

                /*, [undefined, enableDebugger] */
            );

            globals.Buffer = Buffer;
        },

        polyfillTextEncoderDecoder: _ => {
            if (typeof globals.TextDecoder !== "undefined") return;

            const { TextEncoder, TextDecoder } = ModuleLoader.loadModule(
                urls.TextEncoderDecoderPolyfillUrl,
                tags.TextEncoderDecoderPolyfillTagName

                /*, [undefined, enableDebugger] */
            );

            globals.TextEncoder = TextEncoder;
            globals.TextDecoder = TextDecoder;
        },

        polyfillBlob: _ => {
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

        polyfillXHR: _ => {
            globals.XMLHttpRequest ??= class XMLHttpRequest {};
        },

        polyfillEvent: _ => {
            globals.Event ??= class Event {
                constructor(type) {
                    this.type = type;
                }
            };
        },

        polyfillWebWorker: _ => {
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

        patchWasmInstantiate: _ => {
            if (WebAssembly.patched === true) return;

            const original = WebAssembly.instantiate;

            WebAssembly.instantiate = Benchmark.wrapFunction("wasm_load", (bufferSource, importObject) => {
                try {
                    let wasmModule;

                    if (bufferSource instanceof WebAssembly.Module) {
                        wasmModule = bufferSource;
                    } else {
                        wasmModule = new WebAssembly.Module(bufferSource);
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

            WebAssembly.patched = true;

            return original;
        },

        patchGlobalContext: objs => {
            Object.assign(globalThis, objs);
        },

        removeFromGlobalContext: keys => {
            for (const key of keys) {
                if (key !== "global") delete globalThis[key];
            }
        },

        addContextGlobals: _ => {
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
                patchGlobalContext: Patches.patchGlobalContext
            };

            switch (library) {
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

        applyAll: (library = loadLibrary) => {
            Patches._clearPatches();

            Patches.polyfillConsole();
            Patches.polyfillTimers();

            Patches.polyfillPromise();

            switch (library) {
                case "canvaskit":
                    break;
                case "resvg":
                    Patches.polyfillBuffer();
                    Patches.polyfillTextEncoderDecoder();
                    break;
                case "libvips":
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

            Patches.patchWasmInstantiate();
        },

        _loadedPatches: [],

        _loadedPatch: (...names) => {
            for (const name of names) {
                if (!Patches._loadedPatches.includes(name)) {
                    Patches._loadedPatches.push(name);
                }
            }
        },

        _clearPatches: _ => {
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

    function loadBase2nDecoder(charset = "normal") {
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

    function unloadBase2nDecoder() {
        const keys = Object.keys(globalThis).filter(key => key.toLowerCase().includes("base2n"));
        keys.push("table");

        Patches.removeFromGlobalContext(keys);
    }

    function loadWasmBase2nDecoder() {
        const Base2nWasmDec = ModuleLoader.loadModule(
            null,
            tags.Base2nWasmWrapperTagName,
            [],
            [
                {
                    CustomError
                }
            ]
        );

        if (typeof Base2nWasmDec === "undefined") {
            return;
        }

        const DecoderInit = ModuleLoader.loadModule(null, tags.Base2nWasmInitTagName),
            decoderWasm = ModuleLoader.getModuleCode(null, tags.Base2nWasmWasmTagName, FileDataTypes.binary, {
                encoded: true
            });

        Base2nWasmDec.init(DecoderInit, decoderWasm);

        const originalDecode = Base2nWasmDec.decodeBase2n.bind(Base2nWasmDec),
            patchedDecode = Benchmark.wrapFunction("decode", originalDecode);

        unloadBase2nDecoder();
        Patches.patchGlobalContext({
            fastDecodeBase2n: patchedDecode
        });

        wasmDecoderLoaded = true;
    }

    function loadXzDecompressor() {
        const XzDecompressor = ModuleLoader.loadModule(null, tags.XzDecompressorTagName);

        if (typeof XzDecompressor === "undefined") {
            return;
        }

        const xzWasm = ModuleLoader.getModuleCode(null, tags.XzWasmTagName, FileDataTypes.binary, {
            encoded: true,
            buf_size: 13 * 1024
        });

        XzDecompressor.loadWasm(xzWasm);

        const originalDecompress = XzDecompressor.decompress,
            patchedDecompress = Benchmark.wrapFunction("xz_decompress", originalDecompress);
        XzDecompressor.decompress = patchedDecompress;

        Patches.patchGlobalContext({ XzDecompressor });
    }

    function loadZstdDecompressor() {
        const ZstdDecompressor = ModuleLoader.loadModule(null, tags.ZstdDecompressorTagName);

        if (typeof ZstdDecompressor === "undefined") {
            return;
        }

        const zstdWasm = ModuleLoader.getModuleCode(null, tags.ZstdWasmTagName, FileDataTypes.binary, {
            encoded: true,
            buf_size: 50 * 1024
        });

        ZstdDecompressor.loadWasm(zstdWasm);

        const originalDecompress = ZstdDecompressor.decompress,
            patchedDecompress = Benchmark.wrapFunction("zstd_decompress", originalDecompress);
        ZstdDecompressor.decompress = patchedDecompress;

        Patches.patchGlobalContext({ ZstdDecompressor: ZstdDecompressor });
    }

    // canvaskit loader
    function loadCanvasKit() {
        const CanvasKitInit = ModuleLoader.loadModule(urls.CanvasKitLoaderUrl, tags.CanvasKitLoaderTagName, undefined, [
            undefined,
            enableDebugger
        ]);

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
            buf_size
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
        const ResvgInit = ModuleLoader.loadModule(urls.ResvgLoaderUrl, tags.ResvgLoaderTagName, undefined, [
            undefined,
            enableDebugger
        ]);

        console.replyWithLogs();

        let wasm = ModuleLoader.getModuleCode(urls.ResvgWasmUrl, tags.ResvgWasmTagName, FileDataTypes.binary, {
            encoded: true,
            buf_size: 700 * 1024
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
    function mainPatch() {
        function subPatch(library) {
            let timeKey = "apply_patches";

            if (typeof library !== "undefined") {
                timeKey += `_${library.toLowerCase()}`;
            }

            Benchmark.startTiming(timeKey);
            Patches.applyAll(library);
            Benchmark.stopTiming(timeKey);
        }

        if (Array.isArray(loadLibrary)) {
            loadLibrary.forEach(subPatch);
        } else {
            subPatch();
        }
    }

    function mainLoadMisc() {
        function decideMiscConfig(library = loadLibrary) {
            switch (library) {
                case "canvaskit":
                    if (!forceXzDecompressor) {
                        useXzDecompressor = false;
                        useZstdDecompressor = true;
                    }

                    break;
                case "resvg":
                    break;
                case "libvips":
                    break;
                default:
                    throw new LoaderError("Unknown library: " + library);
            }
        }

        if (Array.isArray(loadLibrary)) {
            loadLibrary.forEach(decideMiscConfig);
        } else {
            decideMiscConfig();
        }

        if (loadSource === "tag") {
            const base2nCharset = useWasmBase2nDecoder ? "base64" : "normal";

            Benchmark.startTiming("load_decoder");
            loadBase2nDecoder(base2nCharset);
            Benchmark.stopTiming("load_decoder");

            if (useWasmBase2nDecoder) {
                Benchmark.startTiming("load_wasm_decoder");
                loadWasmBase2nDecoder();
                Benchmark.stopTiming("load_wasm_decoder");
            }

            if (useXzDecompressor) {
                Benchmark.startTiming("load_xz_decompressor");
                loadXzDecompressor();
                Benchmark.stopTiming("load_xz_decompressor");
            }

            if (useZstdDecompressor) {
                Benchmark.startTiming("load_xz_decompressor");
                loadZstdDecompressor();
                Benchmark.stopTiming("load_xz_decompressor");
            }
        }
    }

    function mainLoadLibrary() {
        function subLoadLibrary(library = loadLibrary) {
            switch (library) {
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
            subLoadLibrary();
        }
    }

    function main() {
        Benchmark.startTiming("load_total");
        ModuleLoader.tagOwner = tagOwner;

        mainPatch();
        mainLoadMisc();
        mainLoadLibrary();

        ModuleLoader.tagOwner = undefined;
        ModuleLoader.isolateGlobals = false;
        Benchmark.stopTiming("load_total");
    }

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
