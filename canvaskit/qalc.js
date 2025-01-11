"use strict";
/* global Qalc:readonly, Gnuplot:readonly, calc:readonly */

// config
const plotWidth = 1280,
    plotHeight = 720;

const fontName = "Roboto",
    fontSize = 75;

const customUnits = ["rf", "eu", "tick"];

// sources
const urls = {
    QalculatorInit: "https://files.catbox.moe/5wc7jh.js",
    QalculatorWasm: "https://files.catbox.moe/8zo7eo.wasm",

    UnitDefinitions: "https://files.catbox.moe/7424p9.xml",

    GnuplotInit: "https://files.catbox.moe/jln0df.js",
    GnuplotWasm: "https://files.catbox.moe/xmkrch.wasm",

    RobotoRegular: "https://files.catbox.moe/fmh6l7.ttf"
};

const tags = {
    QalculatorInit: /^ck_qalc_init\d+$/,
    QalculatorWasm: /^ck_qalc_wasm\d+$/,

    UnitDefinitions: "ck_qalc_units",

    GnuplotInit: /^ck_gnuplot_init\d+$/,
    GnuplotWasm: /^ck_gnuplot_wasm\d+$/,

    RobotoRegular: /^ck_font_roboto\d+$/
};

// globals
let input, font;

// main
const main = (() => {
    // parse args
    function getInput() {
        input = tag.args ?? "";
        [, input] = LoaderUtils.parseScript(input);

        if (input.length < 1) {
            exit(":warning: No expression provided.");
        }
    }

    // load libraries
    function initLoader() {
        util.loadLibrary = "none";

        if (util.env) {
            eval(util.fetchTag("canvaskitloader").body);
        } else {
            util.executeTag("canvaskitloader");
        }

        ModuleLoader.useDefault("tagOwner");
        ModuleLoader.enableCache = false;
    }

    function patch() {
        Patches.apply("polyfillPromise", "polyfillTextEncoderDecoder");
    }

    function loadLibraries() {
        if (loadSource === "tag") {
            loadBase2nDecoder();
            loadZstdDecompressor();
        }
    }

    function loadQalculator() {
        Benchmark.startTiming("load_qalculator");

        const QalcInit = ModuleLoader.loadModule(urls.QalculatorInit, tags.QalculatorInit, {
            scope: {
                performance: {
                    now: _ => Benchmark.getCurrentTime()
                },

                runGnuplot: {
                    global: true,
                    value: plotAndReply
                }
            }
        });

        let wasm = ModuleLoader.getModuleCode(urls.QalculatorWasm, tags.QalculatorWasm, FileDataTypes.binary, {
            encoded: true
        });

        if (loadSource === "tag") {
            wasm = ZstdDecompressor.decompress(wasm);
        }

        let Qalc;
        QalcInit({
            wasmBinary: wasm
        })
            .then(qc => (Qalc = qc))
            .catch(err => console.error("err:", err));

        console.replyWithLogs("warn");

        Patches.patchGlobalContext({ Qalc });

        Benchmark.stopTiming("load_qalculator");
    }

    function loadGnuplot() {
        Benchmark.startTiming("load_gnuplot");

        const GnuplotInit = ModuleLoader.loadModule(urls.GnuplotInit, tags.GnuplotInit, {
            scope: {
                performance: {
                    now: Benchmark.getCurrentTime
                }
            }
        });

        let wasm = ModuleLoader.getModuleCode(urls.GnuplotWasm, tags.GnuplotWasm, FileDataTypes.binary, {
            encoded: true
        });

        if (loadSource === "tag") {
            wasm = ZstdDecompressor.decompress(wasm);
        }

        let Gnuplot;
        GnuplotInit({
            wasmBinary: wasm,
            noInitialRun: true,

            print: text => console.log(text),
            printErr: text => console.error(text)
        })
            .then(gp => (Gnuplot = gp))
            .catch(err => console.error("err:", err));

        console.replyWithLogs("warn");

        Patches.patchGlobalContext({ Gnuplot });

        Benchmark.stopTiming("load_gnuplot");
    }

    function loadResvg() {
        loadLibrary("resvg");

        font = ModuleLoader.getModuleCode(urls.RobotoRegular, tags.RobotoRegular, FileDataTypes.binary, {
            encoded: true
        });
    }

    // init libraries
    function initQalculator() {
        Benchmark.startTiming("init_qalculator");

        const FS = Qalc.FS,
            calc = new Qalc.Calculator();

        const lower = input.toLowerCase();

        if (customUnits.some(unit => lower.includes(unit))) {
            Benchmark.startTiming("load_units");

            const units = ModuleLoader.getModuleCode(urls.UnitDefinitions, tags.UnitDefinitions, FileDataTypes.text);

            FS.writeFile("units.xml", units);
            calc.loadDefinitions("units.xml");

            Benchmark.stopTiming("load_units");
        }

        Patches.patchGlobalContext({ calc });

        Benchmark.stopTiming("init_qalculator");
    }

    // qalculate main
    function getTerminalString() {
        return `set terminal svg size ${plotWidth},${plotHeight} font "${fontName},${fontSize}"
set output '/output'`;
    }

    function runGnuplot(data_files, commands, extra_commandline, persist) {
        const FS = Gnuplot.FS;

        const files = Object.keys(data_files);

        for (const [file, data] of Object.entries(data_files)) {
            FS.writeFile(file, data);
        }

        const cmds = commands.replace("set terminal pop", getTerminalString());
        FS.writeFile("/commands", cmds);

        Gnuplot.callMain(["/commands"]);

        const output = FS.readFile("/output", { encoding: "utf8" });

        for (const file of ["/commands", "/output", ...files]) {
            FS.unlink(file);
        }

        return output;
    }

    function renderSvg(svg) {
        svg = svg.replace(/(<\/desc>)/, `$1\n<rect width="100%" height="100%" fill="white" />`);

        const resvg = new Resvg(svg, {
            font: {
                fontBuffers: [font]
            }
        });

        const image = resvg.render(),
            pngBytes = image.asPng();

        return pngBytes;
    }

    function plotAndReply(...data) {
        loadGnuplot();
        const svg = runGnuplot(...data);
        console.replyWithLogs("warn");

        loadResvg();
        const pngBytes = renderSvg(svg);

        exit(
            msg.reply({
                file: {
                    name: "plot.png",
                    data: pngBytes
                }
            })
        );
    }

    return _ => {
        initLoader();

        getInput();

        patch();
        loadLibraries();

        if (enableDebugger) debugger;

        loadQalculator();
        initQalculator();

        return calc.calculateAndPrint(input, 3000);
    };
})();

try {
    // run main
    main();
} catch (err) {
    // output
    if (err instanceof ExitError) {
        err.message;
    } else {
        throw err;
    }
}
