"use strict";
/* global Qalc:readonly, Gnuplot:readonly, calc:readonly */

const urls = {
    QalculatorInit: "https://files.catbox.moe/ovp1mx.js",
    QalculatorWasm: "https://files.catbox.moe/484lx1.wasm",

    GnuplotInit: "https://files.catbox.moe/jln0df.js",
    GnuplotWasm: "https://files.catbox.moe/xmkrch.wasm",

    RobotoRegular: "https://files.catbox.moe/fmh6l7.ttf"
};

const tags = {
    QalculatorInit: "ck_qalc_init",
    QalculatorWasm: /^ck_qalc_wasm\d+$/,

    GnuplotInit: /^ck_gnuplot_init\d+$/,
    GnuplotWasm: /^ck_gnuplot_wasm\d+$/,

    RobotoRegular: /^ck_font_roboto\d+$/
};

const plotWidth = 1280,
    plotHeight = 720;

let font;

const main = (() => {
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

    function getInput() {
        let input = tag.args ?? "";
        [, input] = LoaderUtils.parseScript(input);

        if (input.length < 1) {
            const out = ":warning: No expression provided.";
            throw new ExitError(out);
        }

        return input;
    }

    function patch() {
        Patches.apply("polyfillPromise", "polyfillTextEncoderDecoder");
    }

    function loadMisc() {
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

    function initQalculator() {
        const calc = new Qalc.Calculator();
        calc.loadGlobalDefinitions();

        Patches.patchGlobalContext({ calc });
    }

    function runGnuplot(data_files, commands, extra_commandline, persist) {
        const FS = Gnuplot.FS;

        const files = Object.keys(data_files);

        for (const [file, data] of Object.entries(data_files)) {
            FS.writeFile(file, data);
        }

        const cmds = commands.replace(
            "set terminal pop",
            `set terminal svg size ${plotWidth},${plotHeight} font "Roboto,25"
set output '/output'`
        );
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

        msg.reply({
            file: {
                name: "plot.png",
                data: pngBytes
            }
        });

        throw new ExitError();
    }

    return _ => {
        initLoader();

        const input = getInput();

        patch();
        loadMisc();

        loadQalculator();
        initQalculator();

        return calc.calculateAndPrint(input, 3000);
    };
})();

try {
    main();
} catch (err) {
    if (err instanceof ExitError) {
        const out = err.message;
        out;
    } else {
        throw err;
    }
}
