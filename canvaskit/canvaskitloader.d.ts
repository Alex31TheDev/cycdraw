/**
 * ============================================================================
 * CANVASKITLOADER RUNTIME DECLARATION & DEVELOPER MANUAL
 * ============================================================================
 *
 * This declaration file exposes the public runtime APIs injected into `globalThis`
 * when evaluating the `canvaskitloader` Discord tag.
 *
 * # 1. TAG INVOCATION & INITIALIZATION LIFECYCLE
 *
 * `canvaskitloader` is designed to be evaluated inside another tag's execution scope:
 *
 * - Leveret: `util.executeTag("canvaskitloader");`
 * - El Levert: `eval(util.fetchTag("canvaskitloader").body);`
 *
 * When evaluated standalone (e.g. running `%t canvaskitloader` directly in chat),
 * the loader detects the direct invocation, outputs an information embed with
 * usage examples, and calls `exit()`.
 *
 * ## Pre-Evaluation Configuration (`util`)
 * Before evaluating `canvaskitloader`, callers configure its behavior by setting
 * properties on `globalThis.util`:
 *
 * - `util.loadLibrary`: Target library to load immediately (default: `"canvaskit"`).
 *   Supported targets: `"canvaskit"`, `"cycdraw"`, `"resvg"`, `"lodepng"`, `"gifenc"`,
 *   `"h264"`, `"satori"`, `"babel"`, `"dropflow"`, or `"none"`.
 *   If set to `"none"`, the loader skips downloading and compiling heavy WASM blobs,
 *   and instead injects on-demand loader functions into `globalThis`:
 *   `loadLibrary(name)`, `decompress(data, format)`, `loadBase64Utils()`,
 *   `loadBase2nDecoder()`, `loadBase127Decoder()`, `loadXzDecompressor()`, `loadZstdDecompressor()`.
 *
 * - `util.loadSource`: `"tag"` (default) or `"url"`.
 *   Controls whether module chunks and binary blobs are fetched from Discord tags or external CDNs.
 *
 * - `util._isolateGlobals`: Boolean (default: `true`).
 *   Controls sandbox global context isolation during module loading.
 *
 * - `util._useWasmBase2nDecoder`: Boolean (default: `true`).
 *   When `true`, uses the WebAssembly-accelerated Base2N decoder; when `false`, falls back
 *   to the slower pure JavaScript lookup table decoder.
 *
 * - `util._forceXzDecompressor`: Boolean (default: `false`).
 *   Forces XZ decompression instead of the default Zstandard decompressor for CanvasKit WASM chunks.
 *
 * - `util.inspectorEnabled`: Boolean (default: `false`).
 *   When `true`, enables debugger breakpoints (`debugger;`) before and after module compilation.
 *
 * # 2. GLOBAL ISOLATION AND SCOPE RESTRICTIONS (`isolateGlobals`)
 *
 * By default, `ModuleLoader.loadModuleFromSource` enforces strict global scope isolation:
 * 1. Prior to compiling a module, non-default properties are removed from `globalThis` via
 *    `Patches.removeFromGlobalContext("nondefault")`.
 * 2. After execution, the original global descriptor snapshot is restored.
 *
 * ## CRITICAL RESTRICTION FOR TAG AUTHORS:
 * In JavaScript `"use strict"` mode, top-level `function` declarations (e.g. `function foo() {}`)
 * and top-level `var` statements defined in the caller's global scope become NON-CONFIGURABLE
 * properties on `globalThis`.
 * When `canvaskitloader` attempts to delete non-configurable properties during global isolation,
 * the JavaScript runtime throws a `TypeError`. The loader catches this and aborts with:
 *
 *   `"You're not allowed to have functions defined via the function keyword or vars in the same scope as the load call. Use an object or an IIFE to isolate them."`
 *
 * To avoid this fatal error, tag authors MUST wrap all tag logic and functions inside an IIFE:
 * ```javascript
 * const main = (() => {
 *     // All tag logic, functions, and state live here safely
 *     function helper() { ... }
 *     const util = ModuleLoader.loadModuleFromTag("canvaskitutil");
 * })();
 * ```
 * Top-level `const` and `let` variables with arrow functions are safe; top-level `function`
 * and `var` keywords in the root script body are strictly prohibited.
 *
 * # 3. MULTI-TAG CHUNKING & NATURAL SORTING
 *
 * Discord tags have a body length limit (~2000 chars for standard tags). Large modules
 * (such as CanvasKit WASM, Resvg, H264 encoder, and large fonts) are split into sequential
 * chunks named with numeric suffixes (e.g. `ck_wasm0`, `ck_wasm1`, ... `ck_wasm25`).
 *
 * When `ModuleLoader.loadModuleFromTag` or `getModuleCodeFromTag` receives a `RegExp` pattern
 * (e.g. `/^ck_wasm\d+$/`) or an array of tag names, it:
 * 1. Queries all matching tags using `dumpTags`.
 * 2. Sorts tag names using natural numeric sorting: `a.localeCompare(b, "en", { numeric: true })`.
 *    This ensures `ck_wasm10` is placed after `ck_wasm9` rather than after `ck_wasm1`.
 * 3. Extracts and concatenates their bodies into a single continuous payload before decoding.
 * ============================================================================
 */

