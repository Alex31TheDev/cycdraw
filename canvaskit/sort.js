// config
const width = 400,
    height = 300,
    defaultArraySize = 100,
    enableDebugger = false;

const tags = {
    Table: "ck_table",
    GifEncoder: "ck_gifenc"
};

// enums
const Stages = Object.freeze({
    preview: 0,
    shuffle: 1,
    pauseShuffled: 2,
    sort: 3,
    pauseSorted: 4,
    sweep: 5
});

const Styles = Object.freeze({
    basic: "basic",
    rainbow: "rainbow",
    lines: "lines",
    points: "points",
    pyramid: "pyramid",
    circle: "circle",
    iso: "iso"
});

// util
const Util = Object.freeze({
    camelToWords: str => {
        return str.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    },
    wordsToCamel: str => {
        return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
            if (+match === 0) return "";
            return index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
    }
});

// errors
class ExitError extends Error {}
globalThis.ExitError ??= ExitError;

// sorts
const sorts = initSorts();

const sortConfigs = {
    selection: { nthMult: 1, sortDelayMult: 1 },
    bubble: { nthMult: 2.5, sortDelayMult: 1 },
    insertion: { nthMult: 2, sortDelayMult: 4 / 3 },
    quick: { nthMult: 0.5, sortDelayMult: 1 },
    heap: { nthMult: 1, sortDelayMult: 1 },
    merge: { nthMult: 1.5, sortDelayMult: 4 / 3 },
    mergeInPlace: { nthMult: 1, sortDelayMult: 1 },
    radixLsdInPlace: { nthMult: 1, sortDelayMult: 1 },
    gravity: { nthMult: 1, sortDelayMult: 1 },
    shell: { nthMult: 1, sortDelayMult: 1 },
    bitonic: { nthMult: 1, sortDelayMult: 1.5 },
    comb: { nthMult: 1, sortDelayMult: 1 },
    grailsort: { nthMult: 1, sortDelayMult: 2 }
};

const styleConfigs = {
    [Styles.basic]: { sizeMult: 1, delayMult: 1 },
    [Styles.rainbow]: { sizeMult: 1, delayMult: 1 },
    [Styles.lines]: { sizeMult: 1, delayMult: 1 },
    [Styles.points]: { sizeMult: 1, delayMult: 1 },
    [Styles.pyramid]: { sizeMult: 1, delayMult: 1 },
    [Styles.circle]: { sizeMult: 0.5, delayMult: 1.5 },
    [Styles.iso]: { size: 40, delayMult: 3 }
};

// help
const helpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "--usage", "-u"],
    showTimesOption = "--show-times",
    sizeOption = "--size";

const sortNames = Object.keys(sorts).map(Util.camelToWords),
    styleList = Object.values(Styles);

const help = `Usage: \`%t ${tag.name} [--show-times] [--size <number>] sort [style = basic]\`
Creates gifs of sorting algorithms.

- Sorts: **${sortNames.join("**, **")}**
- Styles: **${styleList.join("**, **")}**`,
    usage = `See \`%t ${tag.name} help\` for usage.`;

// renderer
class Renderer {
    constructor(options) {
        this.width = options.width;
        this.height = options.height;
        this.arraySize = options.arraySize;
        this.style = options.style;

        this.stretchX = this.width / this.arraySize;
        this.stretchY = this.height / this.arraySize;
        this.angle = (2 * Math.PI) / this.arraySize;

        this.radius = (this.height - 30) / 2;
        this.center_x = Math.floor(this.width / 2);
        this.center_y = Math.floor(this.height / 2);

        this.gif = gifenc.GIFEncoder();
        this.img = new Image(this.width, this.height);

        const isRainbow = this.style === Styles.rainbow || this.style === Styles.circle || this.style === Styles.iso;

        if (isRainbow) {
            this.paletteColors = this.generateRainbow(56);
        } else {
            this.paletteColors = [];
        }

        if (this.style === Styles.iso) {
            this.initIsoConfig();
        } else {
            this.usedColors = [Colors.black, Colors.white, Colors.red, ...this.paletteColors];
        }

        this.palette = this.createPalette();

        this.largeDigitFont = new Font(f_1, 1, {
            postProc: glyph => glyph.scale(2)
        });

        if (this.style === Styles.circle) {
            this.circlePoints = Array.from({ length: this.arraySize }, (_, i) => this.calcCirclePoints(i));
        }

        this.initDrawStrategies();
    }

