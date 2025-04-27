"use strict";
/* globals gifenc:readonly, Image:readonly, Color:readonly, Colors:readonly, Font:readonly, f_1:readonly */

// config
const width = 400,
    height = 300;

let sort,
    style,
    arraySize = 100;

let showTimes = false;

// sources
const urls = {};

const tags = {
    Table: "ck_table",

    Cycdraw: "ck_cycdraw",
    GifEncoder: "ck_gifenc"
};

// util
const Util = Object.freeze({
    camelToWords: str => {
        return str.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    },

    wordsToCamel: str => {
        str = str.toLowerCase();

        return str
            .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
                index === 0 ? match.toLowerCase() : match.toUpperCase()
            )
            .replace(/\s+/g, "");
    }
});

// errors
globalThis.ExitError = class extends Error {};

// globals

// array
let array, marked;
let stretchX, stretchY, angle;

// gif
let gif, img;

let frame = 0,
    frameCount = 1,
    stage = 0;

let delay,
    delayMult = 1,
    sortDelayMult = 1;

const timeMult = 0.15;

// drawing
const radius = (height - 30) / 2;

const p1_x = Math.floor(width / 2),
    p1_y = Math.floor(height / 2);

let usedColors, rainbowColors, palette;
let LargeDigitFont;

let nth,
    nthMult = 1;

let writeFrame;

// sorts
const swap = (a, b) => {
    const tmp = array[a];
    array[a] = array[b];
    array[b] = tmp;

    marked.push(a, b);
};

const stages = (() => {
    function shuffle() {
        for (let i = 0; i < array.length; i++) {
            const rand = Math.floor(Math.random() * (array.length - 1));
            swap(i, rand);

            if (i % 4 === 0) {
                writeFrame();
            }
        }

        marked.length = 0;
    }

    function sweep() {
        for (let i = 0; i < array.length; i++) {
            if (array[i] !== i + 1) {
                return false;
            }

            marked.push(i);
            writeFrame();
        }

        return true;
    }

    return {
        shuffle,
        sweep
    };
})();

// eslint-disable-next-line
const sorts = initSorts();

// help
const helpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "--usage", "-u"],
    showTimesOption = "--show-times";

const sortNames = Object.keys(sorts).map(Util.camelToWords),
    styleList = ["basic", "rainbow", "lines", "points", "pyramid", "circle"];

const help = `Usage: \`%t ${tag.name} [--show-times] sort [style = basic]\`
Creates gifs of sorting algorithms.

- Sorts: **${sortNames.join("**, **")}**
- Styles: **${styleList.join("**, **")}**`,
    usage = `See \`%t ${tag.name} help\` for usage.`;

