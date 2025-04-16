"use strict";
/* global CanvasKitUtil:readonly, gifenc:readonly, Image:readonly, Color:readonly */

// config
const sliceWidth = 10,
    backgroundTreshold = 10,
    identicalTreshold = 3;

let showTimes = false;

// sources
const urls = {};

const tags = {
    ImageLoader: "ck_imageloader",
    CanvasKitUtil: "canvaskitutil",
    Table: "ck_table",

    Cycdraw: "ck_cycdraw",
    GifEncoder: "ck_gifenc"
};

// help
const showTimesOption = "--show-times";

const help = `Usage: \`%t ${tag.name} [--show-times] [url]\`
Uncaptions the given image (from the message you answered or the URL)`;

// globals

// input
let targetMsg, text;

// image
let image, width, height, isGif;

// uncaption
let bgColor = [255, 255, 255];
let output;

// main
const main = (() => {
    // parse args and attachment
    let _parseArgs, _loadImage;

    function parseArgs() {
        initImageLoader();

        ({ targetMsg, text } = _parseArgs());
    }

    function loadImage() {
        ({ image, width, height, isGif } = _loadImage());

        if (isGif) {
            loadGifEncoder();
        } else if (targetMsg.attachInfo.ext !== ".png") {
            image = Image.fromCanvaskitImage(image, true);
            loadLibrary("lodepng");
        } else {
            image = Image.fromImageData(image);
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

    function initImageLoader() {
        const imageLoaderConfig = {
            help,

            options: {
                [showTimesOption]: _ => (showTimes = true)
            },
            requireImage: true,

            decodeLibrary: "lodepng",
            loadDecodeLibrary
        };

        ({ parseArgs: _parseArgs, loadImage: _loadImage } = ModuleLoader.loadModuleFromTag(tags.ImageLoader, {
            scope: imageLoaderConfig,
            isolateGlobals: false
        }));
    }

    function loadCanvasKit() {
        loadLibrary("canvaskit");

        Benchmark.restartTiming("load_libraries");

        const CanvasKitUtil = ModuleLoader.loadModuleFromTag(tags.CanvasKitUtil);
        Patches.patchGlobalContext({ CanvasKitUtil });

        Benchmark.stopTiming("load_libraries");
    }

    function loadDecodeLibrary(library) {
        switch (library) {
            case "canvaskit":
                return loadCanvasKit();
            case "lodepng":
                return loadLibrary("lodepng");
        }
    }

    function loadCycdraw() {
        Benchmark.restartTiming("load_libraries");

        Benchmark.startTiming("load_cycdraw");
        const cycdraw = ModuleLoader.loadModuleFromTag(tags.Cycdraw);
        Benchmark.stopTiming("load_cycdraw");

        Patches.patchGlobalContext(cycdraw);

        Benchmark.stopTiming("load_libraries");

        bgColor = new Color(...bgColor);
    }

    function loadGifEncoder() {
        if (typeof globalThis.gifenc !== "undefined") {
            return;
        }

        Benchmark.restartTiming("load_libraries");

        Benchmark.startTiming("load_gifenc");
        const gifenc = ModuleLoader.loadModuleFromTag(tags.GifEncoder);
        Benchmark.stopTiming("load_gifenc");

        Patches.patchGlobalContext({ gifenc });

        Benchmark.stopTiming("load_libraries");
    }

    function loadTableGen() {
        ModuleLoader.loadModuleFromTag(tags.Table);

        Benchmark.deleteLastCountTime("tag_fetch");
        Benchmark.deleteLastCountTime("module_load");
    }

    // calc dimensions
    function calcHeaderHeight(frame) {
        frame.clip(0, 0, sliceWidth, height);

        const { top } = frame.findTrim({
            treshold: backgroundTreshold,
            background: bgColor
        });

        return top + 1;
    }

    // uncaption
    function readCurrentFrame() {
        let frame = image.makeImageAtCurrentFrame();
        frame = Image.fromCanvaskitImage(frame, true);

        return [frame, image.currentFrameDuration()];
    }

    function uncaptionFrame(frame, outImage, headerHeight) {
        outImage.blit(0, 0, frame, 0, headerHeight);
    }

    function addFrameGif(gif, outImage, headerHeight, newHeight, options = {}) {
        const frameInd = options.frame ?? 0;

        const [frame, delay] = readCurrentFrame();

        uncaptionFrame(frame, outImage, headerHeight);

        const palette = gifenc.quantize(outImage.pixels, 256),
            index = gifenc.applyPalette(outImage.pixels, palette);

        gif.writeFrame(index, width, newHeight, {
            palette,
            delay
        });
    }

    function uncaptionMain() {
        Benchmark.startTiming("uncaption_total");

        const headerHeight = (() => {
            Benchmark.startTiming("calc_dimensions");

            const frame = isGif ? readCurrentFrame()[0] : image.copy(),
                headerHeight = calcHeaderHeight(frame);

            Benchmark.stopTiming("calc_dimensions");
            return headerHeight;
        })();

        const newHeight = height - headerHeight;

        if (LoaderUtils.approxEquals(newHeight, height, identicalTreshold)) {
            Benchmark.stopTiming("uncaption_total");
            return;
        }

        output = (() => {
            Benchmark.startTiming("draw_image");

            if (isGif) {
                const outImage = new Image(width, newHeight);

                const gif = gifenc.GIFEncoder(),
                    frameCount = image.getFrameCount();

                for (let frame = 0; frame < frameCount; frame++) {
                    addFrameGif(gif, outImage, headerHeight, newHeight, {
                        frame
                    });

                    image.decodeNextFrame();
                }

                gif.finish();
                output = gif;
            } else {
                const outImage = new Image(width, newHeight);
                uncaptionFrame(image, outImage, headerHeight);

                output = outImage;
            }

            Benchmark.stopTiming("draw_image");

            image = undefined;
            return output;
        })();

        Benchmark.stopTiming("uncaption_total");
    }

    function sendOutput() {
        if (output === null || typeof output === "undefined") {
            exit(msg.reply(targetMsg.fileUrl));
        }

        let imgBytes;

        if (isGif) {
            const gif = output;

            Benchmark.startTiming("encode_image");
            imgBytes = gif.bytes();
            Benchmark.stopTiming("encode_image");
        } else {
            const image = output;

            Benchmark.startTiming("encode_image");
            imgBytes = lodepng.encode(image);
            Benchmark.stopTiming("encode_image");
        }

        output = undefined;

        if (enableDebugger) debugger;

        let out;
        if (showTimes) {
            loadTableGen();

            const table = Benchmark.getTable("heavy", 1, "load_total", "load_image", "uncaption_total", "encode_image");
            out = LoaderUtils.codeBlock(table);
        }

        exit(
            msg.reply(out, {
                file: {
                    name: `image.${isGif ? "gif" : "png"}`,
                    data: imgBytes
                }
            })
        );
    }

    return () => {
        initLoader();
        parseArgs();
        loadCycdraw();

        if (enableDebugger) debugger;

        loadImage();

        uncaptionMain();
        sendOutput();
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
