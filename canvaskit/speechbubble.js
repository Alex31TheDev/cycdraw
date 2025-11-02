"use strict";
/* globals Image:readonly, Color:readonly, getMessageWindow:readonly, capture:readonly */

// config
const nomiServerId = "927050775073534012",
    maxTries = 3;

const minWidth = 500,
    minHeight = 0;

let padding = 6,
    pfpMargin = 10;

let radiusY = 24,
    stopFraction = 0.63;

let x0 = 50,
    y0 = 30;

const thickness = 5;

const mode = "angle",
    value = Math.PI / 10;

let showTimes = false;

// sources
const urls = {};

const tags = {
    Cycdraw: "ck_cycdraw",

    Capture: "capture",

    Table: "ck_table"
};

// help
const helpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "--usage", "-u"],
    showTimesOption = "--show-times";

const help = `Usage: \`%t ${tag.name} [--show-times]\`
Adds a speech bubble to the message you replied to.`;

// errors
globalThis.ExitError = class extends Error {};

// misc
const pfpRectKeys = ["x", "y", "width", "height"];

// util
const Util = Object.freeze({
    calculateLength: (A, B) => {
        return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
    },

    calculateAngle: (A, B, C) => {
        const AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2)),
            BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2)),
            AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));

        return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
    },

    decodeObjectFromBuffer: (data, keys) => {
        const byteCount = keys.length * 2,
            buffer = Buffer.from(data.subarray(-byteCount));

        const values = Array.from({ length: keys.length }, (_, i) => buffer.readInt16BE(i * 2));

        const obj = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
        return [obj, data.subarray(0, -byteCount)];
    }
});

