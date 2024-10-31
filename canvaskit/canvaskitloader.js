"use strict";

// config
const urls = {
    PromisePolyfillUrl: "https://cdn.jsdelivr.net/npm/promise-polyfill",

    CanvasKitLoaderUrl: "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvakit.js",
    CanvasKitWasmUrl: "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.wasm"
};

const tags = {
    Base2nTagName: "base2n",

    XzDecompressorTagName: "xzdecompressor",
    XzWasmTagName: "xzwasm",

    PromisePolyfillTagName: "promise",

    CanvasKitLoaderTagName: "ckloader",
    CanvasKitWasmTagName: "ckwasm"
};

const loadSource = 0 ? "url" : "tag";

const consoleOpts = {};

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
    msg.reply(`:information_source: This is meant to be used inside eval, not as a standalone tag.

Usage example:
\`util.executeTag("canvaskitloader");\`
\`eval(util.fetchTag("canvaskitloader").body);\``);
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
class CanvasUtilError extends CustomError {}

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
globalThis.FileDataTypes = {
    text: "text",
    binary: "arraybuffer"
};

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

    fetchTag: (name, owner) => {
        const tag = util.fetchTag(name);

        if (tag === null || typeof tag === "undefined") {
            throw new LoaderError("Unknown tag: " + name);
        }

        if (owner !== null && typeof owner !== "undefined" && tag.owner !== owner) {
            throw new LoaderError(`Incorrect tag owner (${tag.owner} =/= ${owner}) for tag: ${name}`);
        }

        return tag;
    },

    leveretScriptBodyRegex: /^`{3}([\S]+)?\n([\s\S]+)`{3}$/u,
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

globalThis.Benchmark = class Benchmark {
    static data = {};
    static timepoints = new Map();

    static useVmTime = typeof vm !== "undefined";
    static ns_per_ms = 10n ** 6n;

    static getCurrentTime() {
        return this.useVmTime ? vm.getWallTime() : Date.now();
    }

    static startTiming(key) {
        const t1 = this.getCurrentTime();
        this.timepoints.set(key, t1);
    }

    static stopTiming(key) {
        const t1 = this.timepoints.get(key);

        if (typeof t1 === "undefined") {
            return;
        }

        this.timepoints.delete(key);

        let t2 = this.getCurrentTime(),
            diff;

        if (this.useVmTime) {
            diff = Number((t2 - t1) / Benchmark.ns_per_ms);
        } else {
            diff = t2 - t1;
        }

        this.data[key] = diff;
    }

    static getTime(key) {
        const time = this.data[key];

        if (typeof time === "undefined") {
            return "Key not found";
        }

        return time.toLocaleString() + "ms";
    }

    static clear() {
        for (const key of Object.keys(this.data)) {
            delete this.data[key];
        }

        this.timepoints.clear();
    }

    static getAll() {
        const times = Object.entries(this.data).map(([key, time]) => `${key}: ${time.toLocaleString()}ms`);
        return times.join(",\n");
    }
};

