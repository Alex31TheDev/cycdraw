"use strict";
/* globals getMessageWindow:readonly, capture:readonly */

// config
const allowedServerIds = new Set(["927050775073534012", "1268768059489783838"]),
    allowedServerNames = ["Nomi", "MONI"];

const maxTries = 3;

const minWidth = 500,
    minHeight = 0;

let padding = 6,
    pfpMargin = 10;

let radiusY = 24,
    stopFraction = 0.63;

let x0 = 50,
    y0 = 30;

const thickness = 5;

const mode = "length",
    value = 35;

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

// classes
const SpeechBubble = {
    ellipsePoint: (radiusX, radiusY, center, angle) => ({
        x: center.x + radiusX * Math.cos(angle),
        y: center.y + radiusY * Math.sin(angle)
    }),

    calcPoints: (radiusX, radiusY, f, x0, y0, thickness, mode = "angle", value = Math.PI / 10) => {
        const width = Math.round(radiusX * 2);

        const innerRadiusX = Math.max(1, radiusX - thickness / 2),
            center = { x: radiusX, y: 0 };

        const getPoint = angle => SpeechBubble.ellipsePoint(innerRadiusX, radiusY, center, angle);

        const p0 = { x: x0, y: y0 },
            p1 = getPoint(0),
            p4 = getPoint(Math.PI);

        let stopAngle = Math.max(0, Math.min(Math.PI, f * Math.PI)),
            t = 0;

        switch (mode) {
            case "fixed":
                t = Math.max(0, value);

                if (stopAngle + t > Math.PI) {
                    stopAngle = Math.max(0, Math.PI - t);
                    t = Math.PI - stopAngle;
                }

                break;
            case "length": {
                const targetLen = Math.max(0, value),
                    maxT = Math.PI - stopAngle;

                const p2Candidate = getPoint(stopAngle);

                const lenAtMax = Math.hypot(getPoint(Math.PI).x - p2Candidate.x, getPoint(Math.PI).y - p2Candidate.y);

                if (lenAtMax >= targetLen) {
                    t = SpeechBubble._solveBisection(
                        delta => {
                            const pt = getPoint(stopAngle + delta);
                            return Math.hypot(pt.x - p2Candidate.x, pt.y - p2Candidate.y);
                        },
                        targetLen,
                        0,
                        maxT
                    );
                } else {
                    const p3End = getPoint(Math.PI),
                        maxSpanLen = Math.hypot(p3End.x - getPoint(0).x, p3End.y - getPoint(0).y);

                    if (targetLen >= maxSpanLen) {
                        stopAngle = 0;
                    } else {
                        stopAngle = SpeechBubble._solveBisection(
                            ang => {
                                const pt = getPoint(ang);
                                return -Math.hypot(p3End.x - pt.x, p3End.y - pt.y);
                            },
                            -targetLen,
                            0,
                            stopAngle
                        );
                    }

                    t = Math.PI - stopAngle;
                }

                break;
            }
            case "angle":
            default: {
                const targetAngle = Math.max(0, value);

                const p2Candidate = getPoint(stopAngle),
                    theta2 = Math.atan2(p2Candidate.y - p0.y, p2Candidate.x - p0.x);

                const hit = SpeechBubble._rayEllipseIntersect(
                    p0,
                    theta2 - targetAngle,
                    innerRadiusX,
                    radiusY,
                    center.x
                );

                if (hit !== null && hit.ang >= stopAngle && hit.ang <= Math.PI) {
                    t = hit.ang - stopAngle;
                } else {
                    const p3End = getPoint(Math.PI),
                        theta3End = Math.atan2(p3End.y - p0.y, p3End.x - p0.x);

                    const hitClamped = SpeechBubble._rayEllipseIntersect(
                        p0,
                        theta3End + targetAngle,
                        innerRadiusX,
                        radiusY,
                        center.x
                    );

                    if (hitClamped !== null && hitClamped.ang >= 0 && hitClamped.ang <= Math.PI) {
                        stopAngle = hitClamped.ang;
                        t = Math.PI - stopAngle;
                    } else {
                        stopAngle = 0;
                        t = Math.PI;
                    }
                }

                break;
            }
        }

        const p2 = getPoint(stopAngle),
            p3 = getPoint(stopAngle + t);

        const info = { radiusX: innerRadiusX, radiusY, thickness, width },
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

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = thickness;
        ctx.lineJoin = "round";
        ctx.stroke();
    },

    generateSVG: (data, options = {}) => {
        const { info, points } = data;

        const { radiusX, radiusY, thickness, width } = info,
            { p0, p1, p2, p3, p4 } = points;

        const svgWidth = width ?? Math.round(radiusX * 2 + thickness),
            height = Math.round(Math.max(p0.y, radiusY) + thickness / 2);

        const fillColor = options.fillColor ?? "white",
            strokeColor = options.strokeColor ?? "black";

        const ellipse1 = `M ${p1.x} ${p1.y} A ${radiusX} ${radiusY} 0 0 1 ${p2.x} ${p2.y}`,
            triangle = `L ${p0.x} ${p0.y} L ${p3.x} ${p3.y}`,
            ellipse2 = `A ${radiusX} ${radiusY} 0 0 1 ${p4.x} ${p4.y}`,
            pathData = `${ellipse1} ${triangle} ${ellipse2}`;

        return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${height}">
    <path d="${pathData}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${thickness}" stroke-linejoin="round" />
</svg>
        `.trim();
    },

    _rayEllipseIntersect: (p0, theta, a, b, cx) => {
        const dx = Math.cos(theta),
            dy = Math.sin(theta);

        const x0c = p0.x - cx;

        const A = (dx * dx) / (a * a) + (dy * dy) / (b * b),
            B = 2 * ((x0c * dx) / (a * a) + (p0.y * dy) / (b * b)),
            C = (x0c * x0c) / (a * a) + (p0.y * p0.y) / (b * b) - 1;

        const disc = B * B - 4 * A * C;

        if (disc < 0) {
            return null;
        }

        const sqrtDisc = Math.sqrt(disc);

        for (const s of [(-B - sqrtDisc) / (2 * A), (-B + sqrtDisc) / (2 * A)]) {
            if (s > 0) {
                const x = p0.x + s * dx,
                    y = p0.y + s * dy;

                if (y >= -1e-6) {
                    const clampedY = Math.max(0, y),
                        clampedX = Math.max(cx - a, Math.min(cx + a, x));

                    const ang = Math.atan2(clampedY / b, (clampedX - cx) / a);
                    return { x: clampedX, y: clampedY, ang };
                }
            }
        }

        return null;
    },

    _solveBisection: (fn, target, low, high, iterations = 24) => {
        for (let i = 0; i < iterations; i++) {
            const mid = (low + high) / 2;

            if (fn(mid) < target) {
                low = mid;
            } else {
                high = mid;
            }
        }

        return (low + high) / 2;
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

function formatAllowedServers(names) {
    const boldNames = names.map(name => `**${name}**`);

    if (boldNames.length <= 1) {
        return boldNames[0] ?? "";
    } else if (boldNames.length === 2) {
        return `${boldNames[0]} or ${boldNames[1]}`;
    } else {
        return `${boldNames.slice(0, -1).join(", ")}, or ${boldNames[boldNames.length - 1]}`;
    }
}

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
            if (!allowedServerIds.has(serverId)) {
                const out = `:information_source: This tag only works in ${formatAllowedServers(allowedServerNames)}.`;
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
        Benchmark.startTiming("load_libraries");

        loadLibrary("cycdraw");
        loadLibrary("lodepng");

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
                [imgData, err, pfpRect] = capture(serverId, channelId, messageIds);
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

        Benchmark.restartTiming("capture_message");

        screenshot = Image.fromImageData(lodepng.decode(screenshot));
        height = screenshot.height;

        Benchmark.stopTiming("capture_message");
    }

    // speech bubble
    function findProfilePicture() {
        if (pfpRect != null) {
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