    generateRainbow(num) {
        const baseColors = [
            new Color(255, 0, 0),
            new Color(255, 127, 0),
            new Color(255, 255, 0),
            new Color(0, 255, 0),
            new Color(0, 0, 255),
            new Color(75, 0, 130),
            new Color(238, 130, 238)
        ];

        return this.interpolateColors(baseColors, num);
    }

    interpolateColors(baseColors, num) {
        const colors = [],
            numIntervals = baseColors.length - 1;

        for (let i = 0; i < num; i++) {
            const t = i / (num - 1);
            const intervalIndex = Math.floor(t * numIntervals),
                intervalProgress = t * numIntervals - intervalIndex;

            const c1 = baseColors[intervalIndex],
                c2 = baseColors[Math.min(intervalIndex + 1, numIntervals)];

            const r = Math.round(c1.r + (c2.r - c1.r) * intervalProgress),
                g = Math.round(c1.g + (c2.g - c1.g) * intervalProgress),
                b = Math.round(c1.b + (c2.b - c1.b) * intervalProgress);

            colors.push(new Color(r, g, b));
        }

        return colors;
    }

    initIsoConfig() {
        const maxWxFromWidth = 320 / (this.arraySize + 1);
        const maxWxFromHeight = 240 / (this.arraySize + 1);
        this.isoWx = Math.min(maxWxFromWidth, maxWxFromHeight, 8);
        this.isoWy = this.isoWx / 2;
        const stepX = this.isoWx;
        const stepY = this.isoWy;

        const totalSpanX = (this.arraySize - 1) * stepX;
        const totalSpanY = (this.arraySize - 1) * stepY;

        const maxHeight = Math.min(130, Math.max(30, 260 - totalSpanY - 2 * this.isoWy));
        const heightScale = maxHeight / this.arraySize;
        this.isoHeights = Array.from({ length: this.arraySize + 1 }, (_, val) => val * heightScale);

        const shadeColor = (clr, factor) =>
            new Color(Math.round(clr.r * factor), Math.round(clr.g * factor), Math.round(clr.b * factor));

        this.isoColors = Array.from({ length: this.arraySize + 1 }, (_, val) => {
            const baseColor = this.getPaletteColor(val || 1);
            return {
                top: baseColor,
                left: shadeColor(baseColor, 0.8),
                right: shadeColor(baseColor, 0.6)
            };
        });

        this.isoMarkedShades = {
            top: new Color(255, 90, 90),
            left: new Color(210, 40, 40),
            right: new Color(150, 20, 20)
        };

        const originX = (this.width - totalSpanX) / 2;
        const originY = (this.height + totalSpanY + maxHeight) / 2;

        this.isoBases = Array.from({ length: this.arraySize }, (_, i) => ({
            bx: originX + i * stepX,
            by: originY - i * stepY
        }));

        this.usedColors = [
            Colors.black,
            Colors.white,
            this.isoMarkedShades.top,
            this.isoMarkedShades.left,
            this.isoMarkedShades.right
        ];

        for (const clr of this.paletteColors) {
            this.usedColors.push(clr, shadeColor(clr, 0.8), shadeColor(clr, 0.6));
        }
    }

    createPalette() {
        const colorsImg = new Image(this.usedColors.length, 1);
        this.usedColors.forEach((color, i) => colorsImg.setPixel(i, 0, color));
        return gifenc.quantize(colorsImg.pixels, this.usedColors.length);
    }

    getPaletteColor(val) {
        if (this.arraySize <= 1) return this.paletteColors[0] ?? Colors.white;
        const ratio = Math.max(0, Math.min(1, (val - 1) / (this.arraySize - 1)));
        const idx = Math.round(ratio * (this.paletteColors.length - 1));
        return this.paletteColors[idx];
    }

    calcCirclePoints(i) {
        const p2_x = Math.ceil(Math.cos(i * this.angle) * this.radius) + this.center_x,
            p2_y = Math.ceil(Math.sin(i * this.angle) * this.radius) + this.center_y,
            p3_x = Math.ceil(Math.cos((i + 1) * this.angle) * this.radius) + this.center_x,
            p3_y = Math.ceil(Math.sin((i + 1) * this.angle) * this.radius) + this.center_y;

        return [p2_x, p2_y, p3_x, p3_y];
    }

    drawBar(i, val, color) {
        const x1 = i * this.stretchX,
            y1 = this.height - val * this.stretchY,
            x2 = (i + 1) * this.stretchX - 1;
        this.img.fill(x1, y1, x2, this.height, color);
    }

