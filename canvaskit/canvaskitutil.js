"use strict";

class CanvasUtilError extends CustomError {}

const CanvasKitUtil = {
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

    downloadImage: url => {
        const data = http.request({
            url,
            responseType: "arraybuffer"
        }).data;

        return CanvasKitUtil.makeImageOrGifFromEncoded(data);
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

    readImagePixels: (image, alphaType = CanvasKit.AlphaType.Unpremul) => {
        const pixels = image.readPixels(0, 0, {
            width: image.width(),
            height: image.height(),
            colorType: CanvasKit.ColorType.RGBA_8888,
            colorSpace: CanvasKit.ColorSpace.SRGB,
            alphaType
        });

        return pixels;
    },

    encodeImage: (image, format, quality) => {
        const encodedBytes = image.encodeToBytes(format, quality);

        if (encodedBytes === null) {
            throw new CanvasUtilError("Unkown format or invalid quality");
        }

        return encodedBytes;
    },

    snapshotSurface: surface => {
        surface.flush();
        return surface.makeImageSnapshot();
    },

    readSurfacePixels: (surface, alphaType) => {
        const snapshot = CanvasKitUtil.snapshotSurface(surface);

        try {
            return CanvasKitUtil.readImagePixels(snapshot, alphaType);
        } finally {
            snapshot.delete();
        }
    },

    encodeSurface: (surface, format, quality) => {
        const snapshot = CanvasKitUtil.snapshotSurface(surface);

        try {
            return CanvasKitUtil.encodeImage(snapshot, format, quality);
        } finally {
            snapshot.delete();
        }
    }
};

module.exports = CanvasKitUtil;
