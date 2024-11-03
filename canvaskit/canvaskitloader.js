"use strict";

// config
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

const loadSource = 0 ? "url" : "tag",
    enableDebugger = false;

const consoleOpts = {};

// info
const usage = `Leveret: \`util.executeTag("canvaskitloader");\`
El Levert: \`eval(util.fetchTag("canvaskitloader").body);\``;

const scripts = `%t canvaskitexample
%t caption`;

const docs = `CanvasKit GitHub: https://github.com/google/skia/tree/main/modules/canvaskit
CanvasKit API docs: https://github.com/google/skia/blob/a004a27085d7dcc4efc3766c9abe92df03654c7c/modules/canvaskit/npm_build/types/index.d.ts`;

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

    throw String.fromCodePoint(0x200b);
}

// errors
globalThis.CustomError = class CustomError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
};

class LoggerError extends CustomError {}
class LoaderError extends CustomError {}
class UtilError extends CustomError {}

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
        throw String.fromCodePoint(0x200b);
    }
}

// util
globalThis.Util = {
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

    fetchAttachment: (msg, allowedType, returnType = FileDataTypes.text) => {
        if (msg.attachments.length < 1) {
            throw new CustomError("Message doesn't have any attachments");
        }

        const attach = msg.attachments[0],
            url = attach.url;

        if (allowedType !== null && typeof allowedType !== "undefined") {
            if (attach.contentType !== allowedType) {
                throw new UtilError("Invalid content type: " + attach.contentType);
            }
        }

        const opts = {
            url,
            method: "get",
            responseType: returnType
        };

        let res;

        try {
            res = http.request(opts);
        } catch (err) {
            throw new UtilError("Could not fetch attachment file. Error: " + err.message);
        }

        if (res.status !== 200) {
            throw new UtilError("Could not fetch attachment file. Code: " + res.status);
        }

        return res.data;
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
        let all = Util.dumpTags(search);

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
            match = body.match(Util.leveretScriptBodyRegex);

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

globalThis.FileDataTypes = {
    text: "text",
    binary: "binary"
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

globalThis.Benchmark = class Benchmark {
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

        switch (this.timeToUse) {
            case "performanceNow":
                dt = Math.floor(dt);
                break;
            case "vmTime":
                dt = Number(dt / this.ns_per_ms);
            case "dateNow":
                break;
        }

        this.data[key] = dt;
    }

    static getTime(key) {
        key = this._formatKey(key);
        const time = this.data[key];

        if (typeof time === "undefined") {
            return "Key not found";
        }

        return `${key}: ${time.toLocaleString()}ms`;
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

    static getAll() {
        const times = Object.keys(this.data).map(key => this.getTime(key));
        return times.join(",\n");
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
};

// module loader
let URL_FETCH_COUNT = 0,
    TAG_FETCH_COUNT = 0,
    DECODE_COUNT = 0;

globalThis.ModuleLoader = class ModuleLoader {
    static loadSource = loadSource;

    static getModuleCodeFromUrl(url, returnType = FileDataTypes.text, options = {}) {
        if (url === null || typeof url === "undefined" || url.length < 1) {
            throw new LoaderError("Invalid URL");
        }

        const moduleCode = this._fetchFromUrl(url, returnType);
        this._parseModuleCode(moduleCode, returnType);
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

        if (breakpoint) {
            moduleCode = `debugger;\n\n${moduleCode}`;
        }

        let module = { exports: {} },
            exports = {};

        const moduleObjs = {
            module,
            exports
        };

        const filteredGlobals = Util.removeUndefinedValues(globals),
            filteredScope = Util.removeUndefinedValues(loaderScope);

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

        const data = http.request({
            url,
            method: "get",
            responseType
        }).data;

        Benchmark.stopTiming("url_fetch_" + URL_FETCH_COUNT);
        return data;
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

            const tag = Util.fetchTag(tagName, owner);
            body = Util.getTagBody(tag);
        } else {
            let tagNames;

            if (useArray) {
                tagNames = tagName;
            } else if (usePattern) {
                tagNames = Util.dumpTags(tagName);
            } else {
                throw new LoaderError("Invalid tag name");
            }

            const tags = tagNames
                .map(name => {
                    try {
                        return Util.fetchTag(name, owner);
                    } catch (err) {
                        if (err.name === "UtilError") {
                            return null;
                        }

                        throw err;
                    }
                })
                .filter(tag => tag !== null);

            body = tags.map(tag => Util.getTagBody(tag)).join("");
        }

        Benchmark.stopTiming("tag_fetch_" + TAG_FETCH_COUNT);
        return body;
    }

    static _decodeModuleCode(moduleCode) {
        if (typeof decodeBase2n === "undefined" || typeof table === "undefined") {
            throw new LoaderError("Base2n decoder not initialized");
        }

        DECODE_COUNT++;
        Benchmark.startTiming("decode_" + DECODE_COUNT);

        const decoded = decodeBase2n(moduleCode, table, {
            predictSize: true
        });

        Benchmark.stopTiming("decode_" + DECODE_COUNT);
        return decoded;
    }

    static _parseModuleCode(moduleCode, returnType) {
        switch (returnType) {
            case FileDataTypes.text:
                if (Util.isArray(moduleCode)) {
                    return TextEncoder.bytesToString(moduleCode);
                }

                return moduleCode;
            case FileDataTypes.binary:
                if (Util.isArray(moduleCode)) {
                    return moduleCode;
                }

                return TextEncoder.stringToBytes(moduleCode);
            default:
                throw new LoaderError("Unknown return type: " + returnType);
        }
    }
};

// patches
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

    patchGlobalContext: objs => {
        Object.assign(globalThis, objs);
    },

    patchWasmInstantiate: _ => {
        const original = WebAssembly.instantiate;

        WebAssembly.instantiate = (bufferSource, importObject) => {
            try {
                const wasmModule = new WebAssembly.Module(bufferSource),
                    instance = new WebAssembly.Instance(wasmModule, importObject);

                instance.instance = instance;
                return Promise.resolve(instance);
            } catch (err) {
                console.error(err);
            }
        };

        return original;
    },

    applyAll: _ => {
        Patches.polyfillConsole();
        Patches.polyfillTimers();
        Patches.polyfillPromise();

        Patches.patchGlobalContext(globals);
        Patches.patchWasmInstantiate();
    }
};

// misc loader
function loadBase2nDecoder() {
    const base2n = ModuleLoader.loadModule(null, tags.Base2nTagName, [
        undefined,
        {
            owner: tagOwner
        }
    ]).base2n;

    if (typeof base2n === "undefined") {
        return;
    }

    Patches.patchGlobalContext(base2n);

    const charset = /*"𐀀􏿿"*/ String.fromCodePoint(0x0021, 0xd7ff, 0xe000, 0xe000 - (0xd7ff - 0x0021 + 1) + 2 ** 20 - 1);
    globalThis.table = Base2nTable.generate(charset, {
        tableType: Base2nTableTypes.typedarray,
        generateTables: [Base2nTableNames.decode]
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
    globalThis.XzDecompressor = XzDecompressor;
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
        Benchmark.startTiming("canvaskit_decomp");
        wasm = XzDecompressor.decompress(wasm);
        Benchmark.stopTiming("canvaskit_decomp");
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
    globalThis.CanvasKit = CanvasKit;
}

Benchmark.startTiming("load_total");

if (loadSource === "tag") {
    Benchmark.startTiming("load_encoder");
    loadBase2nDecoder();
    Benchmark.stopTiming("load_encoder");

    Benchmark.startTiming("load_decompressor");
    loadXzDecompressor();
    Benchmark.stopTiming("load_decompressor");
}

Benchmark.startTiming("apply_patches");
Patches.applyAll();
Benchmark.stopTiming("apply_patches");

Benchmark.startTiming("load_canvaskit");
loadCanvasKit();
Benchmark.stopTiming("load_canvaskit");

Benchmark.stopTiming("load_total");

if (enableDebugger) debugger;
else "a";