    drawScatterPoint(i, val, color, frame = false) {
        const x = i * this.stretchX + this.stretchX / 2,
            y = this.height - val * this.stretchY + this.stretchY / 2,
            r = this.stretchX / 2;

        if (frame) this.img.drawFrameRadius(x, y, r + 2, color);
        else this.img.fillRadius(x, y, r, color);
    }

    drawLineSegment(i, val, lastVal, color, double = false) {
        const x1 = i * this.stretchX,
            y1 = this.height - lastVal * this.stretchY,
            x2 = (i + 1) * this.stretchX - 1,
            y2 = this.height - val * this.stretchY;

        if (double) this.img.drawLineThick(x1, y1, x2, y2, color, 3);
        else this.img.drawLine(x1, y1, x2, y2, color);
    }

    drawPyramidLine(i, val, color) {
        const x1 = (val * this.stretchX) / 2,
            y1 = this.height - i * this.stretchY,
            x2 = this.width - x1,
            y2 = this.height - (i + 1) * this.stretchY;

        this.img.fill(x1, y1, x2, y2, color);
    }

    drawCircleSlice(i, color) {
        const [p2_x, p2_y, p3_x, p3_y] = this.circlePoints?.[i] ?? this.calcCirclePoints(i);
        this.img.fillTriangle(this.center_x, this.center_y, p2_x, p2_y, p3_x, p3_y, color);
    }

    renderFrameIso(array, marked) {
        this.img.clear(Colors.black);
        const markedSet = new Set(marked),
            wx = Math.max(1, Math.round(this.isoWx)),
            wy = Math.max(1, Math.round(this.isoWy));

        for (let i = this.arraySize - 1; i >= 0; i--) {
            const val = array[i],
                base = this.isoBases[i],
                bx = Math.round(base.bx),
                by = Math.round(base.by),
                h = Math.round(this.isoHeights[val]),
                yTop = by - h;

            const colors = markedSet.has(i) ? this.isoMarkedShades : this.isoColors[val];
            this.img.fillTriangle(bx - wx, yTop, bx, yTop + wy, bx, by + wy, colors.left);
            this.img.fillTriangle(bx - wx, yTop, bx, by + wy, bx - wx, by, colors.left);
            this.img.fillTriangle(bx, yTop + wy, bx + wx, yTop, bx + wx, by, colors.right);
            this.img.fillTriangle(bx, yTop + wy, bx + wx, by, bx, by + wy, colors.right);
            this.img.fillTriangle(bx, yTop - wy, bx + wx, yTop, bx, yTop + wy, colors.top);
            this.img.fillTriangle(bx, yTop - wy, bx - wx, yTop, bx, yTop + wy, colors.top);
        }
    }

    renderFrameDefault(array, marked) {
        this.img.clear(Colors.black);
        let val,
            lastVal = 0,
            color;

        for (let i = 0; i < this.arraySize; i++) {
            val = array[i];
            color = this.getSegmentColor(val);
            this.drawDataPoint(i, val, lastVal, color);
            lastVal = val;
        }

        for (const i of marked) {
            val = array[i];
            lastVal = array[i - 1] ?? 0;
            this.drawMarkedPoint(i, val, lastVal);
        }
    }

    initDrawStrategies() {
        const hasPalette = this.style === Styles.rainbow || this.style === Styles.circle || this.style === Styles.iso;
        this.getSegmentColor = hasPalette ? val => this.getPaletteColor(val) : () => Colors.white;

        switch (this.style) {
            case Styles.basic:
            case Styles.rainbow:
                this.drawDataPoint = (i, val, lastVal, color) => this.drawBar(i, val, color);
                this.drawMarkedPoint = (i, val, lastVal) => this.drawBar(i, this.arraySize, Colors.red);
                this.renderFrame = (array, marked) => this.renderFrameDefault(array, marked);
                break;
            case Styles.points:
                this.drawDataPoint = (i, val, lastVal, color) => this.drawScatterPoint(i, val, color, false);
                this.drawMarkedPoint = (i, val, lastVal) => this.drawScatterPoint(i, val, Colors.red, true);
                this.renderFrame = (array, marked) => this.renderFrameDefault(array, marked);
                break;
            case Styles.lines:
                this.drawDataPoint = (i, val, lastVal, color) => this.drawLineSegment(i, val, lastVal, color, false);
                this.drawMarkedPoint = (i, val, lastVal) => this.drawLineSegment(i, val, lastVal, Colors.red, true);
                this.renderFrame = (array, marked) => this.renderFrameDefault(array, marked);
                break;
            case Styles.pyramid:
                this.drawDataPoint = (i, val, lastVal, color) => this.drawPyramidLine(i, val, color);
                this.drawMarkedPoint = (i, val, lastVal) => this.drawPyramidLine(i, 0, Colors.red);
                this.renderFrame = (array, marked) => this.renderFrameDefault(array, marked);
                break;
            case Styles.circle:
                this.drawDataPoint = (i, val, lastVal, color) => this.drawCircleSlice(i, color);
                this.drawMarkedPoint = (i, val, lastVal) => this.drawCircleSlice(i, Colors.red);
                this.renderFrame = (array, marked) => this.renderFrameDefault(array, marked);
                break;
            case Styles.iso:
                this.renderFrame = (array, marked) => this.renderFrameIso(array, marked);
                break;
        }
    }

