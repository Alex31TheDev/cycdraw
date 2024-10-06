debugger;

const PromisePolyfillUrl = "https://cdn.jsdelivr.net/npm/promise-polyfill",
    CanvasKitLoaderUrl = "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.js",
    CanvasKitWasmUrl = "https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.wasm";

class CustomError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class LoggerError extends CustomError {}
class CanvasUtilError extends CustomError {}

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

                JSON.stringify(obj, Object.getOwnPropertyNames(obj), this.objIndentation);
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
        if (this.log_str.length > 0) {
            msg.reply(this.log_str);
        }
    }
}

function polyfillTimers() {
    setTimeout = f => {
        f();
        return 0;
    };

    setImmediate = f => {
        f();
        return 0;
    };

    clearTimeout = _ => {};
    clearImmediate = _ => {};
}

const console = new Logger();
polyfillTimers();

function loadModuleFromUrl(url, loaderScope = {}, breakpoint = false) {
    let module = { exports: {} },
        moduleCode = http.request(url).data;

    if (breakpoint) {
        moduleCode = `debugger;\n\n${moduleCode}`;
    }

    const loaderParams = ["console", "module", ...Object.keys(loaderScope)],
        loaderFn = new Function(loaderParams, moduleCode);

    const loaderArgs = [console, module, ...Object.values(loaderScope)];
    loaderFn(...loaderArgs);

    return module.exports;
}

function patchWasmInstantiate() {
    const original = WebAssembly.instantiate;

    WebAssembly.instantiate = (bufferSource, importObject) => {
        try {
            const instance = new WebAssembly.Instance(new WebAssembly.Module(bufferSource), importObject);
            instance.instance = instance;

            return Promise.resolve(instance);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    return original;
}

const Promise = loadModuleFromUrl(PromisePolyfillUrl);
patchWasmInstantiate();

function loadCanvasKit() {
    const CanvasKitInit = loadModuleFromUrl(
        CanvasKitLoaderUrl,
        {
            exports: {},
            Promise
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

    return CanvasKit;
}

const CanvasKit = loadCanvasKit();

debugger;
