const Util = require("../util/Util.js");

class Color {
    constructor(r, g, b) {
        if (r instanceof Color) {
            this.r = r.r;
            this.g = r.g;
            this.b = r.b;

            return this;
        }

        this.r = Util.clamp(Math.round(r), 0, 255);
        this.g = Util.clamp(Math.round(g), 0, 255);
        this.b = Util.clamp(Math.round(b), 0, 255);
    }

    toString() {
        return `Color: {${this.r}, ${this.g}, ${this.b}}`;
    }

    static fromHex(hex) {
        if (hex.startsWith("#")) {
            hex = hex.slice(1);
        }

        const comps = hex.match(/.{2}/g);

        const r = parseInt(comps[0], 16) || 0,
            g = parseInt(comps[1], 16) || 0,
            b = parseInt(comps[2], 16) || 0;

        return new Color(r, g, b);
    }

    toHex() {
        return `#${this.r.toString(16)}${this.g.toString(16)}${this.b.toString(16)}`;
    }

    static fromHSV(h, s, v) {
        h = Util.clamp(h || 0, 0, 360);
        s = Util.clamp(s || 0, 0, 1);
        v = Util.clamp(v || 0, 0, 1);

        const c = s * v,
            x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
            m = v - c;

        let r = 0,
            g = 0,
            b = 0;

        if (h >= 0 && h < 60) {
            r = c;
            g = x;
        } else if (h >= 60 && h < 120) {
            r = x;
            g = c;
        } else if (h >= 120 && h < 180) {
            g = c;
            b = x;
        } else if (h >= 180 && h < 240) {
            g = x;
            b = c;
        } else if (h >= 240 && h < 300) {
            r = x;
            b = c;
        } else {
            r = c;
            b = x;
        }

        r = (r + m) * 255;
        g = (g + m) * 255;
        b = (b + m) * 255;

        return new Color(r, g, b);
    }

    toHSV() {
        //https://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/
        const [r, g, b] = this.normalize();

        const maxc = Math.max(r, g, b),
            minc = Math.min(r, g, b),
            diff = maxc - minc;

        let h,
            s = diff / maxc;

        switch (maxc) {
            case minc:
                h = 0;
                break;
            case 0:
                s = 0;
                break;
            case r:
                h = (60 * ((g - b) / diff) + 360) % 360;
                break;
            case g:
                h = (60 * ((b - r) / diff) + 120) % 360;
                break;
            case b:
                h = (60 * ((r - g) / diff) + 240) % 360;
                break;
        }

        return [h, s, maxc * 100];
    }

    inverted() {
        return new Color(255 - this.r, 255 - this.g, 255 - this.b);
    }

    normalize() {
        return [this.r / 255, this.g / 255, this.b / 255];
    }
}

module.exports = Color;
