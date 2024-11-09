class CanvasUtilError extends CustomError {}

const CanvasKitUtil = {
    makeImageFromEncoded: imgData => {
        const image = CanvasKit.MakeImageFromEncoded(imgData);

        if (image === null) {
            throw new CanvasUtilError("Corrupted image or unsupported format");
        }

        return image;
    },

    downloadImage: url => {
        const imgData = http.request({
            url: url,
            responseType: "arraybuffer"
        }).data;

        return CanvasKitUtil.makeImageFromEncoded(imgData);
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

    encodeSurface: (surface, format, quality) => {
        surface.flush();

        const snapshot = surface.makeImageSnapshot(),
            encodedBytes = snapshot.encodeToBytes(format, quality);

        snapshot.delete();

        if (encodedBytes === null) {
            throw new CanvasUtilError("Unkown format or invalid quality");
        }

        return encodedBytes;
    },

    readSurfacePixels: (surface, alphaType = CanvasKit.AlphaType.Unpremul) => {
        surface.flush();

        const snapshot = surface.makeImageSnapshot(),
            width = snapshot.width(),
            height = snapshot.height();

        const pixels = snapshot.readPixels(0, 0, {
            width,
            height,
            colorType: CanvasKit.ColorType.RGBA_8888,
            colorSpace: CanvasKit.ColorSpace.SRGB,
            alphaType
        });

        snapshot.delete();
        return pixels;
    }
};

module.exports = CanvasKitUtil;
