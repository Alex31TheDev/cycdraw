"use strict";

// config
const loadSource = 0 ? "url" : "tag",
    enableDebugger = false;

const consoleOpts = {};

// sources
const urls = {
    PromisePolyfillUrl: "https://cdn.jsdelivr.net/npm/promise-polyfill",

    CanvasKitLoaderUrl: "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.js",
    CanvasKitWasmUrl: "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.wasm"
};

const tags = {
        Base2nTagName: "ck_base2n",

        XzDecompressorTagName: "ck_xz_decomp",
        XzWasmTagName: "ck_xz_wasm",

        PromisePolyfillTagName: "ck_promise_polyfill",

        CanvasKitLoaderTagName: /^ck_loader_init\d+$/,
        CanvasKitWasmTagName: /^ck_wasm\d+$/
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

class ExitError extends CustomError {}

class LoggerError extends CustomError {}
class LoaderError extends CustomError {}
class UtilError extends CustomError {}

try {
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

        Promise: undefined
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

    const LoaderUtils = {
        capitalize: str => {
            str = String(str).toLowerCase();
            return str[0].toUpperCase() + str.substring(1);
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
                        throw new UtilError("Invalid content type: " + attach.contentType);
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
                throw new UtilError("Unknown tag: " + name);
            }

            if (owner !== null && typeof owner !== "undefined") {
                if (tag.owner !== owner) {
                    throw new UtilError(`Incorrect tag owner (${tag.owner} =/= ${owner}) for tag: ${name}`);
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
        }
    };

    const TextEncoder = {
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

    class ModuleLoader {
        static loadSource = loadSource;

        static getModuleCodeFromUrl(url, returnType = FileDataTypes.text, options = {}) {
            if (url === null || typeof url === "undefined" || url.length < 1) {
                throw new LoaderError("Invalid URL");
            }

            const moduleCode = this._fetchFromUrl(url, returnType);
            return this._parseModuleCode(moduleCode, returnType);
        }

        static getModuleCodeFromTag(tagName, returnType = FileDataTypes.text, options = {}) {
            if (tagName === null || typeof tagName === "undefined") {
                throw new LoaderError("Invalid tag name");
            }

            const encoded = options.encoded ?? false,
                owner = options.owner;

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
                    throw new LoaderError("Invalid load source: " + loadSource);
            }
        }

        static loadModuleFromSource(moduleCode, loaderScope = {}, breakpoint = false) {
            if (typeof moduleCode !== "string" || moduleCode.length < 1) {
                throw new LoaderError("Invalid module code");
            }

            MODULE_LOAD_COUNT++;
            Benchmark.startTiming("load_module_" + MODULE_LOAD_COUNT);

            if (breakpoint) {
                moduleCode = `debugger;\n\n${moduleCode}`;
            }

            let module = { exports: {} },
                exports = {};

            const moduleObjs = {
                module,
                exports
            };

            const filteredGlobals = LoaderUtils.removeUndefinedValues(globals),
                filteredScope = LoaderUtils.removeUndefinedValues(loaderScope);

            const loaderParams = [
                ...Object.keys(moduleObjs),
                ...Object.keys(filteredGlobals),
                ...Object.keys(filteredScope)
            ];

            const loaderArgs = [
                ...Object.values(moduleObjs),
                ...Object.values(filteredGlobals),
                ...Object.values(filteredScope)
            ];

            const loaderFn = new Function(loaderParams, moduleCode);
            loaderFn(...loaderArgs);

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
                    throw new LoaderError("Invalid load source: " + this.loadSource);
            }

            throw new LoaderError("No URL or tag name provided");
        }

        static _fetchFromUrl(url, returnType) {
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

            const opts = {
                url,
                method: "get",
                responseType
            };

            let res;

            try {
                res = http.request(opts);
            } catch (err) {
                throw new LoaderError("Could not file. Error: " + err.message);
            }

            if (res.status !== 200) {
                throw new LoaderError("Could not file. Code: " + res.status);
            }

            Benchmark.stopTiming("url_fetch_" + URL_FETCH_COUNT);
            return res.data;
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
                    throw new LoaderError("Unknown return type: " + returnType);
            }
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
                tags.PromisePolyfillTagName,
                [
                    undefined,
                    {
                        owner: tagOwner
                    }
                ],
                [undefined, enableDebugger]
            );
        },

        patchWasmInstantiate: _ => {
            const original = WebAssembly.instantiate;

            WebAssembly.instantiate = (bufferSource, importObject) => {
                try {
                    WASM_LOAD_COUNT++;
                    Benchmark.startTiming("wasm_load_" + WASM_LOAD_COUNT);

                    const wasmModule = new WebAssembly.Module(bufferSource),
                        instance = new WebAssembly.Instance(wasmModule, importObject);

                    instance.instance = instance;
                    Benchmark.stopTiming("wasm_load_" + WASM_LOAD_COUNT);

                    return Promise.resolve(instance);
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
                FileDataTypes,
                LoaderUtils,
                Benchmark,
                ModuleLoader,
                Patches: {
                    patchGlobalContext: Patches.patchGlobalContext
                },
                loadSource
            };

            Patches.patchGlobalContext(globalObjs);
        },

        applyAll: _ => {
            Patches.polyfillConsole();
            Patches.polyfillTimers();
            Patches.polyfillPromise();

            Patches.addContextGlobals();
            Patches.addGlobalObjects();

            Patches.patchWasmInstantiate();
        }
    };

    // misc loader
    let DECODE_COUNT = 0,
        XZ_DECOMPRESS_COUNT = 0;

    function loadBase2nDecoder() {
        const { base2n } = ModuleLoader.loadModule(null, tags.Base2nTagName, [
            undefined,
            {
                owner: tagOwner
            }
        ]);

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
        const XzDecompressor = ModuleLoader.loadModule(null, tags.XzDecompressorTagName, [
            undefined,
            {
                owner: tagOwner
            }
        ]);

        if (typeof XzDecompressor === "undefined") {
            return;
        }

        const xzWasm = ModuleLoader.getModuleCode(null, tags.XzWasmTagName, FileDataTypes.binary, {
            encoded: true,
            owner: tagOwner
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
        const CanvasKitInit = ModuleLoader.loadModule(
            urls.CanvasKitLoaderUrl,
            tags.CanvasKitLoaderTagName,
            [
                undefined,
                {
                    owner: tagOwner
                }
            ],
            [undefined, enableDebugger]
        );

        console.replyWithLogs();

        let wasm = ModuleLoader.getModuleCode(urls.CanvasKitWasmUrl, tags.CanvasKitWasmTagName, FileDataTypes.binary, {
            encoded: true,
            owner: tagOwner
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

    // main
    Benchmark.startTiming("load_total");

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

    Benchmark.startTiming("load_canvaskit");
    loadCanvasKit();
    Benchmark.stopTiming("load_canvaskit");

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