// main
const main = (() => {
    // parse args
    function parseArgs() {
        [sort, style] = (() => {
            let input = tag.args ?? "";

            let split = input.split(" "),
                option = split[0];

            checkArgs: if (split.length > 0) {
                if (helpOptions.includes(option)) {
                    const out = `:information_source: ${help}`;
                    throw new ExitError(out);
                }

                let removed = 1;

                switch (option) {
                    case showTimesOption:
                        showTimes = true;
                        break;
                    default:
                        break checkArgs;
                }

                for (let i = 0; i < removed; i++) split.shift();
                input = split.join(" ");
            }

            if (input.length < 1) {
                const out = ":warning: No input provided.\n" + usage;
                throw new ExitError(out);
            } else {
                input = input.toLowerCase();
                split = input.split(" ");
            }

            let sort, style;

            for (let i = split.length; i > 0; i--) {
                const name = split.slice(0, i).join(" ");

                if (sortNames.includes(name)) {
                    sort = name;
                    style = split.slice(i).join(" ");

                    break;
                }
            }

            if (typeof sort === "undefined") {
                const out = ":warning: Invalid sort.\n" + usage;
                throw new ExitError(out);
            } else {
                sort = Util.wordsToCamel(sort);
            }

            style ||= "basic";
            if (!styleList.includes(style)) {
                const out = ":warning: Invalid style.\n" + usage;
                throw new ExitError(out);
            }

            return [sort, style];
        })();
    }

    // load libraries
    function initLoader() {
        delete globalThis.ExitError;

        util.loadLibrary = "none";

        if (util.env) {
            eval(util.fetchTag("canvaskitloader").body);
        } else {
            util.executeTag("canvaskitloader");
        }

        ModuleLoader.useDefault("tagOwner");
        ModuleLoader.enableCache = false;
    }

    function loadGifEncoder() {
        Benchmark.startTiming("load_libraries");

        Benchmark.startTiming("load_gifenc");
        const gifenc = ModuleLoader.loadModuleFromTag(tags.GifEncoder);
        Benchmark.stopTiming("load_gifenc");

        Benchmark.startTiming("load_cycdraw");
        const cycdraw = ModuleLoader.loadModuleFromTag(tags.Cycdraw);
        Benchmark.stopTiming("load_cycdraw");

        Patches.patchGlobalContext({ ...cycdraw, gifenc });

        Benchmark.stopTiming("load_libraries");
    }

    function loadTableGen() {
        ModuleLoader.loadModuleFromTag(tags.Table);

        Benchmark.deleteLastCountTime("tag_fetch");
        Benchmark.deleteLastCountTime("module_load");
    }

    // draw init
    function initGif() {
        gif = gifenc.GIFEncoder();
        img = new Image(width, height);

        usedColors = [Colors.black, Colors.white, Colors.red];

        LargeDigitFont = new Font(f_1, 1, {
            postProc: glyph => glyph.scale(2)
        });
    }

    function interpolateColor(color1, color2, t) {
        const r = Math.round(color1.r + (color2.r - color1.r) * t),
            g = Math.round(color1.g + (color2.g - color1.g) * t),
            b = Math.round(color1.b + (color2.b - color1.b) * t);

        return new Color(r, g, b);
    }

    function generateRainbow(num) {
        const rainbowColors = [
            new Color(255, 0, 0),
            new Color(255, 127, 0),
            new Color(255, 255, 0),
            new Color(0, 255, 0),
            new Color(0, 0, 255),
            new Color(75, 0, 130),
            new Color(238, 130, 238)
        ];

        const colors = [],
            numIntervals = rainbowColors.length - 1;

        for (let i = 0; i < num; i++) {
            const t = i / (num - 1);

            const intervalIndex = Math.floor(t * numIntervals),
                intervalProgress = t * numIntervals - intervalIndex;

            const color1 = rainbowColors[intervalIndex],
                color2 = rainbowColors[Math.min(intervalIndex + 1, numIntervals)];

            const interpolatedColor = interpolateColor(color1, color2, intervalProgress);
            colors.push(interpolatedColor);
        }

        return colors;
    }

    function initRainbow() {
        rainbowColors = (() => {
            switch (style) {
                case "rainbow":
                case "circle":
                    const colors = generateRainbow(56);
                    usedColors.push(...colors);

                    return colors;
                default:
                    return [];
            }
        })();
    }

    function initPalette() {
        palette = (() => {
            const colorsImg = new Image(usedColors.length, 1);
            usedColors.forEach((color, i) => colorsImg.setPixel(i, 0, color));

            return gifenc.quantize(colorsImg.pixels, usedColors.length);
        })();
    }

    function drawInit() {
        initGif();
        initRainbow();
        initPalette();

        writeFrame = _writeFrame;
    }

    // colors
    function getRainbowColor(val) {
        const ind = Math.round(((val - 1) / (arraySize - 1)) * (rainbowColors.length - 1));
        return rainbowColors[ind];
    }

    function getSegmentColor(i, val) {
        switch (style) {
            case "basic":
            case "points":
            case "lines":
            case "pyramid":
                return Colors.white;

            case "rainbow":
            case "circle":
                return getRainbowColor(val);
        }
    }

    // draw
    function drawBar(i, val, color) {
        const x1 = i * stretchX,
            y1 = height - val * stretchY,
            x2 = (i + 1) * stretchX - 1;

        img.fill(x1, y1, x2, height, color);
    }

    function drawScatterPoint(i, val, color, frame = false) {
        const x = i * stretchX + stretchX / 2,
            y = height - val * stretchY + stretchY / 2,
            r = stretchX / 2;

        if (frame) {
            img.drawFrameRadius(x, y, r + 2, color);
        } else {
            img.fillRadius(x, y, r, color);
        }
    }

    function drawLineSegment(i, val, lastVal, color, double = false) {
        const x1 = i * stretchX,
            y1 = height - lastVal * stretchY,
            x2 = (i + 1) * stretchX - 1,
            y2 = height - val * stretchY;

        if (double) {
            img.drawLineThick(x1, y1, x2, y2, color, 3);
        } else {
            img.drawLine(x1, y1, x2, y2, color);
        }
    }

    function drawPyramidLine(i, val, color) {
        const x1 = (val * stretchX) / 2,
            y1 = height - i * stretchY,
            x2 = width - x1,
            y2 = height - (i + 1) * stretchY;

        img.fill(x1, y1, x2, y2, color);
    }

    function calcCirclePoints(i) {
        const p2_x = Math.ceil(Math.cos(i * angle) * radius) + p1_x,
            p2_y = Math.ceil(Math.sin(i * angle) * radius) + p1_y,
            p3_x = Math.ceil(Math.cos((i + 1) * angle) * radius) + p1_x,
            p3_y = Math.ceil(Math.sin((i + 1) * angle) * radius) + p1_y;

        return [p2_x, p2_y, p3_x, p3_y];
    }

    function drawCircleSlice(i, color) {
        const [p2_x, p2_y, p3_x, p3_y] = calcCirclePoints(i);

        img.fillTriangle(p1_x, p1_y, p2_x, p2_y, p3_x, p3_y, color);
    }

    function drawDataPoint(i, val, lastVal, color) {
        switch (style) {
            case "basic":
            case "rainbow":
                drawBar(i, val, color);
                break;

            case "points":
                drawScatterPoint(i, val, color);
                break;

            case "lines":
                drawLineSegment(i, val, lastVal, color);
                break;

            case "pyramid":
                drawPyramidLine(i, val, color);
                break;

            case "circle":
                drawCircleSlice(i, color);
                break;
        }
    }

    function drawMarkedPoint(i, val, lastVal) {
        const color = Colors.red;

        switch (style) {
            case "basic":
            case "rainbow":
                drawBar(i, arraySize, color);
                break;

            case "points":
                drawScatterPoint(i, val, color, true);
                break;

            case "lines":
                drawLineSegment(i, val, lastVal, color, true);
                break;

            case "pyramid":
                drawPyramidLine(i, 0, color);
                break;

            case "circle":
                drawCircleSlice(i, color);
                break;
        }
    }

    function drawStageCounter() {
        const str = stage.toString(),
            [str_w, str_h] = LargeDigitFont.measureString(str);

        img.fill(0, 0, str_w + 3, str_h + 3, Colors.black);
        img.drawString(2, 2, str, LargeDigitFont);
    }

    function drawFrame() {
        const time = timeMult * frame;
        img.clear(Colors.black);

        let val,
            lastVal = 0,
            color;

        for (let i = 0; i < arraySize; i++) {
            val = array[i];

            color = getSegmentColor(i, val);
            drawDataPoint(i, val, lastVal, color);

            lastVal = val;
        }

        for (const i of marked) {
            val = array[i];
            lastVal = array[i - 1] ?? 0;

            drawMarkedPoint(i, val, lastVal);
        }

        if (enableDebugger) drawStageCounter();
    }

    function setVars(refresh) {
        if (refresh) {
            marked.length = 0;
        }

        frame++;
    }

    function _writeFrame(refresh = true) {
        if (frame % nth !== 0) {
            setVars(refresh);
            return;
        }

        drawFrame();

        const index = gifenc.applyPalette(img.pixels, palette);

        gif.writeFrame(index, width, height, {
            palette,
            delay: Math.floor(delay)
        });

        setVars(refresh);
        frameCount++;
    }

    // array
    const arrayBoundsNames = ["start", "end", "low", "high"];

    function bindSorts() {
        for (const [key, func] of Object.entries(sorts)) {
            const pos = LoaderUtils.getArgumentPositions(func, arrayBoundsNames);

            if (pos[0] === 0 && pos[1] === 1) {
                sorts[key] = func.bind(null, 0, arraySize - 1);
            }
        }
    }

    function createArray() {
        switch (sort) {
            case "insertion":
                sortDelayMult = 4 / 3;
                nthMult = 2;
                break;
            case "bubble":
                nthMult = 2.5;
                break;
            case "quick":
                nthMult = 0.5;
                break;
            case "merge":
                sortDelayMult = 4 / 3;
                nthMult = 1.5;
                break;
        }

        if (style === "circle") {
            arraySize /= 2;
            delayMult = 1.5;
        }

        array = Array.from(
            {
                length: arraySize
            },
            (_, i) => i + 1
        );

        marked = [];

        stretchX = width / arraySize;
        stretchY = height / arraySize;
        angle = (2 * Math.PI) / arraySize;

        bindSorts();
    }

    // sort
    function sortMain() {
        Benchmark.startTiming("draw_total");

        delay = 500;
        nth = 1;
        writeFrame();
        stage++;

        delay = 50 * delayMult;
        nth = 1;
        Benchmark.startTiming("shuffle");
        stages.shuffle();
        Benchmark.stopTiming("shuffle");
        stage++;

        delay = 500;
        nth = 1;
        writeFrame();
        stage++;

        delay = 30 * delayMult * sortDelayMult;
        nth = 2 * nthMult;
        Benchmark.startTiming("sort");
        sorts[sort]();
        Benchmark.stopTiming("sort");
        stage++;

        nth = 1;
        delay = 500;
        writeFrame();
        stage++;

        delay = 35 * delayMult;
        nth = 2;
        Benchmark.startTiming("sweep");
        stages.sweep();
        Benchmark.stopTiming("sweep");
        stage++;

        gif.finish();
        Benchmark.stopTiming("draw_total");
    }

    function sendOutput() {
        Benchmark.startTiming("encode_image");
        const gifBytes = gif.bytes();
        Benchmark.stopTiming("encode_image");
        gif = undefined;

        let out;
        if (showTimes) {
            loadTableGen();

            let table = Benchmark.getTable("heavy", 1, "load_total", "load_libraries", "draw_total", "encode_image");
            table += `\nFrame count: ${frameCount}`;

            out = LoaderUtils.codeBlock(table);
        }

        exit(
            msg.reply(out, {
                file: {
                    name: "sort.gif",
                    data: gifBytes
                }
            })
        );
    }

    return () => {
        parseArgs();

        initLoader();
        loadGifEncoder();

        if (enableDebugger) debugger;

        createArray();
        drawInit();

        sortMain();
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
