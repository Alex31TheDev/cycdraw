"use strict";

class CanvasUtilError extends CustomError {}

const CanvasKitUtil = Object.freeze({
    makeImageFromEncoded: imgData => {
        const image = CanvasKit.MakeImageFromEncoded(imgData);

        if (image === null) {
            throw new CanvasUtilError("Corrupted image or unsupported format");
        }

        return image;
    },

    makeGifFromEncoded: gifData => {
        const gif = CanvasKit.MakeAnimatedImageFromEncoded(gifData);

        if (gif === null) {
            throw new CanvasUtilError("Corrupted image or unsupported format");
        }

        return gif;
    },

    makeImageOrGifFromEncoded: data => {
        const isGif = LoaderUtils.bufferIsGif(data);
        return CanvasKitUtil[`make${isGif ? "Gif" : "Image"}FromEncoded`](data);
    },

    makeTypefaceFromData: fontData => {
        const typeface = CanvasKit.Typeface.MakeFreeTypeFaceFromData(fontData);

        if (typeface === null) {
            throw new CanvasUtilError("Invalid font. Fonts have to be opentype fonts");
        }

        return typeface;
    },

    downloadTypeface: url => {
        const fontData = http.request({
            url: url,
            responseType: "arraybuffer"
        }).data;

        const typeface = CanvasKitUtil.makeTypefaceFromData(fontData);
        return [typeface, fontData];
    },

    getFontFamilies: fontMgr => {
        const familyCount = fontMgr.countFamilies(),
            families = [];

        for (let i = 0; i < familyCount; i++) {
            families.push(fontMgr.getFamilyName(i));
        }

        return families;
    },

    readImagePixels: (image, del = false, alphaType = CanvasKit.AlphaType.Unpremul) => {
        const pixels = image.readPixels(0, 0, {
            width: image.width(),
            height: image.height(),
            colorType: CanvasKit.ColorType.RGBA_8888,
            colorSpace: CanvasKit.ColorSpace.SRGB,
            alphaType
        });

        if (del) image.delete();
        return pixels;
    },

    encodeImage: (image, format, quality, del = false) => {
        const encodedBytes = image.encodeToBytes(format, quality);

        if (encodedBytes === null) {
            throw new CanvasUtilError("Unkown format or invalid quality");
        }

        if (del) image.delete();
        return encodedBytes;
    },

    snapshotSurface: (surface, del = false) => {
        surface.flush();
        const snapshot = surface.makeImageSnapshot();

        if (del) surface.delete();
        return snapshot;
    },

    readSurfacePixels: (surface, del, alphaType) => {
        const snapshot = CanvasKitUtil.snapshotSurface(surface, del);

        try {
            return CanvasKitUtil.readImagePixels(snapshot, false, alphaType);
        } finally {
            snapshot.delete();
        }
    },

    encodeSurface: (surface, format, quality, del) => {
        const snapshot = CanvasKitUtil.snapshotSurface(surface, del);

        try {
            return CanvasKitUtil.encodeImage(snapshot, format, quality, false);
        } finally {
            snapshot.delete();
        }
    }
});

module.exports = CanvasKitUtil;
