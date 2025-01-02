"use strict";

// config
const width = 400,
    height = 300;

let sort,
    style = "basic",
    arraySize = 99;

let showTimes = false;

// sources
const urls = {};

const tags = {
    Table: "ck_table",

    Cycdraw: "ck_cycdraw",
    GifEncoder: "ck_gifenc"
};

// util
const Util = {
    swap: (array, a, b) => {
        const tmp = array[a];
        array[a] = array[b];
        array[b] = tmp;
    },

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
};

// errors
globalThis.ExitError = class extends Error {};

// globals

// array
let array, marked;
let stretchX, stretchY, angle;

// gif
let gif, img;

let frame = 0,
    stage = 0;

let delay,
    timeMult = 0.15;

// drawing
const radius = (height - 30) / 2;

const p1_x = Math.floor(width / 2),
    p1_y = Math.floor(height / 2);

let usedColors, rainbowColors, palette;
let LargeDigitFont;

let nth, writeFrame;

// sorts
const [stages, sorts] = (() => {
    // basic
    function swap(a, b) {
        Util.swap(array, a, b);
        marked.push(a, b);
    }

    function shuffle() {
        for (let i = 0; i < arraySize; i++) {
            const rand = Math.floor(Math.random() * (arraySize - 1));
            swap(i, rand);

            if (i % 4 === 0) {
                writeFrame();
            }
        }

        marked.length = 0;
    }

    function sweep() {
        for (let i = 0; i < arraySize; i++) {
            if (array[i] !== i + 1) {
                return false;
            }

            marked.push(i);
            writeFrame();
        }

        return true;
    }

    // selection
    function selectionSort() {
        for (let i = 0; i < arraySize; i++) {
            let min_idx = i;
            for (let j = i + 1; j < arraySize; j++) {
                if (array[min_idx] > array[j]) {
                    min_idx = j;

                    marked.push(j);
                    writeFrame();
                }
            }

            swap(i, min_idx);
            writeFrame();
        }
    }

    // bubble
    function bubbleSort() {
        let n = arraySize,
            swapped;

        do {
            swapped = false;

            for (let i = 0; i < n - 1; i++) {
                if (array[i] > array[i + 1]) {
                    swapped = true;

                    swap(i, i + 1);
                    writeFrame();
                }
            }

            n--;
        } while (swapped);

        return array;
    }

    // insertion
    function insertionSort() {
        for (let i = 1; i < arraySize; i++) {
            let j = i;

            while (j > 0 && array[j] < array[j - 1]) {
                swap(j, j - 1);
                writeFrame();

                j--;
            }
        }
    }

    // quick
    function partition(low, high) {
        let pivot = array[high],
            i = low - 1;

        for (let j = low; j < high; j++) {
            if (array[j] <= pivot) {
                i++;

                swap(i, j);
                writeFrame();
            }
        }

        swap(i + 1, high);
        writeFrame();

        return i + 1;
    }

    function quickSort(low, high) {
        if (low < high) {
            const pi = partition(low, high);

            quickSort(low, pi - 1);
            quickSort(pi + 1, high);
        }
    }

    // heap
    function heapify(n, i) {
        let largest = i;

        const l = 2 * i + 1,
            r = 2 * i + 2;

        if (l < n && array[i] < array[l]) {
            largest = l;
        }

        if (r < n && array[largest] < array[r]) {
            largest = r;
        }

        if (largest !== i) {
            swap(i, largest);
            writeFrame();

            heapify(n, largest);
        }
    }

    function heapSort() {
        let n = arraySize;

        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            heapify(n, i);
        }

        for (let i = n - 1; i > 0; i--) {
            swap(i, 0);
            writeFrame();

            heapify(i, 0);
        }
    }

    // merge
    function merge(leftStart, leftEnd, rightStart, rightEnd) {
        let temp = [];
        let i = leftStart,
            j = rightStart;

        while (i <= leftEnd && j <= rightEnd) {
            if (array[i] <= array[j]) {
                temp.push(array[i]);
                i++;
            } else {
                temp.push(array[j]);
                j++;
            }

            marked.push(i, j);
            writeFrame();
        }

        while (i <= leftEnd) {
            temp.push(array[i]);
            i++;

            marked.push(i);
            writeFrame();
        }

        while (j <= rightEnd) {
            temp.push(array[j]);
            j++;

            marked.push(j);
            writeFrame();
        }

        for (let k = 0; k < temp.length; k++) {
            array[leftStart + k] = temp[k];

            if (leftEnd - leftStart >= arraySize / 50) {
                marked.push(leftStart + k);
                writeFrame();
            }
        }
    }

    function mergeSort(start, end) {
        if (start >= end) {
            return;
        }

        const mid = Math.floor((start + end) / 2);

        mergeSort(start, mid);
        mergeSort(mid + 1, end);

        merge(start, mid, mid + 1, end);
    }

    // in-place merge
    function mergeInPlace(low, mid, high) {
        let left = low,
            right = mid + 1;

        while (left <= mid && right <= high) {
            if (array[left] <= array[right]) {
                left++;
            } else {
                let temp = array[right],
                    index = right;

                const oldNth = nth;
                nth *= 2;

                while (index > left) {
                    array[index] = array[index - 1];

                    marked.push(index - 1, index);
                    writeFrame();

                    index--;
                }

                array[left] = temp;

                marked.push(left, right);
                nth = oldNth;
                writeFrame();

                left++;
                mid++;
                right++;
            }
        }
    }

    function mergeSortInPlace(low, high) {
        if (low < high) {
            const mid = Math.floor((low + high) / 2);

            mergeSortInPlace(low, mid);
            mergeSortInPlace(mid + 1, high);

            mergeInPlace(low, mid, high);
        }
    }

    // in-place radix LSD
    function analyzePow(array, base) {
        let pow = 0;

        for (let i = 0; i < arraySize; i++) {
            const logValue = Math.log(array[i]) / Math.log(base);

            if (Math.floor(logValue) > pow) {
                pow = Math.floor(logValue);
            }

            marked.push(i);

            if (i % 2 === 0) {
                writeFrame();
            }
        }

        return pow;
    }

    function swapUpToNM(pos, to) {
        if (to - pos > 0) {
            for (let i = pos; i < to; i++) {
                swap(i, i + 1);
            }
        } else {
            for (let i = pos; i > to; i--) {
                swap(i, i - 1);
            }
        }

        marked.length = 2;
    }

    function getDigit(a, power, radix) {
        return Math.floor(a / Math.pow(radix, power)) % radix;
    }

    function inPlaceRadixLSDSort(radix) {
        const vRegs = Array(radix - 1),
            maxPower = analyzePow(array, radix);

        let pos = 0;

        for (let p = 0; p <= maxPower; p++) {
            for (let i = 0; i < vRegs.length; i++) {
                vRegs[i] = arraySize - 1;
            }

            pos = 0;

            for (let i = 0; i < arraySize; i++) {
                const digit = getDigit(array[pos], p, radix);

                if (digit === 0) {
                    pos++;

                    marked.push(pos);
                    writeFrame();
                } else {
                    swapUpToNM(pos, vRegs[digit - 1]);

                    marked.push(...vRegs);
                    writeFrame();

                    for (let j = digit - 1; j > 0; j--) {
                        vRegs[j - 1]--;
                    }
                }
            }
        }
    }

    // gravity
    function analyzeMax() {
        let max = -Infinity;

        for (let i = 0; i < arraySize; i++) {
            max = Math.max(array[i], max);

            marked.push(i);

            if (i % 2 === 0) {
                writeFrame();
            }
        }

        return max;
    }

    function gravitySort() {
        const max = analyzeMax(),
            abacus = Array.from({ length: arraySize }, () => Array(max).fill(0));

        const oldNth = nth;
        nth *= 10;

        for (let j = 0; j < arraySize; j++) {
            for (let k = 0; k < Math.floor(array[j]); k++) {
                abacus[j][max - k - 1] = 1;
            }
        }

        for (let l = 0; l < max; l++) {
            for (let m = 0; m < arraySize; m++) {
                if (abacus[m][l] === 1) {
                    let dropPos = m;

                    while (dropPos + 1 < arraySize && abacus[dropPos][l] === 1) {
                        dropPos++;
                    }

                    if (abacus[dropPos][l] === 0) {
                        abacus[m][l] = 0;
                        abacus[dropPos][l] = 1;
                    }
                }
            }

            for (let x = 0; x < arraySize; x++) {
                let count = 0;

                for (let y = 0; y < max; y++) {
                    count += abacus[x][y];
                }

                array[x] = count;

                marked.push(arraySize - l - 1);
                marked[0] = count;
                writeFrame();
            }
        }

        nth = oldNth;
    }

    return [
        {
            shuffle,
            sweep
        },

        {
            selection: selectionSort,
            bubble: bubbleSort,
            insertion: insertionSort,
            quick: quickSort.bind(undefined, 0, arraySize - 1),
            heap: heapSort,
            merge: mergeSort.bind(undefined, 0, arraySize - 1),
            mergeInPlace: mergeSortInPlace.bind(undefined, 0, arraySize - 1),
            inPlaceRadixLSD: inPlaceRadixLSDSort.bind(undefined, 3),
            gravity: gravitySort
        }
    ];
})();

