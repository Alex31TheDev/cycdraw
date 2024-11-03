const CanvasKitUtil = CanvasKit => ({
    downloadImage: url => {
        const imgData = http.request({
            url: url,
            responseType: "arraybuffer"
        }).data;

        const image = CanvasKit.MakeImageFromEncoded(imgData);

        if (image === null) {
            throw new CanvasUtilError("Corrupted image or unsupported format");
        }

        return image;
    },

    downloadTypeface: url => {
        const fontData = http.request({
            url: url,
            responseType: "arraybuffer"
        }).data;

        const typeface = CanvasKit.Typeface.MakeFreeTypeFaceFromData(fontData);

        if (typeface === null) {
            throw new CanvasUtilError("Invalid font. Fonts have to be opentype fonts");
        }

        return [typeface, fontData];
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
    }
});

module.exports = CanvasKitUtil;