    drawStageCounter(stage) {
        const str = stage.toString(),
            [str_w, str_h] = this.largeDigitFont.measureString(str);
        this.img.fill(0, 0, str_w + 3, str_h + 3, Colors.black);
        this.img.drawString(2, 2, str, this.largeDigitFont);
    }

    drawFrame(array, marked, stage) {
        this.renderFrame(array, marked);
        if (enableDebugger) this.drawStageCounter(stage);
    }

    writeFrame(array, marked, stage, delay) {
        this.drawFrame(array, marked, stage);
        const index = gifenc.applyPalette(this.img.pixels, this.palette);
        this.gif.writeFrame(index, this.width, this.height, {
            palette: this.palette,
            delay: Math.floor(delay)
        });
    }

    finish() {
        this.gif.finish();
    }

    bytes() {
        return this.gif.bytes();
    }
}

// visualizer
class Visualizer {
    constructor(renderer, options = {}) {
        this.renderer = renderer;
        this.arraySize = renderer.arraySize;
        this.array = Array.from({ length: this.arraySize }, (_, i) => i + 1);
        this.marked = [];

        this.frame = 0;
        this.frameCount = 1;
        this.stage = Stages.preview;

        this.delay = 0;
        this.delayMult = options.delayMult ?? 1;
        this.sortDelayMult = options.sortDelayMult ?? 1;
        this.nth = 1;
        this.nthMult = options.nthMult ?? 1;
    }

    swap(a, b) {
        const tmp = this.array[a];
        this.array[a] = this.array[b];
        this.array[b] = tmp;
        this.marked.push(a, b);
    }

    updateState(refresh) {
        if (refresh) this.marked.length = 0;
        this.frame++;
    }

    writeFrame(refresh = true) {
        if (this.frame % this.nth !== 0) {
            this.updateState(refresh);
            return;
        }

        this.renderer.writeFrame(this.array, this.marked, this.stage, Math.floor(this.delay));
        this.updateState(refresh);
        this.frameCount++;
    }

    preview() {
        this.delay = 500;
        this.nth = 1;
        this.writeFrame();
        this.stage++;
    }

    shuffle() {
        this.delay = 50 * this.delayMult;
        this.nth = 1;
        for (let i = 0; i < this.array.length; i++) {
            const rand = Math.floor(Math.random() * (this.array.length - 1));
            this.swap(i, rand);
            if (i % 4 === 0) this.writeFrame();
        }
        this.marked.length = 0;
        this.stage++;
    }

    pauseShuffled() {
        this.delay = 500;
        this.nth = 1;
        this.writeFrame();
        this.stage++;
    }

    runSort(sortFunc) {
        this.delay = 30 * this.delayMult * this.sortDelayMult;
        this.nth = 2 * this.nthMult;
        sortFunc(this);
        this.stage++;
    }

    pauseSorted() {
        this.nth = 1;
        this.delay = 500;
        this.writeFrame();
        this.stage++;
    }

    sweep() {
        this.delay = 35 * this.delayMult;
        this.nth = 2;
        for (let i = 0; i < this.array.length; i++) {
            if (this.array[i] !== i + 1) return false;
            this.marked.push(i);
            this.writeFrame();
        }
        this.stage++;
        return true;
    }
}

