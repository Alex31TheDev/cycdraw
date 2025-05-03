"use strict";
/* global CanvasKitUtil:readonly, gifenc:readonly, Image:readonly, Color:readonly */

const lineColor = [255, 255, 255];

const tags = {
    ImageLoader: "ck_imageloader",
    CanvasKitUtil: "canvaskitutil",
    Cycdraw: "ck_cycdraw",
    GifEncoder: "ck_gifenc"
};

const help = `Usage: \`%t ${tag.name} n [url]\`
Replaces the first n pixels of each line with white pixels (from the message you answered or the URL)`;
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

const addLinesMain = lineWidth => {
    const larger = lineWidth >= width;
    const newWidth = larger ? lineWidth : width;
    const outImage = new Image(newWidth, height);
    outImage.clear(new Color(...lineColor));
    if (isGif) {
        const gif = gifenc.GIFEncoder();
        if (larger) {
            const palette = gifenc.quantize(outImage.pixels, 256);
            const index = gifenc.applyPalette(outImage.pixels, palette);
            gif.writeFrame(index, newWidth, height, { palette });
        } else
            for (let i = 0, total = image.getFrameCount(); i < total; i++) {
                const frame = Image.fromCanvaskitImage(image.makeImageAtCurrentFrame(), true);
                outImage.blit(lineWidth, 0, frame, lineWidth, 0);
                const palette = gifenc.quantize(outImage.pixels, 256);
                const index = gifenc.applyPalette(outImage.pixels, palette);
                gif.writeFrame(index, newWidth, height, { palette, delay: image.currentFrameDuration() });
                image.decodeNextFrame();
            }
        gif.finish();
        output = gif;
    } else {
        if (!larger) outImage.blit(lineWidth, 0, image, lineWidth, 0);
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
    if (Number.isNaN(lineHeight) || lineHeight <= 0) return ":warning: Invalid line width provided.\n" + usage;
    Patches.patchGlobalContext(ModuleLoader.loadModuleFromTag(tags.Cycdraw));
    ({ image, width, height, isGif } = loadImage());
    if (isGif) Patches.patchGlobalContext({ gifenc: ModuleLoader.loadModuleFromTag(tags.GifEncoder) });
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