/** Supported library targets for `util.loadLibrary` or `loadLibrary(name)`. */
export type ValidLibrary =
    | "none"
    | "canvaskit"
    | "cycdraw"
    | "resvg"
    | "lodepng"
    | "gifenc"
    | "h264"
    | "satori"
    | "babel"
    | "dropflow";

/** Enum instance returned by `createEnum` with frozen keys, values, and lookup Set. */
export type EnumInstance<T extends Record<string, any>> = Readonly<T> & {
    readonly keys: readonly (keyof T)[];
    readonly values: readonly T[keyof T][];
    readonly valid: ReadonlySet<T[keyof T]>;
    has(value: any): boolean;
};

/** Enum instance created from an array of string literals. */
export type EnumArrayInstance<T extends readonly string[]> = {
    readonly [K in T[number]]: K;
} & {
    readonly keys: readonly T[number][];
    readonly values: readonly T[number][];
    readonly valid: ReadonlySet<T[number]>;
    has(value: any): boolean;
};

/**
 * Creates a frozen enum object with bidirectional lookup and membership testing.
 * Injects `.keys`, `.values`, `.valid` (Set), and `.has()` method.
 */
export function createEnum<const T extends readonly string[]>(definitions: T, modifier?: (val: string) => any): EnumArrayInstance<T>;
export function createEnum<T extends Record<string, any>>(definitions: T, modifier?: (val: any) => any): EnumInstance<T>;

/** Return data types for `ModuleLoader.getModuleCode` and `ModuleLoader.loadModule`. */
export interface FileDataTypesDefinitions {
    /** Output decoded bytes as a `Uint8Array`. */
    readonly binary: "binary";
    /** Output raw string content. */
    readonly text: "text";
    /** Execute CommonJS `(module, exports) => { ... }` wrapper and return `module.exports`. */
    readonly module: "module";
    /** Parse JSON string and return parsed JavaScript object. */
    readonly json: "json";
}

export type FileDataTypesEnum = EnumInstance<FileDataTypesDefinitions>;

export type FileDataType = keyof FileDataTypesDefinitions;

/**
 * Options for loading modules from Discord tags via `ModuleLoader.loadModuleFromTag`
 * or `ModuleLoader.getModuleCodeFromTag`.
 */
export interface TagModuleLoadOptions {
    /** Whether to cache the loaded module or code in memory. Defaults to `true`. */
    cache?: boolean;
    /** Bypass cache lookup and force re-fetching and re-compiling. Defaults to `false`. */
    forceReload?: boolean;
    /** Output format for loaded data. Defaults to `FileDataTypes.module`. */
    returnType?: FileDataType;
    /** Discord snowflake ID of the tag owner. Defaults to the loader's configured tag owner. */
    owner?: string;
    /**
     * Decompression / decoding algorithm applied to the tag body:
     * - `true` or `"base2n"`: Decodes Base2N compressed binary string into bytes.
     * - `"base127"`: Decodes Base127 WebAssembly byte string into bytes.
     * - `"base64"`: Decodes standard Base64 string into bytes.
     * - `false`: No decoding applied.
     */
    encoded?: boolean | "base2n" | "base127" | "base64";
    /**
     * Pre-allocated byte buffer size hint for Base2N/Base127 decoding.
     * Avoids dynamic reallocations in the WebAssembly decoder.
     */
    buf_size?: number | null;
    /**
     * Scope isolation toggle for module execution.
     * If `true`, non-default globals are wiped during execution.
     * Remember: Top-level `function` and `var` statements in caller scope will trigger `TypeError`.
     */
    isolateGlobals?: boolean;
    /**
     * If `true`, wraps module execution in a custom handler that rewrites V8 stack traces,
     * converting anonymous VM frames into `at (<module [moduleName]>):line:col`. Defaults to `true`.
     */
    wrapErrors?: boolean;
    /** Injects a `debugger;` statement at module entry. Defaults to `false`. */
    breakpoint?: boolean;
    /**
     * Custom variables injected into the module's execution scope.
     * Properties can be wrapped as `{ value: any, global?: boolean }` to designate
     * whether they appear in local scope or as global variables.
     */
    scope?: Record<string, any>;
    /** Alias for `scope`. */
    loadScope?: Record<string, any>;
    /** Custom alias name used for cache indexing and error stack traces. */
    name?: string;
}

/** Options for loading modules from external URLs via `ModuleLoader.loadModuleFromUrl`. */
export interface UrlModuleLoadOptions {
    /** Whether to cache the loaded module in memory. Defaults to `true`. */
    cache?: boolean;
    /** Force HTTP re-download and bypass cache. Defaults to `false`. */
    forceReload?: boolean;
    /** Output format for loaded data. Defaults to `FileDataTypes.module`. */
    returnType?: FileDataType;
    /** HTTP method (`"get"`, `"post"`). Defaults to `"get"`. */
    requestMethod?: "get" | "post";
    /** Extra options passed to `http.request()`. */
    requestOptions?: Record<string, any>;
    /** Injects a `debugger;` statement at module entry. Defaults to `false`. */
    breakpoint?: boolean;
    /** Custom variables injected into the module's execution scope. */
    scope?: Record<string, any>;
    /** Custom alias name used for cache indexing and error stack traces. */
    name?: string;
}