// classes
const SpeechBubble = {
    step: 0.001,
    eps1: 0.02,
    eps2: 2,

    ellipsePoint: (radiusX, radiusY, center, angle) => ({
        x: center.x + radiusX * Math.cos(angle),
        y: center.y + radiusY * Math.sin(angle)
    }),

    calcPoints: (radiusX, radiusY, f, x0, y0, thickness, mode, value) => {
        const center = {
            x: radiusX,
            y: 0
        };

        radiusX = Math.floor(radiusX - thickness / 2);
        const ellipsePoint = SpeechBubble.ellipsePoint.bind(null, radiusX, radiusY, center);

        const p0 = { x: x0, y: y0 },
            p1 = ellipsePoint(0),
            p4 = ellipsePoint(Math.PI);

        let stopAngle = f * Math.PI,
            t;

        let p2, p3;

        const maxVal = Math.PI - stopAngle;

        switch (mode) {
            case "fixed":
                t = value;

                if (stopAngle + t >= Math.PI) {
                    stopAngle = Math.PI - t;
                }

                p2 = ellipsePoint(stopAngle);
                p3 = ellipsePoint(stopAngle + t);

                break;
            case "length":
                const gapLength = value;
                p2 = ellipsePoint(stopAngle);

                for (t = 0; t <= maxVal; t += SpeechBubble.step) {
                    p3 = ellipsePoint(stopAngle + t);
                    const len = Util.calculateLength(p2, p3);

                    if (Math.abs(len - gapLength) < SpeechBubble.eps2) break;
                }

                if (Math.abs(stopAngle + t - Math.PI) < SpeechBubble.eps1) {
                    for (; stopAngle > 0; stopAngle -= SpeechBubble.step) {
                        p2 = ellipsePoint(stopAngle);
                        const len = Util.calculateLength(p2, p3);

                        if (Math.abs(len - gapLength) < SpeechBubble.eps2) break;
                    }

                    t = Math.PI - stopAngle;
                }

                break;
            case "angle":
                const tipAngle = value;
                p2 = ellipsePoint(stopAngle);

                for (t = 0; t <= maxVal; t += SpeechBubble.step) {
                    p3 = ellipsePoint(stopAngle + t);
                    const ang = Util.calculateAngle(p2, p0, p3);

                    if (Math.abs(ang - tipAngle) < SpeechBubble.eps1) break;
                }

                if (Math.abs(stopAngle + t - Math.PI) < SpeechBubble.eps1) {
                    for (; stopAngle > 0; stopAngle -= SpeechBubble.step) {
                        p2 = ellipsePoint(stopAngle);
                        const ang = Util.calculateAngle(p2, p0, p3);

                        if (Math.abs(ang - tipAngle) < SpeechBubble.eps1) break;
                    }

                    t = Math.PI - stopAngle;
                }

                break;
        }

        const info = { radiusX, radiusY, thickness },
            angles = { stopAngle, t },
            points = { center, p0, p1, p2, p3, p4 };

        return {
            info,
            angles,
            points
        };
    },

    drawCanvas: (ctx, data, options = {}) => {
        const { info, angles, points } = data;

        const { radiusX, radiusY, thickness } = info,
            { stopAngle, t } = angles,
            { center, p0, p1 } = points;

        const fillColor = options.fillColor ?? "white",
            strokeColor = options.strokeColor ?? "black";

        ctx.beginPath();

        ctx.moveTo(p1.x, p1.y);
        ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, stopAngle);

        ctx.lineTo(p0.x, p0.y);

        ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, stopAngle + t, Math.PI);

        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.fillStyle = strokeColor;
        ctx.lineWidth = thickness;
        ctx.lineJoin = "round";
        ctx.stroke();
    },

    generateSVG: (data, options = {}) => {
        const { info, points } = data;

        const { radiusX, radiusY, thickness } = info,
            { p0, p1, p2, p3, p4 } = points;

        const width = Math.round(radiusX * 2 + thickness),
            height = Math.round(Math.max(p0.y, radiusY) + thickness / 2);

        const fillColor = options.fillColor ?? "white",
            strokeColor = options.strokeColor ?? "black";

        const ellipse1 = `M ${p1.x} ${p1.y} A ${radiusX} ${radiusY} 0 0 1 ${p2.x} ${p2.y}`,
            triangle = `L ${p0.x} ${p0.y} L ${p3.x} ${p3.y}`,
            ellipse2 = `A ${radiusX} ${radiusY} 0 0 1 ${p4.x} ${p4.y}`,
            pathData = `${ellipse1} ${triangle} ${ellipse2}`;

        return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <path d="${pathData}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${thickness}" stroke-linejoin="round" />
</svg>
        `.trim();
    }
};

// globals

// input
const serverId = msg.guildId,
    channelId = msg.channelId;

let messageIds;

// speech bubble
let height, pfpRect, speechBubbleY;
let screenshot, speechBubbleImg, image;

// main
const main = (() => {
    // parse args
    function getInput() {
        (() => {
            let input = tag.args ?? "";

            let split = input.split(" "),
                option = split[0];

            if (split.length > 0) {
                if (helpOptions.includes(option)) {
                    const out = `:information_source: ${help}`;
                    throw new ExitError(out);
                }

                switch (option) {
                    case showTimesOption:
                        showTimes = true;
                        break;
                }
            }
        })();

        messageIds = (() => {
            if (serverId !== nomiServerId) {
                const out = ":information_source: This tag only works in **Nomi**.";
                throw new ExitError(out);
            }

            const replyId = msg.reference?.messageId;

            if (!replyId) {
                const out = ":information_source: You need to **reply** to a message in order to screenshot it.";
                throw new ExitError(out);
            }

            return getMessageWindow(replyId);
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

    function loadCapture() {
        Benchmark.startTiming("load_libraries");

        Benchmark.startTiming("load_screenshot");
        const capture = ModuleLoader.loadModuleFromTag(tags.Capture);
        Benchmark.stopTiming("load_screenshot");

        Patches.patchGlobalContext(capture);

        Benchmark.stopTiming("load_libraries");
    }

    function loadLodepng() {
        loadLibrary("lodepng");

        Benchmark.startTiming("load_libraries");

        Benchmark.startTiming("load_cycdraw");
        const cycdraw = ModuleLoader.loadModuleFromTag(tags.Cycdraw);
        Benchmark.stopTiming("load_cycdraw");

        Patches.patchGlobalContext(cycdraw);

        Benchmark.stopTiming("load_libraries");
    }

    function loadTableGen() {
        ModuleLoader.loadModuleFromTag(tags.Table);

        Benchmark.deleteLastCountTime("tag_fetch");
        Benchmark.deleteLastCountTime("module_load");
    }

    // capture
    function captureMessage() {
        Benchmark.startTiming("capture_message");

        screenshot = (() => {
            let imgData, err;

            function reqFunc(tries) {
                if (tries > maxTries) {
                    exit(":warning: Screenshot failed. Max tries exceeded.");
                }

                Benchmark.startTiming("screenshot_req");
                [imgData, err] = capture(serverId, channelId, messageIds);
                Benchmark.stopTiming("screenshot_req");

                if (err !== null) {
                    if (err.includes("locked")) {
                        Benchmark.delay(500);
                        return reqFunc(tries + 1);
                    }

                    const period = err.endsWith(".") ? "" : ".";
                    exit(`:warning: ${err}${period}`);
                }

                if (!imgData) {
                    exit(":warning: No image recieved.");
                }
            }

            reqFunc(0);
            return imgData;
        })();

        Benchmark.stopTiming("capture_message");

        loadLodepng();
        Patches.apply("polyfillBuffer");

        Benchmark.restartTiming("capture_message");

        [pfpRect, screenshot] = Util.decodeObjectFromBuffer(screenshot, pfpRectKeys);
        screenshot = Image.fromImageData(lodepng.decode(screenshot));
        height = screenshot.height;

        Benchmark.stopTiming("capture_message");
    }

    // speech bubble
    function findProfilePicture() {
        const hasProfilePicture = pfpRectKeys.every(key => pfpRect[key] !== 0);

        if (hasProfilePicture) {
            x0 = pfpRect.x + pfpRect.width / 2;
            y0 = pfpRect.y + pfpRect.height / 2;

            x0 += pfpMargin;
            y0 -= pfpMargin;
        } else {
            radiusY /= 2;
            padding *= 2;
        }

        speechBubbleY = radiusY + padding;
        y0 += speechBubbleY;
    }

    function drawSpeechBubble() {
        Benchmark.startTiming("draw_speechbubble");

        const radiusX = screenshot.width / 2;

        const data = SpeechBubble.calcPoints(radiusX, radiusY, stopFraction, x0, y0, thickness, mode, value),
            svg = SpeechBubble.generateSVG(data);

        const imgData = new Resvg(svg).render();
        speechBubbleImg = Image.fromPixels(imgData.pixels, imgData.width, imgData.height);

        Benchmark.stopTiming("draw_speechbubble");
    }

    function speechBubble() {
        Benchmark.startTiming("draw_total");

        findProfilePicture();
        drawSpeechBubble();

        image = new Image(screenshot.width, height + speechBubbleY + padding);

        const bgColor = screenshot.getPixel(0, 0);
        image.clear(bgColor);

        image.blit(0, speechBubbleY, screenshot);
        image.overlap(0, 0, speechBubbleImg);

        speechBubbleImg = screenshot = undefined;

        Benchmark.stopTiming("draw_total");
    }

    function sendOutput() {
        Benchmark.startTiming("encode_image");
        const pngBytes = lodepng.encode(image);
        Benchmark.stopTiming("encode_image");
        image = undefined;

        let out;
        if (showTimes) {
            loadTableGen();

            const table = Benchmark.getTable(
                "heavy",
                1,
                "load_total",
                "load_libraries",
                "capture_message",
                "draw_total",
                "encode_image"
            );

            out = LoaderUtils.codeBlock(table);
        }

        msg.reply(out, {
            file: {
                name: "speechbubble.png",
                data: pngBytes
            }
        });
    }

    return () => {
        initLoader();
        loadCapture();

        getInput();

        captureMessage();
        loadLibrary("resvg");

        speechBubble();
        sendOutput();
    };
})();

try {
    // run main
    main();
} catch (err) {
    // output
    if (err instanceof ExitError) err.message;
    else throw err;
}
