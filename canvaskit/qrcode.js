"use strict";
/* global qrcode:readonly */

// config
const defaultScale = 12,
    maxScale = 100;

// sources
const urls = {};

const tags = {
    QRCode: "ck_qrcode"
};

// help
const helpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "--usage", "-u"],
    scaleOption = "-scale";

const help = `Usage: \`%t ${tag.name} [-scale 1-100] text\`
Encode the provided text or text file into a QR code.`,
    usage = `See \`%t ${tag.name} help\` for usage.`;

// errors
globalThis.ExitError = class extends Error {};

// main
const main = (() => {
    // parse args and attachment
    function getInput() {
        let input = tag.args ?? "",
            scale = defaultScale;

        const split = input.split(" "),
            option = split[0];

        checkArgs: if (split.length > 0) {
            if (helpOptions.includes(option)) {
                const out = `:information_source: ${help}`;
                throw new ExitError(out);
            }

            let removed = 1;

            switch (option) {
                case scaleOption:
                    const scaleStr = split[1];

                    if (typeof scaleStr === "undefined") {
                        const out = ":warning: No pixel scale provided.\n" + usage;
                        throw new ExitError(out);
                    }

                    const scale = Number.parseInt(scaleStr, 10);

                    if (Number.isNaN(scale) || scale < 1 || scale > maxScale) {
                        const out = `:warning: Invalid pixel scale provided: \`${scaleStr}\`\n${usage}`;
                        throw new ExitError(out);
                    }

                    removed++;
                    break;
                default:
                    break checkArgs;
            }

            for (let i = 0; i < removed; i++) split.shift();
            input = split.join(" ");
        }

        if (msg.attachments.length > 0) {
            return {
                scale,
                hasAttachment: true
            };
        }

        if (input.length < 1) {
            const out = ":warning: No text provided.\n" + usage;
            throw new ExitError(out);
        }

        return {
            input,
            scale,
            hasAttachment: false
        };
    }

    function getAttachmentInput() {
        let input;

        try {
            ({ body: input } = LoaderUtils.fetchAttachment(msg, undefined, "text/plain"));
        } catch (err) {
            if (err.name === "UtilError") {
                exit(":warning: Invalid file type. Only text files are allowed.");
            }

            throw err;
        }

        if (input.length < 1) {
            exit(":warning: No text provided.\n" + usage);
        }

        return input;
    }

    // load libraries
    function loadLodepng() {
        delete globalThis.ExitError;

        util.loadLibrary = "lodepng";

        if (util.env) {
            eval(util.fetchTag("canvaskitloader").body);
        } else {
            util.executeTag("canvaskitloader");
        }

        ModuleLoader.useDefault("tagOwner");
        ModuleLoader.enableCache = false;
    }

    function loadQrcode() {
        Patches.apply("polyfillTextEncoderDecoder");
        const { qrcode } = ModuleLoader.loadModuleFromTag(tags.QRCode);

        Patches.patchGlobalContext({ qrcode });
    }

    // QR code main
    function createQrcode(str) {
        try {
            const code = qrcode.create(str);
            return code.modules;
        } catch (err) {
            switch (err.message) {
                case "The amount of data is too big to be stored in a QR Code":
                    exit(":warning: The data is too large to fit into a QR code.");
            }

            throw err;
        }
    }

    function drawQrcode(qrcode, scale) {
        qrcode = qrcode.modules ?? qrcode;

        const width = qrcode.size * scale,
            pixels = new Uint8Array(width * width * 4);

        for (let y = 0; y < qrcode.size; y++) {
            for (let x = 0; x < qrcode.size; x++) {
                const ind1 = y * qrcode.size + x,
                    clr = qrcode.data[ind1] ? 0 : 255;

                for (let i = 0; i < scale; i++) {
                    for (let j = 0; j < scale; j++) {
                        const px = x * scale + j,
                            py = y * scale + i;

                        const ind2 = (py * width + px) * 4;

                        pixels[ind2] = clr;
                        pixels[ind2 + 1] = clr;
                        pixels[ind2 + 2] = clr;
                        pixels[ind2 + 3] = 255;
                    }
                }
            }
        }

        return { pixels, width };
    }

    function sendOutput(pixels, width) {
        const pngBytes = lodepng.encode({
            width,
            height: width,
            data: pixels
        });

        msg.reply({
            file: {
                name: "qrcode.png",
                data: pngBytes
            }
        });
    }

    return () => {
        let { input, scale, hasAttachment } = getInput();
        if (hasAttachment) input = getAttachmentInput();

        loadLodepng();
        loadQrcode();

        const code = createQrcode(input),
            { pixels, width } = drawQrcode(code, scale);

        sendOutput(pixels, width);
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