/** Options for compiling modules directly from source code strings via `ModuleLoader.loadModuleFromSource`. */
export interface SourceModuleLoadOptions {
    /** Module name identifier used in stack trace rewriting and cache indexing. */
    name?: string;
    /** Whether to cache the compiled module exports. Defaults to `true`. */
    cache?: boolean;
    /** Force recompilation and bypass cache. Defaults to `false`. */
    forceReload?: boolean;
    /** Scope isolation setting. Defaults to `ModuleLoader.isolateGlobals`. */
    isolateGlobals?: boolean;
    /** If `true`, rewrites stack traces to map error positions to the module name. Defaults to `true`. */
    wrapErrors?: boolean;
    /** Injects a `debugger;` statement at module entry. Defaults to `false`. */
    breakpoint?: boolean;
}

/**
 * Core dynamic module loader responsible for fetching, decompressing, and executing
 * CommonJS-wrapped modules from Discord tags, external URLs, or raw source strings.
 */
export class ModuleLoader {
    /** Current load source preference: `"tag"` for Discord tags, or `"url"` for external HTTP. */
    static loadSource: "tag" | "url";
    /** Global scope isolation setting. */
    static isolateGlobals: boolean;
    /** Default owner ID for tag lookups. */
    static tagOwner: string | null;
    /** Global breakpoint toggle. */
    static breakpoint: boolean;
    /** Global cache toggle. */
    static enableCache: boolean;

    /**
     * Loads a module using the active `ModuleLoader.loadSource` preference.
     * Dispatches to `loadModuleFromUrl` if source is `"url"`, or `loadModuleFromTag` if source is `"tag"`.
     */
    static loadModule(
        url?: string | null,
        tagName?: string | RegExp | string[] | null,
        options?: TagModuleLoadOptions & UrlModuleLoadOptions
    ): any;

    /**
     * Fetches a module from a Discord tag, decodes/decompresses it if necessary,
     * wraps it in a CommonJS function `(module, exports, ...) => { ... }`, executes it, and returns `module.exports`.
     *
     * Supports multi-tag chunking via `RegExp` pattern or string arrays, automatically sorting
     * chunks numerically via `localeCompare(..., "en", { numeric: true })`.
     *
     * @example
     * ```javascript
     * const CanvasKitUtil = ModuleLoader.loadModuleFromTag("canvaskitutil");
     * const ImageLoader = ModuleLoader.loadModuleFromTag("ck_imageloader", { isolateGlobals: false });
     * ```
     */
    static loadModuleFromTag(tagName: string | RegExp | string[], options?: TagModuleLoadOptions): any;

    /**
     * Downloads source code from a URL via HTTP, executes it as a CommonJS module,
     * and returns `module.exports`.
     */
    static loadModuleFromUrl(url: string, options?: UrlModuleLoadOptions): any;

    /**
     * Executes arbitrary JavaScript source as a CommonJS module with injected scope and globals.
     * Enforces `isolateGlobals` and stack trace rewriting when configured.
     */
    static loadModuleFromSource(
        moduleCode: string,
        loadScope?: Record<string, any>,
        breakpoint?: boolean,
        options?: SourceModuleLoadOptions
    ): any;

    /**
     * Fetches raw code/data from a tag without executing it as a module.
     * Can return raw text, binary `Uint8Array`, or parsed JSON.
     *
     * @example
     * ```javascript
     * // Fetch and decode a binary font file:
     * const fontBytes = ModuleLoader.getModuleCodeFromTag(/^ck_font_roboto\d+$/, FileDataTypes.binary, {
     *     encoded: true,
     *     buf_size: 10700 * 1024
     * });
     * ```
     */
    static getModuleCodeFromTag(
        tagName: string | RegExp | string[],
        returnType?: FileDataType,
        options?: TagModuleLoadOptions
    ): string | Uint8Array;

    /**
     * Fetches raw code/data from a URL without executing it as a module.
     */
    static getModuleCodeFromUrl(
        url: string,
        returnType?: FileDataType,
        options?: UrlModuleLoadOptions
    ): string | Uint8Array;

    /**
     * Fetches raw code/data from either a URL or tag based on `ModuleLoader.loadSource`.
     */
    static getModuleCode(
        url?: string | null,
        tagName?: string | RegExp | string[] | null,
        returnType?: FileDataType,
        options?: TagModuleLoadOptions & UrlModuleLoadOptions
    ): string | Uint8Array;

    /**
     * Temporarily restores default configuration variables (`loadSource`, `isolateGlobals`, `tagOwner`)
     * for the duration of `callback`, then restores the previous settings in a `finally` block.
     *
     * When called WITHOUT a callback (e.g. `ModuleLoader.useDefault("tagOwner")`), permanently
     * resets the specified configuration properties to the loader defaults.
     */
    static useDefault<T>(callback: () => T): T;
    static useDefault<T>(varName: "loadSource" | "isolateGlobals" | "tagOwner", callback: () => T): T;
    static useDefault(...vars: ("loadSource" | "isolateGlobals" | "tagOwner")[]): void;

    /** Clears all cached compiled modules and fetched code bodies. */
    static clearCache(): void;

    /** Utility for mocking `require()` in CommonJS modules. */
    static Require: {
        fakeRequire(id: string): any;
        createFakeRequire(obj?: Record<string, any>): (id: string) => any;
    };
}

/**
 * Performance benchmarking utility for measuring wall-clock timing and invocation counters.
 * Adapts to high-resolution clocks (`performance.now()`), `vm.getWallTime()`, or `Date.now()`.
 */
