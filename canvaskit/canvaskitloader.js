"use strict";

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

// config
const PromisePolyfillUrl = "https://cdn.jsdelivr.net/npm/promise-polyfill",
    CanvasKitLoaderUrl = "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.js",
    CanvasKitWasmUrl = "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.wasm";

const consoleOpts = {};

// errors
globalThis.CustomError = class CustomError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
};

class LoggerError extends CustomError {}
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

class ModuleLoader {
    static loadModuleFromUrl(url, ...args) {
        const moduleCode = http.request(url).data;
        return ModuleLoader.loadModuleFromSource(moduleCode, ...args);
    }

    static loadModuleFromSource(moduleCode, loaderScope = {}, breakpoint = false) {
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
}

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
        globals.Promise = ModuleLoader.loadModuleFromUrl(PromisePolyfillUrl);
    },

    patchGlobalContext: _ => {
        Object.assign(globalThis, globals);
    },

    patchWasmInstantiate: _ => {
        const original = WebAssembly.instantiate;

        WebAssembly.instantiate = (bufferSource, importObject) => {
            try {
                const instance = new WebAssembly.Instance(new WebAssembly.Module(bufferSource), importObject);
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

        Patches.patchGlobalContext();
        Patches.patchWasmInstantiate();
    }
};

Patches.applyAll();

// CanvasKit loader
function loadCanvasKit() {
    const CanvasKitInit = ModuleLoader.loadModuleFromUrl(
        CanvasKitLoaderUrl,
        {
            exports: {}
        },
        true
    );

    console.replyWithLogs();

    const wasm = http.request({
        url: CanvasKitWasmUrl,
        responseType: "arraybuffer"
    }).data;

    let CanvasKit;
    CanvasKitInit({
        wasmBinary: wasm
    })
        .then(ck => (CanvasKit = ck))
        .catch(err => console.error("Error occured while loading CanvasKit:", err));

    console.replyWithLogs();

    return CanvasKit;
}

globalThis.CanvasKit = loadCanvasKit();

debugger;

("a");