globalThis.ModuleLoader = class ModuleLoader {
    static getModuleCodeFromUrl(url, returnType = FileDataTypes.text, options = {}) {
        if (url === null || typeof url === "undefined" || url.length < 1) {
            throw new LoaderError("Invalid URL");
        }

        return http.request({
            url,
            method: "get",
            responseType: returnType
        }).data;
    }

    static getModuleCodeFromTag(tagName, returnType = FileDataTypes.text, options = {}) {
        if (tagName === null || typeof tagName === "undefined") {
            throw new LoaderError("Invalid tag name");
        }

        const useName = typeof tagName === "string",
            useArray = Array.isArray(tagName),
            usePattern = tagName instanceof RegExp;

        const encoded = options.encoded ?? false,
            owner = options.owner;

        let moduleCode;

        if (useName) {
            if (tagName.length < 1) {
                throw new LoaderError("Invalid tag name");
            }

            const tag = util.fetchTag(tagName, owner);
            moduleCode = this._getTagBody(tag);
        } else {
            let tagNames;

            if (useArray) {
                tagNames = tagName;
            } else if (usePattern) {
                tagNames = util.dumpTags().filter(name => tagName.test(name));
            } else {
                throw new LoaderError("Invalid tag name");
            }

            const tags = tagNames.map(name => this._getTag(name, owner));
            moduleCode = tags.map(tag => this._getTagBody(tag)).join("");
        }

        if (encoded) {
            if (typeof decodeBase2n === "undefined" || typeof table === "undefined") {
                throw new LoaderError("Base2n decoder not initialized");
            }

            moduleCode = decodeBase2n(moduleCode, table, {
                predictSize: true
            });
        }

        switch (returnType) {
            case FileDataTypes.text:
                if (Array.isArray(moduleCode) || ArrayBuffer.isView(moduleCode)) {
                    return TextEncoder.bytesToString(moduleCode);
                }

                return moduleCode;
            case FileDataTypes.binary:
                if (Array.isArray(moduleCode) || ArrayBuffer.isView(moduleCode)) {
                    return moduleCode;
                }

                return TextEncoder.stringToBytes(moduleCode);
            default:
                throw new LoaderError("Unknown return type: " + returnType);
        }
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

        let module = { exports: {} };

        if (breakpoint) {
            moduleCode = `debugger;\n\n${moduleCode}`;
        }

        const loaderParams = ["module", ...Object.keys(globals), ...Object.keys(loaderScope)],
            loaderFn = new Function(loaderParams, moduleCode);

        const loaderArgs = [module, ...Object.values(globals), ...Object.values(loaderScope)];
        loaderFn(...loaderArgs);

        return module.exports;
    }

    static loadModuleFromUrl(url, ...args) {
        const moduleCode = this.getModuleCodeFromUrl(url);
        return this.loadModuleFromSource(moduleCode, ...args);
    }

    static loadModuleFromTag(tagName, ...args) {
        const moduleCode = this.getModuleCodeFromTag(tagName);
        return this.loadModuleFromSource(moduleCode, ...args);
    }

    static loadModule(url, tagName, ...args) {
        switch (loadSource) {
            case "url":
                if (url === null) {
                    return;
                }

                return this.loadModuleFromUrl(url, ...args);
            case "tag":
                if (tagName === null) {
                    return;
                }

                return this.loadModuleFromTag(tagName, ...args);
            default:
                throw new LoaderError("Invalid load source: " + loadSource);
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
        globals.Promise = ModuleLoader.loadModule(urls.PromisePolyfillUrl, tags.PromisePolyfillTagName);
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
    const base2n = ModuleLoader.loadModule(null, tags.Base2nTagName);

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
    const XzDecompressor = ModuleLoader.loadModule(null, tags.XzDecompressorTagName);

    if (typeof XzDecompressor === "undefined") {
        return;
    }

    const xzWasm = ModuleLoader.getModuleCode(null, tags.XzWasmTagName, FileDataTypes.binary, true);
    XzDecompressor.loadWasm(xzWasm);

    globalThis.XzDecompressor = XzDecompressor;
}

// canvaskit loader
function loadCanvasKit() {
    Benchmark.startTiming("load canvaskit");

    const CanvasKitInit = ModuleLoader.loadModule(
        urls.CanvasKitLoaderUrl,
        tags.CanvasKitLoaderTagName,
        {
            exports: {}
        },
        true
    );

    console.replyWithLogs();

    const wasm = XzDecompressor.decompress(
        ModuleLoader.getModuleCode(urls.CanvasKitWasmUrl, tags.CanvasKitWasmTagName, FileDataTypes.binary, true)
    );

    let CanvasKit;
    CanvasKitInit({
        wasmBinary: wasm
    })
        .then(ck => (CanvasKit = ck))
        .catch(err => console.error("Error occured while loading CanvasKit:", err));

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

debugger;

("a");