export class Benchmark {
    /** Active benchmark results mapped as `{ [key]: elapsedMs }`. */
    static data: Record<string, number>;
    /** Active invocation counts mapped as `{ [key]: count }`. */
    static counts: Record<string, number>;

    /** Starts wall-clock timing for the specified key. */
    static startTiming(key: string): void;
    /**
     * Stops timing for the key and records elapsed milliseconds into `Benchmark.data`.
     * Returns elapsed milliseconds.
     */
    static stopTiming(key: string, save?: boolean): number;
    /** Resets the start time for the key, accumulating previous duration. */
    static restartTiming(key: string): void;
    /** Returns formatted timing string or raw numeric milliseconds. */
    static getTime(key: string, format?: boolean): string | number;
    /** Deletes the recorded time for the key. */
    static deleteTime(key: string): boolean;

    /** Returns current timestamp, optionally in milliseconds. */
    static getCurrentTime(ms?: boolean): number;
    /** Busy-waits synchronously for the given duration in milliseconds. */
    static delay(ms: number): void;

    /** Clears all recorded timings and counters. */
    static clear(): void;
    /**
     * Clears all recorded timings except the specified keys.
     * Commonly used by tags to discard initialization benchmarks and retain only draw timing:
     * `Benchmark.clearExcept("load_total");`
     */
    static clearExcept(...keys: string[]): void;
    /** Clears all recorded timings except the last `n` keys. */
    static clearExceptLast(n?: number): void;

    /** Defines an invocation counter initialized to 0. */
    static defineCount(name: string): void;
    /** Increments invocation counter for `name`. */
    static incrementCount(name: string): number;
    /** Returns the current invocation count for `name`. */
    static getCount(name: string, format?: boolean): string | number;
    /** Resets the counter for `name` to 0. */
    static resetCount(name: string): boolean;
    /** Deletes the counter for `name`. */
    static deleteCount(name: string): boolean;
    /** Deletes the last recorded timing corresponding to the current counter value of `name`. */
    static deleteLastCountTime(name: string): boolean;
    /** Clears all counters. */
    static clearCounts(): void;

    /**
     * Returns a formatted summary string (or dictionary) of all recorded timings.
     * Optionally appends a total sum of all timings.
     */
    static getAll(includeSum?: boolean | string[]): string | Record<string, number>;
    /** Returns the sum of elapsed milliseconds across the specified keys (or all keys). */
    static getSum(...keys: string[]): number;

    /**
     * Wraps a function with automatic invocation counting and wall-clock execution timing.
     * Every call to the returned function increments `name` count and records timing under `name [N]`.
     */
    static wrapFunction<T extends (...args: any[]) => any>(name: string, func: T): T;
    /** Removes wrapper and restores original function reference. */
    static removeWrapper(name: string): Function;

    /** Dynamically attached formatted table generator (when tablegen is loaded). */
    static getTable?(style?: string, maxDecimals?: number, ...keys: string[]): string;
}

/**
 * Polyfill and global context management engine.
 */