// main
const main = (() => {
    function parseArgs() {
        let input = tag.args ?? "";

        let split = input.split(" ");
        let showTimes = false;
        let customSize;

        for (let i = 0; i < split.length; i++) {
            if (helpOptions.includes(split[i])) {
                const out = `:information_source: ${help}`;
                throw new ExitError(out);
            }
        }

        const remaining = [];
        for (let i = 0; i < split.length; i++) {
            const token = split[i];
            if (!token) continue;

            if (token === showTimesOption) {
                showTimes = true;
            } else if (token === sizeOption || token.startsWith(sizeOption + "=")) {
                let sizeStr;
                if (token.startsWith(sizeOption + "=")) {
                    sizeStr = token.slice(sizeOption.length + 1);
                } else {
                    if (i + 1 >= split.length || split[i + 1].trim() === "") {
                        const out = `:warning: No size provided.\n${usage}`;
                        throw new ExitError(out);
                    }
                    sizeStr = split[++i];
                }
                const parsed = Number(sizeStr);
                if (!Number.isInteger(parsed) || parsed < 2) {
                    const out = `:warning: Invalid size.\n${usage}`;
                    throw new ExitError(out);
                }
                customSize = parsed;
            } else {
                remaining.push(token);
            }
        }

        if (remaining.length < 1) {
            const out = `:warning: No input provided.\n${usage}`;
            throw new ExitError(out);
        } else {
            split = remaining.map(s => s.toLowerCase());
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
            const out = `:warning: Invalid sort.\n${usage}`;
            throw new ExitError(out);
        } else {
            sort = Util.wordsToCamel(sort);
        }

        style ||= Styles.basic;

        if (!styleList.includes(style)) {
            const out = `:warning: Invalid style.\n${usage}`;
            throw new ExitError(out);
        }

        return { sort, style, showTimes, size: customSize };
    }

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

        loadLibrary("gifenc");
        loadLibrary("cycdraw");

        Benchmark.stopTiming("load_libraries");
    }

    function loadTableGen() {
        ModuleLoader.loadModuleFromTag(tags.Table);

        Benchmark.deleteLastCountTime("tag_fetch");
        Benchmark.deleteLastCountTime("module_load");
    }

    function runSession(sortName, styleName, customSize) {
        const styleConfig = styleConfigs[styleName] ?? { sizeMult: 1, delayMult: 1 },
            arraySize = customSize ?? styleConfig.size ?? Math.floor(defaultArraySize * (styleConfig.sizeMult ?? 1));

        const sortConfig = sortConfigs[sortName] ?? { nthMult: 1, sortDelayMult: 1 };

        const renderer = new Renderer({
            width,
            height,
            arraySize,
            style: styleName
        });

        const viz = new Visualizer(renderer, {
            delayMult: styleConfig.delayMult,
            sortDelayMult: sortConfig.sortDelayMult,
            nthMult: sortConfig.nthMult
        });

        Benchmark.startTiming("draw_total");

        viz.preview();

        Benchmark.startTiming("shuffle");
        viz.shuffle();
        Benchmark.stopTiming("shuffle");

        viz.pauseShuffled();

        Benchmark.startTiming("sort");
        viz.runSort(sorts[sortName]);
        Benchmark.stopTiming("sort");

        viz.pauseSorted();

        Benchmark.startTiming("sweep");
        viz.sweep();
        Benchmark.stopTiming("sweep");

        renderer.finish();
        Benchmark.stopTiming("draw_total");

        return [renderer, viz];
    }

    function sendOutput(renderer, viz, sortName, showTimes) {
        Benchmark.startTiming("encode_image");
        const gifBytes = renderer.bytes();
        Benchmark.stopTiming("encode_image");

        let out;
        if (showTimes) {
            loadTableGen();

            let table = Benchmark.getTable("heavy", 1, "load_total", "load_libraries", "draw_total", "encode_image");
            table += `\nFrame count: ${viz.frameCount}`;

            out = LoaderUtils.codeBlock(table);
        }

        try {
            msg.reply(out, {
                file: {
                    name: "sort.gif",
                    data: gifBytes
                }
            });
        } catch (err) {
            if (err?.name === "ExitError" || err instanceof (globalThis.ExitError ?? ExitError)) return;
            throw err;
        }
    }

    return () => {
        initLoader();
        const { sort, style, showTimes, size } = parseArgs();
        loadGifEncoder();

        const [renderer, viz] = runSession(sort, style, size);
        sendOutput(renderer, viz, sort, showTimes);
    };
})();

try {
    // run main
    main();
} catch (err) {
    // output
    if (err?.name === "ExitError" || err instanceof (globalThis.ExitError ?? ExitError)) err.message;
    else throw err;
}
