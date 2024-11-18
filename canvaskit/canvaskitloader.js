"use strict";

// config
const loadLibrary = "canvaskit",
    loadSource = 0 ? "url" : "tag",
    enableDebugger = false;

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

    LibVipsLoaderUrl: "https://files.catbox.moe/j1uor5.js",
    LibVipsWasmUrl: "https://cdn.jsdelivr.net/npm/wasm-vips@0.0.11/lib/vips.wasm"
};

const tags = {
        Base2nTagName: "ck_base2n",

        XzDecompressorTagName: "ck_xz_decomp",
        XzWasmTagName: "ck_xz_wasm",

        PromisePolyfillTagName: "ck_promise_polyfill",
        BufferPolyfillTagName: "",
        TextEncoderDecoderPolyfillTagName: "ck_textdecenc_polyfill",
        WebWorkerPolyfillTagName: "",

        CanvasKitLoaderTagName: /^ck_loader_init\d+$/,
        CanvasKitWasmTagName: /^ck_wasm\d+$/,

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
CanvasKit API docs: https://github.com/google/skia/blob/a004a27085d7dcc4efc3766c9abe92df03654c7c/modules/canvaskit/npm_build/types/index.d.ts`;

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
            `^.+\\n\\s+at\\s${insideEval.name}\\s\\(eval\\sat\\s.+\\)\\n\\s+at eval\\s\\(eval at\\s.+\\)`
        );

        try {
            throw new Error();
        } catch (e) {
            return Boolean(e.stack.match(evalExp));
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
    const globals = {
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
        static timepoints = new Map();

        static useVmTime = typeof vm !== "undefined";
        static ns_per_ms = 10n ** 6n;

        static getCurrentTime() {
            return this.useVmTime ? vm.getWallTime() : Date.now();
        }

        static startTiming(key) {
            key = this._formatKey(key);

            const t1 = this.getCurrentTime();
            this.timepoints.set(key, t1);
        }

        static stopTiming(key) {
            key = this._formatKey(key);
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
            key = this._formatKey(key);
            const time = this.data[key];

            if (typeof time === "undefined") {
                return "Key not found";
            }

            return this._formatTime(key, time);
        }

        static deleteTime(key) {
            key = this._formatKey(key);
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
        }

        static clearExcept(...keys) {
            const clearKeys = Object.keys(this.data).filter(key => !keys.includes(key));

            for (const key of clearKeys) {
                delete this.data[key];
            }

            this.timepoints.clear();
        }

        static clearExceptLast(n = 1) {
            const clearKeys = Object.keys(this.data).slice(0, -n);

            for (const key of clearKeys) {
                delete this.data[key];
            }

            this.timepoints.clear();
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

        static _formatTime(key, time) {
            return `${key}: ${time.toLocaleString()}ms`;
        }

        static _formatKey(key) {
            switch (typeof key) {
                case "number":
                    return key.toString();
                case "string":
                    return key;
                default:
                    throw new UtilError("Time keys must be strings");
            }
        }
    }

    // module loader
    let MODULE_LOAD_COUNT = 0,
        URL_FETCH_COUNT = 0,
        TAG_FETCH_COUNT = 0;

    const cleanGlobal = LoaderUtils.shallowClone(globalThis, "nonenum"),
        globalKeys = ["global", "globalThis"];

    class ModuleLoader {
        static loadSource = loadSource;

        static tagOwner;
        static breakpoint = false;
        static isolateGlobals = true;

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
                owner = options.owner ?? this.tagOwner;

            let moduleCode = this._fetchTagBody(tagName, owner);

            if (encoded) {
                moduleCode = this._decodeModuleCode(moduleCode);
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

            MODULE_LOAD_COUNT++;
            Benchmark.startTiming("load_module_" + MODULE_LOAD_COUNT);

            moduleCode = ModuleLoader._addDebuggerStmt(moduleCode, breakpoint);

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

            let originalGlobal, originalKeys;

            if (isolateGlobals) {
                originalGlobal = LoaderUtils.shallowClone(globalThis, "enum");
                originalKeys = Object.keys(globalThis);

                for (const key of Object.keys(globalThis)) {
                    if (key !== "global") delete globalThis[key];
                }

                for (const key of filteredKeys) {
                    globalThis[key] = patchedGlobal[key];
                }
            }

            const loaderFn = new Function(loaderParams, moduleCode);
            loaderFn(...loaderArgs);

            if (isolateGlobals) {
                for (const key of Object.keys(globalThis)) {
                    if (key !== "global") delete globalThis[key];
                }

                for (const key of originalKeys) {
                    if (key !== "global") globalThis[key] = originalGlobal[key];
                }
            }

            Benchmark.stopTiming("load_module_" + MODULE_LOAD_COUNT);
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
            URL_FETCH_COUNT++;
            Benchmark.startTiming("url_fetch_" + URL_FETCH_COUNT);

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

            Benchmark.stopTiming("url_fetch_" + URL_FETCH_COUNT);
            return returnRes ? res : res.data;
        }

        static _fetchTagBody(tagName, owner) {
            const useName = typeof tagName === "string",
                useArray = Array.isArray(tagName),
                usePattern = tagName instanceof RegExp;

            let body;

            TAG_FETCH_COUNT++;
            Benchmark.startTiming("tag_fetch_" + TAG_FETCH_COUNT);

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

                body = tags.map(tag => LoaderUtils.getTagBody(tag)).join("");
            }

            Benchmark.stopTiming("tag_fetch_" + TAG_FETCH_COUNT);
            return body;
        }

        static _decodeModuleCode(moduleCode) {
            if (typeof decodeBase2n === "undefined" || typeof table === "undefined") {
                throw new LoaderError("Base2n decoder not initialized");
            }

            return decodeBase2n(moduleCode, table, {
                predictSize: true
            });
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

    // patches
    let WASM_LOAD_COUNT = 0;

    const Patches = {
        polyfillConsole: _ => {
            globals.console = new Logger(true, consoleOpts);
        },

        polyfillTimers: _ => {
            globals.setTimeout = f => {
                f();
                return 0;
            };

            globals.setImmediate = f => {
                f();
                return 0;
            };

            globals.clearTimeout = _ => {};
            globals.clearImmediate = _ => {};
        },

        polyfillPromise: _ => {
            globals.Promise = ModuleLoader.loadModule(
                urls.PromisePolyfillUrl,
                tags.PromisePolyfillTagName

                /*, [undefined, enableDebugger] */
            );
        },

        polyfillBuffer: _ => {
            const { Buffer } = ModuleLoader.loadModule(
                urls.BufferPolyfillUrl,
                tags.BufferPolyfillTagName

                /*, [undefined, enableDebugger] */
            );

            globals.Buffer = Buffer;
        },

        polyfillTextEncoderDecoder: _ => {
            const { TextEncoder, TextDecoder } = ModuleLoader.loadModule(
                urls.TextEncoderDecoderPolyfillUrl,
                tags.TextEncoderDecoderPolyfillTagName

                /*, [undefined, enableDebugger] */
            );

            globals.TextEncoder = TextEncoder;
            globals.TextDecoder = TextDecoder;
        },

        polyfillBlob: _ => {
            globals.Blob = class Blob {
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
            globals.XMLHttpRequest = class XMLHttpRequest {};
        },

        polyfillEvent: _ => {
            globals.Event = class Event {
                constructor(type) {
                    this.type = type;
                }
            };
        },

        polyfillWebWorker: _ => {
            globals.Worker = ModuleLoader.loadModule(
                urls.WebWorkerPolyfillUrl,
                tags.WebWorkerrPolyfillTagName,

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
            ).default;
        },

        patchWasmInstantiate: _ => {
            const original = WebAssembly.instantiate;

            WebAssembly.instantiate = (bufferSource, importObject) => {
                try {
                    WASM_LOAD_COUNT++;
                    Benchmark.startTiming("wasm_load_" + WASM_LOAD_COUNT);

                    const wasmModule = new WebAssembly.Module(bufferSource),
                        instance = new WebAssembly.Instance(wasmModule, importObject);

                    Benchmark.stopTiming("wasm_load_" + WASM_LOAD_COUNT);
                    return Promise.resolve({
                        module: wasmModule,
                        instance
                    });
                } catch (err) {
                    console.error(err);
                }
            };

            return original;
        },

        patchGlobalContext: objs => {
            Object.assign(globalThis, objs);
        },

        addContextGlobals: _ => {
            Patches.patchGlobalContext(globals);
        },

        addGlobalObjects: _ => {
            const globalObjs = {
                CustomError,
                RefError,

                FileDataTypes,
                LoaderUtils,
                Benchmark,

                loadSource,
                ModuleLoader,

                Patches: {
                    patchGlobalContext: Patches.patchGlobalContext
                }
            };

            Patches.patchGlobalContext(globalObjs);
        },

        applyAll: _ => {
            Patches.polyfillConsole();
            Patches.polyfillTimers();

            Patches.polyfillPromise();

            switch (loadLibrary) {
                case "canvaskit":
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
                    throw new LoaderError("Unknown library: " + loadLibrary);
            }

            Patches.addContextGlobals();
            Patches.addGlobalObjects();

            Patches.patchWasmInstantiate();
        }
    };

    // misc loader
    let DECODE_COUNT = 0,
        XZ_DECOMPRESS_COUNT = 0;

    function loadBase2nDecoder() {
        const { base2n } = ModuleLoader.loadModule(null, tags.Base2nTagName);

        if (typeof base2n === "undefined") {
            return;
        }

        const charset = /*"𐀀􏿿"*/ String.fromCodePoint(
                0x0021,
                0xd7ff,
                0xe000,
                0xe000 - (0xd7ff - 0x0021 + 1) + 2 ** 20 - 1
            ),
            table = base2n.Base2nTable.generate(charset, {
                tableType: base2n.Base2nTableTypes.typedarray,
                generateTables: [base2n.Base2nTableNames.decode]
            });

        const originalDecode = base2n.decodeBase2n,
            patchedDecode = function (...args) {
                DECODE_COUNT++;

                Benchmark.startTiming("decode_" + DECODE_COUNT);
                const decoded = originalDecode.apply(this, args);
                Benchmark.stopTiming("decode_" + DECODE_COUNT);

                return decoded;
            };

        Patches.patchGlobalContext({
            ...base2n,
            decodeBase2n: patchedDecode,
            table
        });
    }

    function loadXzDecompressor() {
        const XzDecompressor = ModuleLoader.loadModule(null, tags.XzDecompressorTagName);

        if (typeof XzDecompressor === "undefined") {
            return;
        }

        const xzWasm = ModuleLoader.getModuleCode(null, tags.XzWasmTagName, FileDataTypes.binary, {
            encoded: true
        });

        XzDecompressor.loadWasm(xzWasm);

        const originalDecompress = XzDecompressor.decompress;
        XzDecompressor.decompress = function (...args) {
            XZ_DECOMPRESS_COUNT++;

            Benchmark.startTiming("xz_decompress_" + XZ_DECOMPRESS_COUNT);
            const decompressed = originalDecompress.apply(this, args);
            Benchmark.stopTiming("xz_decompress_" + XZ_DECOMPRESS_COUNT);

            return decompressed;
        };

        Patches.patchGlobalContext({ XzDecompressor });
    }

    // canvaskit loader
    function loadCanvasKit() {
        const CanvasKitInit = ModuleLoader.loadModule(urls.CanvasKitLoaderUrl, tags.CanvasKitLoaderTagName, undefined, [
            undefined,
            enableDebugger
        ]);

        console.replyWithLogs();

        let wasm = ModuleLoader.getModuleCode(urls.CanvasKitWasmUrl, tags.CanvasKitWasmTagName, FileDataTypes.binary, {
            encoded: true
        });

        if (loadSource === "tag") {
            wasm = XzDecompressor.decompress(wasm);
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
    Benchmark.startTiming("load_total");
    ModuleLoader.tagOwner = tagOwner;

    Benchmark.startTiming("apply_patches");
    Patches.applyAll();
    Benchmark.stopTiming("apply_patches");

    if (loadSource === "tag") {
        Benchmark.startTiming("load_encoder");
        loadBase2nDecoder();
        Benchmark.stopTiming("load_encoder");

        Benchmark.startTiming("load_decompressor");
        loadXzDecompressor();
        Benchmark.stopTiming("load_decompressor");
    }

    switch (loadLibrary) {
        case "canvaskit":
            Benchmark.startTiming("load_canvaskit");
            loadCanvasKit();
            Benchmark.stopTiming("load_canvaskit");
            break;
        case "libvips":
            Benchmark.startTiming("load_libvips");
            loadLibVips();
            Benchmark.stopTiming("load_libvips");
            break;
        default:
            throw new LoaderError("Unknown library: " + loadLibrary);
    }

    ModuleLoader.tagOwner = undefined;
    ModuleLoader.isolateGlobals = false;
    Benchmark.stopTiming("load_total");

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