export interface PatchesManager {
    /** Shared context object storing polyfilled globals for isolated modules. */
    readonly globals: Record<string, any>;
    /** Clears the internal list of loaded patch tracking keys. */
    clearLoadedPatches(): void;
    /** Applies specific patch functions by name (e.g. `"polyfillPromise"`, `"polyfillBuffer"`). */
    apply(...patches: string[]): void;
    /** Defines enumerable, configurable properties on `globalThis`. */
    patchGlobalContext(objs: Record<string, any>): void;
    /** Injects properties into `Patches.globals` for isolated module scopes. */
    addContextGlobals(objs?: Record<string, any>): void;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/** Base custom error class capturing stack traces. */
export class CustomError extends Error {
    constructor(message?: string, ...args: any[]);
}

/** Reference error specialization capturing an associated reference object or identifier. */
export class ReferenceError extends CustomError {
    ref: any;
    constructor(message?: string, ref?: any, ...args: any[]);
}

/**
 * Thrown to immediately terminate tag execution.
 * When caught at the root loader level, tag execution halts cleanly without an error stack trace.
 */
export class ExitError extends CustomError {}

/**
 * Thrown when runtime sandbox integrity verification detects tampered globals
 * (e.g. modified prototypes, non-native functions, or proxied objects).
 */
export class TamperError extends CustomError {}

/**
 * Thrown when utility checks fail.
 */
export class UtilError extends ReferenceError {}

/**
 * Thrown on decompression errors, tag fetching failures, or module compilation errors.
 * Automatically wraps and preserves the cause error stack trace.
 */
export class LoaderError extends ReferenceError {}

// ============================================================================
// GLOBAL SCOPE DECLARATIONS
// ============================================================================

declare global {
    /** File data type constants (`binary`, `text`, `module`, `json`). */
    const FileDataTypes: FileDataTypesEnum;

    /** Core dynamic module loader. */
    const ModuleLoader: {
        loadSource: "tag" | "url";
        isolateGlobals: boolean;
        tagOwner: string | null;
        breakpoint: boolean;
        enableCache: boolean;

        loadModule(
            url?: string | null,
            tagName?: string | RegExp | string[] | null,
            options?: TagModuleLoadOptions & UrlModuleLoadOptions
        ): any;
        loadModuleFromTag(tagName: string | RegExp | string[], options?: TagModuleLoadOptions): any;
        loadModuleFromUrl(url: string, options?: UrlModuleLoadOptions): any;
        loadModuleFromSource(
            moduleCode: string,
            loadScope?: Record<string, any>,
            breakpoint?: boolean,
            options?: SourceModuleLoadOptions
        ): any;
        getModuleCodeFromTag(
            tagName: string | RegExp | string[],
            returnType?: FileDataType,
            options?: TagModuleLoadOptions
        ): string | Uint8Array;
        getModuleCodeFromUrl(
            url: string,
            returnType?: FileDataType,
            options?: UrlModuleLoadOptions
        ): string | Uint8Array;
        getModuleCode(
            url?: string | null,
            tagName?: string | RegExp | string[] | null,
            returnType?: FileDataType,
            options?: TagModuleLoadOptions & UrlModuleLoadOptions
        ): string | Uint8Array;
        useDefault<T>(callback: () => T): T;
        useDefault<T>(varName: "loadSource" | "isolateGlobals" | "tagOwner", callback: () => T): T;
        useDefault(...vars: ("loadSource" | "isolateGlobals" | "tagOwner")[]): void;
        clearCache(): void;
        Require: {
            fakeRequire(id: string): any;
            createFakeRequire(obj?: Record<string, any>): (id: string) => any;
        };
    };

    /** Performance benchmarking and counters utility. */
    const Benchmark: {
        data: Record<string, number>;
        counts: Record<string, number>;
        startTiming(key: string): void;
        stopTiming(key: string, save?: boolean): number;
        restartTiming(key: string): void;
        getTime(key: string, format?: boolean): string | number;
        deleteTime(key: string): boolean;
        getCurrentTime(ms?: boolean): number;
        delay(ms: number): void;
        clear(): void;
        clearExcept(...keys: string[]): void;
        clearExceptLast(n?: number): void;
        defineCount(name: string): void;
        incrementCount(name: string): number;
        getCount(name: string, format?: boolean): string | number;
        resetCount(name: string): boolean;
        deleteCount(name: string): boolean;
        deleteLastCountTime(name: string): boolean;
        clearCounts(): void;
        getAll(includeSum?: boolean | string[]): string | Record<string, number>;
        getSum(...keys: string[]): number;
        wrapFunction<T extends (...args: any[]) => any>(name: string, func: T): T;
        removeWrapper(name: string): Function;
        getTable?(style?: string, maxDecimals?: number, ...keys: string[]): string;
    };

    /** Polyfill and global context management interface. */
    const Patches: PatchesManager;

    /** Current module load source preference (`"tag"` | `"url"`). */
    const loadSource: "tag" | "url";

    /** Debugger flag. */
    const enableDebugger: boolean;

    /** Base error class for canvaskit loader. */
    class CustomError extends Error {
        constructor(message?: string, ...args: any[]);
    }
    /** Reference error specialization. */
    class RefError extends CustomError {
        ref: any;
        constructor(message?: string, ref?: any, ...args: any[]);
    }
    /** Thrown to immediately terminate tag execution with an optional message. */
    class ExitError extends CustomError {}
    /** Thrown when sandbox integrity verification detects tampered globals. */
    class TamperError extends CustomError {}
    /** Thrown when utility checks fail. */
    class UtilError extends RefError {}
    /** Thrown when module loading or decompression fails. */
    class LoaderError extends RefError {}

    /** Immediately terminates tag execution and outputs the given message to Discord. */
    function exit(message?: string): never;

    /**
     * Dynamically loads a library into the global scope.
     * Only available when `util.loadLibrary` is set to `"none"`.
     *
     * @example
     * ```javascript
     * // In tag initialization:
     * util.loadLibrary = "none";
     * eval(util.fetchTag("canvaskitloader").body);
     *
     * // Later in code, load libraries lazily:
     * loadLibrary("canvaskit");
     * loadLibrary("cycdraw");
     * ```
     */
    function loadLibrary(library: ValidLibrary): void;

    /**
     * Decompresses Zstandard (`"zstd"`) or XZ (`"xz"`) compressed byte buffers.
     * Dispatches to WebAssembly decompressors.
     *
     * If `format` is omitted, automatically resolves the currently loaded decompressor.
     * If running in URL load source mode, returns the input data directly.
     */
    function decompress(data: Uint8Array | ArrayBuffer, format?: "zstd" | "xz"): Uint8Array;

    /** High-performance WebAssembly Base2N decoder. */
    function fastDecodeBase2n(input: string, bufSizeHint?: number): Uint8Array;
    /** High-performance WebAssembly Base127 decoder. */
    function fastDecodeBase127(input: string, bufSizeHint?: number): Uint8Array;

    /** Lazy loader function for Base64 utilities. Available when `loadLibrary: "none"`. */
    function loadBase64Utils(): void;
    /** Lazy loader function for Base2N decoders. Available when `loadLibrary: "none"`. */
    function loadBase2nDecoder(): void;
    /** Lazy loader function for Base127 decoders. Available when `loadLibrary: "none"`. */
    function loadBase127Decoder(): void;
    /** Lazy loader function for XZ WASM decompressor. Available when `loadLibrary: "none"`. */
    function loadXzDecompressor(): void;
    /** Lazy loader function for Zstandard WASM decompressor. Available when `loadLibrary: "none"`. */
    function loadZstdDecompressor(): void;

    // --- Dynamic Libraries (Injected when specified in `loadLibrary`) ---

    /** CanvasKit (Skia WebAssembly build). Injected when library `"canvaskit"` is loaded. */
    const CanvasKit: any;

    /** Cycdraw drawing engine object. Injected when library `"cycdraw"` is loaded. */
    const cycdraw: any;

    /** Resvg SVG rendering engine. Injected when library `"resvg"` is loaded. */
    const Resvg: any;

    /** Lodepng PNG encoder and decoder. Injected when library `"lodepng"` is loaded. */
    const lodepng: {
        encode(image: { data: Uint8Array; width: number; height: number }): Uint8Array;
        decode(buffer: Uint8Array): { data: Uint8Array; width: number; height: number };
    };

    /** Gifenc animated GIF encoder. Injected when library `"gifenc"` is loaded. */
    const gifenc: {
        GIFEncoder: any;
        quantize: any;
        applyPalette: any;
    };

    /** H264 MP4 video encoder. Injected when library `"h264"` is loaded. */
    const H264MP4Encoder: any;

    /** Satori JSX-to-SVG engine. Injected when library `"satori"` is loaded. */
    const Satori: any;

    /** Babel Standalone compiler. Injected when library `"babel"` is loaded. */
    const Babel: any;

    /** Dropflow CSS layout engine. Injected when library `"dropflow"` is loaded. */
    const dropflow: any;

    // --- Utility Namespaces ---

    /** Comprehensive utility namespace combining all utility helper methods. */
    interface LoaderUtilsNamespace {
        createEnum: typeof createEnum;
        countTypes: EnumArrayInstance<readonly ["characters", "words", "lines"]>;
        lengthTypes: EnumArrayInstance<readonly ["string", "array"]>;
        overSizeLimits: EnumArrayInstance<readonly ["characters", "lines"]>;

        sameValue(a: any, b: any): boolean;
        bytesToHex(bytes: Uint8Array | number[]): string;
        hexToBytes(hex: string): Uint8Array;
        numberToBytes(num: number | bigint, byteLength?: number, le?: boolean): Uint8Array;
        bytesToNumber(bytes: Uint8Array, le?: boolean): number;

        clamp(val: number, min?: number, max?: number): number;
        round(val: number, decimals?: number): number;
        smallRound(val: number, decimals?: number): number;
        deviate(val: number, deviation: number): number;
        random(min?: number, max?: number, float?: boolean): number;
        randomElement<T>(array: T[]): T;
        setRandomElement<T>(array: T[], val: T): T[];
        randomString(length: number, charset?: string): string;
        countDigits(num: number, radix?: number): number;
        formatNumber(num: number, digits?: number): string;
        formatSize(bytes: number, decimals?: number): string;

        timeDelta(d1: Date | number, d2?: Date | number): number;
        duration(ms: number, options?: any): string;
        durationSeconds(seconds: number, options?: any): string;

        first<T>(arr: T[]): T;
        last<T>(arr: T[]): T;
        before<T>(arr: T[], index: number): T[];
        after<T>(arr: T[], index: number): T[];
        setFirst<T>(arr: T[], val: T): T[];
        setLast<T>(arr: T[], val: T): T[];
        setAfter<T>(arr: T[], index: number, val: T): T[];

        empty(val: any): boolean;
        multiple(n: number): string;
        single(n: number): string;
        getErrorMessage(err: any): string;
        hasPrefix(prefixes: string[] | Set<string> | EnumInstance<any>, str: string): boolean;
        parseBool(val: any): boolean;
        parseInt(val: any, radix?: number): number;
        parseRanges(rangesStr: string, base?: number): [number, number][];
        maskRanges(str: string, ranges: [number, number][], maskChar?: string): string;
        removeStringRange(str: string, range: [number, number]): string;
        replaceStringRange(str: string, range: [number, number], replacement: string): string;
        splitAt(str: string, index: number): [string, string];
        splitChars(str: string): string[];
        stripSpaces(str: string): string;
        trimString(str: string, charLimit?: number, lineLimit?: number): string;
        countChars(str: string): number;
        countLines(str: string): number;
        nonemptyString(str: any): boolean;
        capitalize(str: string): string;
        uncapitalize(str: string): string;
        toggleCase(str: string): string;
        validUrl(url: string): boolean;
        utf8ByteLength(str: string): number;
    }

    /**
     * Comprehensive utility namespace combining `ArrayUtil`, `ObjectUtil`, `TypeTester`,
     * `DiscordUtil`, `FunctionUtil`, `RegexUtil`, `CaseUtil`, and generic loader utilities.
     */
    const LoaderUtils: LoaderUtilsNamespace &
        typeof ArrayUtil &
        typeof ObjectUtil &
        typeof TypeTester &
        typeof DiscordUtil &
        typeof FunctionUtil &
        typeof RegexUtil &
        typeof CaseUtil &
        Record<string, any>;

    /** Alias for `LoaderUtils`. */
    const Util: typeof LoaderUtils;

    /** Discord message, embed, attachment, and tag utilities. */
    const DiscordUtil: {
        msgCharLimit: number;
        embedCharLimit: number;
        userIdRegex: RegExp;
        mentionRegex: RegExp;
        codeblockRegex: RegExp;
        msgUrlRegex: RegExp;
        attachUrlRegex: RegExp;
        parseScriptRegex: RegExp;
        singleMsgRegex: RegExp;
        singleAttachRegex: RegExp;
        discordEpoch: number;
        EmbedCountAreas: Record<string, string>;
        formatUser(user: any, id?: string | null, discord?: boolean, options?: any): string;
        validTagName(name: string): boolean;
        findUserIds(str: string): string[];
        findMentions(str: string): string[];
        findCodeblocks(str: string): [number, number][];
        maskCodeblocks(str: string, mask?: string): string;
        codeBlock(lang: string, content?: string): string;
        escapeMarkdown(text: string, options?: any): string;
        parseScript(script: string): { body: string; isScript: boolean; lang: string };
        getMessageUrl(serverId: string, channelId: string, messageId: string): string;
        parseMessageUrl(url: string): any;
        findMessageUrls(str: string): any[];
        isAttachmentUrl(url: string): boolean;
        parseAttachmentUrl(url: string): any;
        findAttachmentUrls(str: string): any[];
        hasAttachmentUrls(str: string): boolean;
        snowflakeFromDate(date: Date): string;
        dateFromSnowflake(snowflake: bigint | string): Date;
        fetchAttachment(
            msg: any,
            returnType?: FileDataType,
            options?: {
                allowedContentType?: string[];
                allowedContentTypes?: string[];
                maxSize?: number;
            }
        ): { attach: any; body: any; contentType: string };
        fetchTag(name: string, owner?: string): any;
        dumpTags(search?: string | RegExp): string[];
        fullDump(search?: string | RegExp, options?: any): any[];
        markdownTrimString(str: string, charLimit: number, lineLimit: number): string;
        getTagBody(tag: { body: string }): string;
        formatOutput(out: any): string | undefined;
        getEmbedData(embed: any): any;
        formatEmbed(options?: {
            title?: string;
            description?: string;
            color?: number;
            fields?: { name: string; value: string; inline?: boolean }[];
            footer?: string | { text: string; icon_url?: string };
            author?: string | { name: string; icon_url?: string; url?: string };
            image?: string | { url: string };
            thumbnail?: string | { url: string };
            timestamp?: string | number | Date;
        }): Record<string, any>;
        getEmbedSize(embed: any, options?: any): number;
        embedOverSizeLimit(
            embed: any,
            charLimit?: number,
            lineLimit?: number,
            options?: any
        ): false | [number | null, number | null];
        embedOverSizeLimits(
            embed: any,
            charLimit?: number,
            lineLimit?: number,
            options?: any
        ): false | [number | null, number | null];
        trimEmbed(embed: any, charLimit?: number, lineLimit?: number, options?: any): any;
        formatErrorEmbed(
            header?: string,
            err?: any,
            options?: {
                charLimit?: number;
                lang?: string;
                language?: string;
            }
        ): { content: string; embed?: { description: string } };
    };

    /** Array manipulation utilities. */
    const ArrayUtil: {
        withLength<T>(length: number, callback: (i: number) => T): T[];
        guaranteeArray<T>(val: T | T[], length?: number, nullEmpty?: boolean): T[];
        guaranteeSet<T>(obj: T | Iterable<T> | null): Set<T>;
        guaranteeFirst<T>(val: T | T[]): T;
        sum<T>(array: T[], callback?: ((item: T) => number) | string): number;
        concat<T>(array: T[], ...args: any[]): T[];
        frequency<T>(array: T[], callback?: ((item: T) => any) | string): Map<any, number>;
        hasDuplicates<T>(array: T[], callback?: ((item: T) => any) | string): boolean;
        unique<T>(array: T[], callback?: ((item: T) => any) | string): T[];
        sameElements<T>(arr1: T[], arr2: T[], strict?: boolean, callback?: ((item: T) => any) | string): boolean;
        diff<T>(
            oldArray: T[],
            newArray: T[],
            callback?: ((item: T) => any) | string
        ): { shared: T[]; removed: T[]; added: T[] };
        sort<T>(array: T[], callback?: ((item: T) => any) | string): T[];
        groupBy<T>(array: T[], callback?: ((item: T, i: number) => string | number) | string): Record<string, T[]>;
        groupByMap<T>(array: T[], callback?: ((item: T, i: number) => any) | string): Map<any, T[]>;
        split<T>(array: T[], callback: (item: T, i: number) => boolean | number): [T[], T[]];
        zip<A, B>(arr1: A[], arr2: B[]): [A, B][];
        maxLength(array: any[], lengthType?: "string" | "array"): number;
        toUint8Array(data: any): Uint8Array;
    };

    /** Object inspection, cloning, and transformation utilities. */
    const ObjectUtil: {
        isObject(val: any): boolean;
        guaranteeObject<T extends object>(val: any, fallback?: T, key?: string | null): T;
        filterObject<T extends object>(obj: T, predicate: (key: string, val: any) => boolean): Partial<T>;
        rewriteObject<T extends object, R>(obj: T, transform: (key: string, val: any) => R): Record<string, R>;
        removeNullValues<T extends object>(obj: T): Partial<T>;
        removeUndefinedValues<T extends object>(obj: T): Partial<T>;
        reverseObject<T extends object>(obj: T): Record<string, string>;
        groupBy<T>(items: T[], callback: (item: T, i: number) => string | number): Record<string, T[]>;
        shallowClone<T extends object>(obj: T, mode?: "enum" | "keys" | "all"): T;
        assign<T extends object>(target: T, source: any, mode?: "enum" | "keys" | "all", descOverrides?: any): T;
        setValuesWithDefaults<T extends object>(target: T, source: any, defaults?: any): T;
        getBooleanOptions(options: any, defaults?: any, objectDefaults?: any): Record<string, boolean>;
        defineProperty(obj: any, factory: Function, ...args: any[]): void;
        makeMirrorObject(target: any, source: any): any;
        makeInfiniteObject(): any;
        makeNonConfigurableObject(obj?: any): any;
    };

    /** Type verification and enumeration normalization utilities. */
    const TypeTester: {
        isObject(val: any): boolean;
        isArray(val: any): boolean;
        isTypedArray(val: any): boolean;
        isClass(val: any): boolean;
        isPromise(val: any): boolean;
        isRegex(val: any): boolean;
        className(val: any): string;
        charType(char: string): string;
        isInRange(value: number, range: [number, number][]): boolean;
        outOfRange(propName: string | number, min?: number, max?: number, ...args: any[]): boolean | any;
        asUint8Array(val: any, encoding?: string): Uint8Array;
        bufferIsGif(buf: Uint8Array): boolean;
        normalizeEnum<T extends string>(
            val: any,
            allowed: readonly T[] | Set<T>,
            name?: string,
            errorCls?: any,
            options?: any
        ): T;
        normalizeEnums<T extends string>(
            vals: any[],
            allowed: readonly T[] | Set<T>,
            name?: string,
            errorCls?: any,
            options?: any
        ): T[];
        validateProps(obj: any, schema: Record<string, any>): boolean;
    };

    /** HTTP request building and header parsing utilities. */
    const HttpUtil: {
        protocolRegex: RegExp;
        leadingSlashRegex: RegExp;
        trailingSlashRegex: RegExp;
        paramSlashRegex: RegExp;
        paramSplitRegex: RegExp;
        CRLF: string;
        CRLF2: string;
        formContent: string;
        joinUrl(...parts: string[]): string;
        getQueryString(params?: Record<string, any>): string;
        getHttpErrStatus(res: any, reqErr: any): number | null;
        getContentType(ext: string): string;
        getFormBoundary(): string;
        getFormCtype(boundary: string): string;
        encodeFormMeta(meta: string[], data: Uint8Array): [number, Uint8Array];
    };

    /** String case transformation utilities (camelCase, snake_case, PascalCase, kebab-case). */
    const CaseUtil: {
        splitWords(input: string | string[]): string[];
        toWords(input: string | string[], capitalized?: boolean): string;
        isCamelCase(str: string): boolean;
        toCamelCase(input: string | string[]): string;
        isPascalCase(str: string): boolean;
        toPascalCase(input: string | string[]): string;
        isSnakeCase(str: string, uppercase?: boolean): boolean;
        toSnakeCase(input: string | string[], uppercase?: boolean): string;
        isKebabCase(str: string, uppercase?: boolean): boolean;
        toKebabCase(input: string | string[], uppercase?: boolean): string;
    };

    /** Classical encryption and alphabet permutation utilities. */
    const EncryptionUtil: {
        createShiftedAlphabet(alphabet: string, shift: number): string;
        caesarCipher(str: string, shift: number, mode?: number): string;
    };

    /** Multipart file upload utilities for external file hosts. */
    const UploadUtil: {
        uploadToCustom(
            apiUrl: string,
            data: Uint8Array | ArrayBuffer,
            ext: string,
            options?: {
                fileField?: string;
                fields?: Record<string, any>;
                contentType?: string;
                returnType?: string;
                headers?: Record<string, string>;
            }
        ): any;
        uploadToCatbox(data: Uint8Array | ArrayBuffer, ext: string, options?: any): string;
        uploadToFilecan(data: Uint8Array | ArrayBuffer, ext: string, options?: any): string;
    };

    /** Regular expression manipulation, escaping, and pattern generation utilities. */
    const RegexUtil: {
        escapeRegex(str: string): string;
        escapeCharClass(str: string): string;
        flagsRegex: RegExp;
        validFlags(flags?: string): boolean;
        firstGroup(match: RegExpMatchArray | null, name: string): string | null;
        wordStart(str: string, idx: number): boolean;
        wordEnd(str: string, idx: number): boolean;
        getWordRegex(words: string | string[], flags?: string): RegExp | null;
        getMergedRegex(exps: RegExp[]): RegExp | null;
        multipleReplace(str: string, rules?: [RegExp, string | ((...args: any[]) => string)][]): string;
        templateReplace(template: string, strings: Record<string, string>): string;
    };

    /** Function binding and argument inspection utilities. */
    const FunctionUtil: {
        bindArgs<T extends Function>(fn: T, boundArgs: any | any[]): T;
        functionArgumentNames(func: Function): string[];
        getArgumentPositions(func: Function, names: string | string[]): number[];
    };

    /** High-performance string-to-byte encoding, decoding, and UTF-8 conversion utilities. */
    const LoaderTextEncoder: {
        stringToBytes(str: string): Uint8Array;
        bytesToString(data: Uint8Array | ArrayBuffer | number[]): string;
        stringToUtf8(str: string): Uint8Array;
        stringUtf8Length(str: string): number;
        encodeObjectToBuffer(obj: Record<string, number>): Uint8Array;
        decodeObjectFromBuffer(
            data: Uint8Array | ArrayBuffer | number[],
            keys: string[]
        ): [Record<string, number>, Uint8Array];
    };
}