// help
const helpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "-u"],
    showTimesOption = "--show-times";

const sortNames = Object.keys(sorts).map(Util.camelToWords),
    styleList = ["basic", "rainbow", "lines", "points", "pyramid", "circle"];

const help = `Usage: \`%t ${tag.name} [--show-times] sort [style = basic]\`
Animates the

Sorts: ${sortNames.join(", ")}
Styles: ${styleList.join(", ")}`,
    usage = `See \`%t ${tag.name} help\` for usage.`;

// main
const main = (() => {
    // parse args
    function parseArgs() {
        [sort, style] = (() => {
            let input = tag.args ?? "";

            const split = input.split(" "),
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
            }

            let sort, style;

            for (let i = split.length; i > 0; i--) {
                const name = split.slice(0, i).join(" ");

                if (sortNames.includes(name)) {
                    sort = name;
                    style = split.slice(i).join(" ") || "basic";

                    break;
                }
            }

            if (typeof sort === "undefined") {
                const out = ":warning: Invalid sort.\n" + usage;
                throw new ExitError(out);
            }

            if (!styleList.includes(style)) {
                const out = ":warning: Invalid style.\n" + usage;
                throw new ExitError(out);
            }

            sort = Util.wordsToCamel(sort);
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

        const gifenc = ModuleLoader.loadModuleFromTag(tags.GifEncoder),
            cycdraw = ModuleLoader.loadModuleFromTag(tags.Cycdraw);

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
            delay
        });

        setVars(refresh);
    }

    // array
    function createArray() {
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
    }

    // sort
    function sortMain() {
        Benchmark.startTiming("sort_total");

        delay = 500;
        nth = 1;
        writeFrame();
        stage++;

        delay = 50;
        nth = 1;
        stages.shuffle();
        stage++;

        delay = 500;
        nth = 1;
        writeFrame();
        stage++;

        delay = 30;
        nth = 2;
        sorts[sort]();
        stage++;

        nth = 1;
        delay = 500;
        writeFrame();
        stage++;

        delay = 35;
        nth = 2;
        stages.sweep();
        stage++;

        gif.finish();
        Benchmark.stopTiming("sort_total");
    }

    function sendOutput() {
        Benchmark.startTiming("encode_image");
        const gifBytes = gif.bytes();
        Benchmark.stopTiming("encode_image");

        let out;
        if (showTimes) {
            loadTableGen();

            const table = Benchmark.getTable("heavy", 1, "load_total", "load_libraries", "sort_total", "encode_image");
            out = LoaderUtils.codeBlock(table);
        }

        msg.reply(out, {
            file: {
                name: "sort.gif",
                data: gifBytes
            }
        });

        throw new ExitError();
    }

    return _ => {
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
        const out = err.message;
        out;
    } else {
        throw err;
    }
}
