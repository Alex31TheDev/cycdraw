"use strict";
/* global CanvasKitUtil:readonly */

const lineColor = [255, 255, 255];

const tags = {
    ImageLoader: "ck_imageloader",
    CanvasKitUtil: "canvaskitutil",
    Cycdraw: "ck_cycdraw",
    GifEncoder: "ck_gifenc"
};

const help = `Usage: \`%t ${tag.name} n [url]\`
Adds n lines of white pixels to the given image (from the message you answered or the URL)`;
const usage = `See \`%t ${tag.name} help\` for usage.`;

let image, width, height, isGif, output;

const loadDecodeLibrary = library => {
    switch (library) {
        case "canvaskit":
            loadLibrary("canvaskit");
            return Patches.patchGlobalContext({ CanvasKitUtil: ModuleLoader.loadModuleFromTag(tags.CanvasKitUtil) });
        case "lodepng":
            return loadLibrary(library);
    }
};

const addLinesMain = lineHeight => {
    const newHeight = height + lineHeight;
    const outImage = new Image(width, newHeight);
    outImage.clear(new Color(...lineColor));
    if (isGif) {
        const gif = gifenc.GIFEncoder();
        for (let i = 0, total = image.getFrameCount(); i < total; i++) {
            outImage.blit(0, lineHeight, Image.fromCanvaskitImage(image.makeImageAtCurrentFrame(), true));
            const palette = gifenc.quantize(outImage.pixels, 256);
            const index = gifenc.applyPalette(outImage.pixels, palette);
            gif.writeFrame(index, width, newHeight, { palette, delay: image.currentFrameDuration() });
            image.decodeNextFrame();
        }
        gif.finish();
        output = gif;
    } else {
        outImage.blit(0, lineHeight, image);
        output = outImage;
    }
};

const main = () => {
    util.loadLibrary = "none";
    util.env ? eval(util.fetchTag("canvaskitloader").body) : util.executeTag("canvaskitloader");
    ModuleLoader.useDefault("tagOwner");
    ModuleLoader.enableCache = false;
    const { parseArgs, loadImage } = ModuleLoader.loadModuleFromTag(tags.ImageLoader, {
        scope: {
            help,
            requireText: true,
            requireImage: true,
            decodeLibrary: "lodepng",
            loadDecodeLibrary
        },
        isolateGlobals: false
    });
    const { text, targetMsg } = parseArgs();
    const lineHeight = Number.parseInt(text, 10);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0) exit(":warning: Invalid number of lines provided.\n" + usage);
    loadLibrary("cycdraw");
    ({ image, width, height, isGif } = loadImage());
    if (isGif) loadLibrary("gifenc");
    else if (targetMsg.attachInfo.ext === ".png") image = Image.fromImageData(image);
    else image = Image.fromCanvaskitImage(image, true);
    addLinesMain(lineHeight);
    if (output == null) return targetMsg.fileUrl;
    msg.reply({
        file: {
            name: `image.${isGif ? "gif" : "png"}`,
            data: isGif ? output.bytes() : (loadDecodeLibrary("lodepng"), lodepng.encode(output))
        }
    });
};

try {
    main();
} catch (err) {
    if (err instanceof ExitError) err.message;
    else throw err;
}
