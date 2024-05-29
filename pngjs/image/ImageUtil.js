const ImageUtil = {
    inBounds: (img, x, y) => {
        return x >= 0 && x < img.width && y >= 0 && y < img.height;
    },

    clamp: (img, x, y) => {
        x = Utils.clamp(Math.floor(x), 0, img.width);
        y = Utils.clamp(Math.floor(y), 0, img.height);

        return [x, y];
    },

    getPixel: (img, x, y) => {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!ImageUtil.inBounds(x, y)) {
            return Colors.black;
        }

        const pos = 4 * (y * img.width + x);

        const r = img.data[pos],
            g = img.data[pos + 1],
            b = img.data[pos + 2];

        return new Color(r, g, b);
    },

    setPixel: (img, x, y, color) => {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!ImageUtil.inBounds(x, y)) {
            return;
        }

        ImageUtil.setPixel_u(img, x, y, color.r, color.g, color.b);
    },

    setPixel_u: (img, x, y, r, g, b) => {
        let pos = 4 * (y * img.width + x);

        img.data[pos++] = r;
        img.data[pos++] = g;
        img.data[pos] = b;
    },

    clear: (img, color) => {
        let i = 0,
            n = img.data.length;

        const r = color?.r ?? 0,
            g = color?.g ?? 0,
            b = color?.b ?? 0;

        while (i < n) {
            img.data[i++] = r;
            img.data[i++] = g;
            img.data[i++] = b;

            img.data[i++] = 0xff;
        }
    }
};

module.exports = ImageUtil;
