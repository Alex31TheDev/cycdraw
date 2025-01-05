"use strict";

// errors
class DrawingError extends CustomError {}

// structs
class Color {
    constructor(r, g, b, a) {
        if (r instanceof Color) {
            const clr = r,
                new_a = g;

            this.r = clr.r;
            this.g = clr.g;
            this.b = clr.b;

            if (typeof new_a === "undefined") {
                this.a = clr.a;
            } else {
                this.a = LoaderUtils.clamp(Math.round(new_a), 0, 255);
            }

            return this;
        }

        this.r = LoaderUtils.clamp(Math.round(r), 0, 255);
        this.g = LoaderUtils.clamp(Math.round(g), 0, 255);
        this.b = LoaderUtils.clamp(Math.round(b), 0, 255);

        if (typeof a === "undefined" || a === 255) {
            this.a = 255;
        } else {
            this.a = LoaderUtils.clamp(Math.round(a), 0, 255);
        }
    }

    toString() {
        return `Color: {${this.r}, ${this.g}, ${this.b}, ${this.a}}`;
    }

    equals(clr, alpha = true) {
        const a = !alpha || this.a === clr.a;
        return this.r === clr.r && this.g === clr.g && this.b === clr.b && a;
    }

    approxEquals(clr, tolerance = 2, alpha = false) {
        let distance =
            (this.r - clr.r) * (this.r - clr.r) +
            (this.g - clr.g) * (this.g - clr.g) +
            (this.b - clr.b) * (this.b - clr.b);

        if (alpha) {
            distance += (this.a - clr.a) * (this.a - clr.a);
        }

        return Math.sqrt(distance) <= tolerance;
    }

    static fromHex(hex) {
        if (hex.startsWith("#")) {
            hex = hex.slice(1);
        }

        const comps = hex.match(/.{2}/g);

        const r = Number.parseInt(comps[0], 16) || 0,
            g = Number.parseInt(comps[1], 16) || 0,
            b = Number.parseInt(comps[2], 16) || 0;

        return new Color(r, g, b);
    }

    toHex() {
        return `#${this.r.toString(16)}${this.g.toString(16)}${this.b.toString(16)}`;
    }

    static fromHSV(h, s, v) {
        h = LoaderUtils.clamp(h || 0, 0, 360);
        s = LoaderUtils.clamp(s || 0, 0, 1);
        v = LoaderUtils.clamp(v || 0, 0, 1);

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
        return [this.r / 255, this.g / 255, this.b / 255, this.a / 255];
    }

    blend(clr) {
        if (this.a === 0 || clr.a === 255) {
            return new Color(clr);
        }

        const a = this.a / 255,
            clr_a = clr.a / 255,
            a1 = 1 - clr_a;

        const res = clr_a + a * a1;

        if (res === 0) {
            return new Color(0, 0, 0, 0);
        }

        const inv = 1 / res;

        const r = Math.round((this.r * a * a1 + clr.r * clr_a) * inv),
            g = Math.round((this.g * a * a1 + clr.g * clr_a) * inv),
            b = Math.round((this.b * a * a1 + clr.b * clr_a) * inv),
            a2 = Math.round(res * 255);

        return new Color(r, g, b, a2);
    }
}

class Point {
    constructor(x, y) {
        if (x instanceof Point) {
            const p = x;

            this.x = p.x;
            this.y = p.y;

            return this;
        }

        this.x = x;
        this.y = y;
    }

    equals(p) {
        return this.x === p.x && this.y === p.y;
    }

    add(p) {
        if (p instanceof Point) {
            return new Point(this.x + p.x, this.y + p.y);
        }

        return new Point(this.x + p, this.y + p);
    }

    sub(p) {
        if (p instanceof Point) {
            return new Point(this.x - p.x, this.y - p.y);
        }

        return new Point(this.x - p, this.y - p);
    }

    scale(x) {
        return new Point(this.x * x, this.y * x);
    }

    invScale(x) {
        return new Point(this.x / x, this.y / x);
    }

    abs() {
        return new Point(Math.abs(this.x), Math.abs(this.y));
    }

    round() {
        return new Point(Math.round(this.x), Math.round(this.y));
    }

    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y));
    }

    ceil() {
        return new Point(Math.ceil(this.x), Math.ceil(this.y));
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    dist(p) {
        const dx = p.x - this.x,
            dy = p.y - this.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    midpoint(p) {
        const mx = (this.x + p.x) / 2,
            my = (this.y + p.y) / 2;

        return new Point(Math.floor(mx), Math.floor(my));
    }

    quadrant() {
        if (this.x >= 0 && this.y >= 0) {
            return 1;
        }

        if (this.x < 0 && this.y > 0) {
            return 2;
        }

        if (this.x < 0 && this.y < 0) {
            return 3;
        }

        if (this.x > 0 && this.y < 0) {
            return 4;
        }
    }

    complexPhase() {
        return Math.atan2(this.y, this.x);
    }

    static fromPolar(phase, length) {
        const re = length * Math.cos(phase),
            im = length * Math.sin(phase);

        return new Point(re, im);
    }

    toPolar() {
        const phase = this.complexPhase(),
            length = this.length();

        return new Point(phase, length);
    }

    complexMult(p) {
        const re = this.x * p.x - this.y * p.y,
            im = this.x * p.y + this.y * p.x;

        return new Point(re, im);
    }

    complexDiv(p) {
        const sum = this.y * this.y + p.y * p.y;

        const re = (this.x * p.x - this.y * p.y) / sum,
            im = (this.x * p.y + this.y * p.x) / sum;

        return new Point(re, im);
    }

    toString() {
        return `Point: {x: ${this.x}, y: ${this.y}}`;
    }

    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }
}

class Grid {
    constructor(x1, y1, x2, y2, xDiv, yDiv) {
        this.xDiv = xDiv;
        this.yDiv = yDiv;

        this.w = Math.abs(x2 - x1);
        this.h = Math.abs(y2 - y1);

        this.xMult = this.w / xDiv;
        this.yMult = this.h / yDiv;

        if (x1 > x2) {
            this.x = x2;
        } else {
            this.x = x1;
        }

        if (y1 > y2) {
            this.y = y2;
        } else {
            this.y = y1;
        }
    }

    point(i, j) {
        return new Point(this.x + i * this.xMult, this.y + j * this.yMult);
    }
}

class Font {
    constructor(charSet, spacing = 1, options = {}) {
        this.spacing = spacing;

        this.options = options;
        const postProc = options.postProc;

        this.loadGlyphs(charSet);

        if (typeof postProc !== "undefined") {
            const glyphs = this.charSet.map(x => this.charMap[x]);
            glyphs.forEach(postProc);

            postProc(this.unknown);
        }
    }

    loadGlyphs(charSet) {
        this.charSet = Object.keys(charSet);
        this.charMap = {};

        let unknown;

        for (const key of this.charSet) {
            const char = charSet[key],
                glyph = Image.fromPixels(char.pixels, char.w, char.h);

            if (key === "unknown") {
                unknown = glyph;

                const ind = this.charSet.indexOf(key);
                this.charSet.splice(ind, 1);
            } else {
                this.charMap[key] = glyph;
            }
        }

        if (typeof unknown === "undefined") {
            unknown = new Image(1, 1);
        }

        this.unknown = unknown;
    }

    getGlyph(char) {
        if (this.charSet.includes(char)) {
            return this.charMap[char];
        }

        return this.unknown;
    }

    measureString(str) {
        let w = 0,
            h = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (char === "\n") {
                continue;
            }

            const glyph = this.getGlyph(char);

            w += glyph.w + this.spacing;
            h = Math.max(h, glyph.h);
        }

        w -= this.spacing;
        return [w, h];
    }
}

// named colors
const Colors = Object.freeze({
    aqua: new Color(0, 255, 255),
    beige: new Color(245, 245, 220),
    black: new Color(0, 0, 0),
    blue: new Color(0, 0, 255),
    brown: new Color(165, 42, 42),
    clr69: new Color(69, 96, 69),
    crimson: new Color(220, 20, 60),
    cyan: new Color(0, 255, 255),
    darkBlue: new Color(0, 0, 139),
    darkCyan: new Color(0, 139, 139),
    darkGray: new Color(169, 169, 169),
    darkGreen: new Color(0, 100, 0),
    darkOrange: new Color(255, 140, 0),
    darkRed: new Color(139, 0, 0),
    deepPink: new Color(255, 20, 147),
    gold: new Color(255, 215, 0),
    gray: new Color(128, 128, 128),
    green: new Color(0, 128, 0),
    hotPink: new Color(255, 105, 180),
    indigo: new Color(75, 0, 130),
    lightBlue: new Color(100, 149, 237),
    lightCyan: new Color(224, 255, 255),
    lightGray: new Color(211, 211, 211),
    lightGreen: new Color(144, 238, 144),
    lightPink: new Color(255, 182, 193),
    lightYellow: new Color(255, 255, 224),
    lime: new Color(0, 255, 0),
    magenta: new Color(255, 0, 255),
    olive: new Color(128, 128, 0),
    orange: new Color(255, 165, 0),
    orangeRed: new Color(255, 69, 0),
    pink: new Color(255, 192, 203),
    purple: new Color(147, 112, 219),
    red: new Color(255, 0, 0),
    silver: new Color(192, 192, 192),
    tan: new Color(210, 180, 140),
    violet: new Color(138, 43, 226),
    white: new Color(255, 255, 255),
    yellow: new Color(255, 255, 0)
});

// font
const f_1 = {
    0: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255,
            255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255,
            255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0
        ]
    },
    1: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
        ]
    },
    2: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255,
            255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
        ]
    },
    3: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255,
            255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0
        ]
    },
    4: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255,
            255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255,
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255
        ]
    },
    5: {
        w: 5,
        h: 7,
        pixels: [
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0
        ]
    },
    6: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
            255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0
        ]
    },
    7: {
        w: 5,
        h: 7,
        pixels: [
            255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255,
            255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0
        ]
    },
    8: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0
        ]
    },
    9: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
            255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0
        ]
    },
    unknown: {
        w: 5,
        h: 7,
        pixels: [
            0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 255, 255, 255, 0, 0, 0, 0, 0, 0
        ]
    }
};

// image
class Image {
    constructor(w, h) {
        if (w <= 0 || h <= 0) {
            throw new DrawingError("Invalid image size");
        }

        this.w = Math.floor(w);
        this.h = Math.floor(h);

        this.pixels = new Uint8Array(Image.getBufSize(this)).fill(0);
    }

    static getBufSize(w, h) {
        if (typeof w === "object") {
            const img = w;

            w = img.w;
            h = img.h;
        }

        return 4 * w * h;
    }

    static fromPixels(pixels, w, h) {
        const hasAlpha = pixels.length % 4 === 0;

        if (!hasAlpha && pixels.length % 3 !== 0) {
            throw new DrawingError("Pixel array is invalid");
        }

        if (pixels.length > Image.getBufSize(w, h)) {
            throw new DrawingError("Pixel array is too large");
        }

        let img = new Image(w, h);

        let i1 = 0,
            i2 = 0;

        if (hasAlpha) {
            if (pixels instanceof Uint8Array) {
                img.pixels = pixels;
            } else {
                for (; i1 < img.pixels.length && i1 < pixels.length; i1++) {
                    img.pixels[i1] = pixels[i1] & 0xff;
                }
            }
        } else {
            while (i1 < img.pixels.length && i2 < pixels.length) {
                img.pixels[i1++] = pixels[i2++] & 0xff;
                img.pixels[i1++] = pixels[i2++] & 0xff;
                img.pixels[i1++] = pixels[i2++] & 0xff;
                img.pixels[i1++] = 255;
            }
        }

        return img;
    }

    get width() {
        return this.w;
    }

    set width(x) {
        this.w = x;
    }

    get height() {
        return this.h;
    }

    set height(x) {
        this.h = x;
    }

    get data() {
        return this.pixels;
    }

    set data(x) {
        this.pixels = x;
    }

    copy() {
        const img = new Image(this.w, this.h);
        img.pixels.set(this.pixels);

        return img;
    }

    inBounds(x, y) {
        return x >= 0 && x < this.w && y >= 0 && y < this.h;
    }

    clamp(x, y) {
        x = LoaderUtils.clamp(Math.floor(x), 0, this.w - 1);
        y = LoaderUtils.clamp(Math.floor(y), 0, this.h - 1);

        return [x, y];
    }

    getPixel(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!this.inBounds(x, y)) {
            return Colors.black;
        }

        const pos = 4 * (y * this.w + x);

        const r = this.pixels[pos],
            g = this.pixels[pos + 1],
            b = this.pixels[pos + 2],
            a = this.pixels[pos + 3];

        return new Color(r, g, b, a);
    }

    _blendPixel_rgb(pos, a, clr_r, clr_g, clr_b, clr_a) {
        const r = this.pixels[pos],
            g = this.pixels[pos + 1],
            b = this.pixels[pos + 2];

        a /= 255;
        clr_a /= 255;
        const a1 = 1 - clr_a;

        const res = clr_a + a * a1;

        if (res === 0) {
            this.pixels[pos++] = 0;
            this.pixels[pos++] = 0;
            this.pixels[pos++] = 0;
            this.pixels[pos++] = 0;

            return pos;
        }

        const inv = 1 / res;

        this.pixels[pos++] = ~~((r * a * a1 + clr_r * clr_a) * inv);
        this.pixels[pos++] = ~~((g * a * a1 + clr_g * clr_a) * inv);
        this.pixels[pos++] = ~~((b * a * a1 + clr_b * clr_a) * inv);
        this.pixels[pos++] = ~~(res * 255);

        return pos;
    }

    _blendPixel(pos, color, a, clr_a) {
        return this._blendPixel_rgb(pos, a, color.r, color.g, color.b, clr_a);
    }

    setPixel(x, y, color) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!this.inBounds(x, y)) {
            return;
        }

        this.setPixel_u(x, y, color);
    }

    setPixel_u(x, y, color) {
        let pos = 4 * (y * this.w + x);

        const a = this.pixels[pos + 3],
            clr_a = color.a;

        if (a === 0 || clr_a === 255) {
            this.pixels[pos++] = color.r;
            this.pixels[pos++] = color.g;
            this.pixels[pos++] = color.b;
            this.pixels[pos++] = clr_a;
        } else {
            this._blendPixel(pos, color, a, clr_a);
        }
    }

    setPixel_u_rgb(x, y, r, g, b, a) {
        let pos = 4 * (y * this.w + x);

        this.pixels[pos++] = r;
        this.pixels[pos++] = g;
        this.pixels[pos++] = b;

        if (typeof a === "number") {
            this.pixels[pos] = a;
        }
    }

    clear(color) {
        let i = 0;

        while (i < this.pixels.length) {
            this.pixels[i++] = color.r;
            this.pixels[i++] = color.g;
            this.pixels[i++] = color.b;
            this.pixels[i++] = color.a;
        }
    }

    flipHorizontal() {
        const w = this.w / 2,
            yi = 4 * (this.w - 1);

        let x = 0,
            y,
            tmp;

        let pos1 = 0,
            pos2 = 4 * (this.w - 1);

        for (; x < w; x++) {
            for (y = 0; y < this.h; y++) {
                tmp = this.pixels[pos1];
                this.pixels[pos1++] = this.pixels[pos2];
                this.pixels[pos2++] = tmp;

                tmp = this.pixels[pos1];
                this.pixels[pos1++] = this.pixels[pos2];
                this.pixels[pos2++] = tmp;

                tmp = this.pixels[pos1];
                this.pixels[pos1++] = this.pixels[pos2];
                this.pixels[pos2++] = tmp;

                tmp = this.pixels[pos1];
                this.pixels[pos1++] = this.pixels[pos2];
                this.pixels[pos2++] = tmp;

                pos1 += yi;
                pos2 += yi;
            }

            pos1 = 4 * x;
            pos2 = 4 * (this.w - x - 2);
        }
    }

    flipVertical() {
        const w = 4 * this.w,
            h = this.h / 2,
            yi = -2 * w;

        let y = 0,
            x,
            tmp;

        let pos1 = 0,
            pos2 = this.pixels.length - 4 * this.w;

        for (; y < h; y++) {
            for (x = 0; x < w; x++) {
                tmp = this.pixels[pos1];
                this.pixels[pos1++] = this.pixels[pos2];
                this.pixels[pos2++] = tmp;
            }

            pos2 += yi;
        }
    }

    rotate180() {
        let pos1 = 0,
            pos2 = this.pixels.length - 4;

        let max = this.pixels.length / 2,
            tmp;

        while (pos1 < max) {
            tmp = this.pixels[pos1];
            this.pixels[pos1++] = this.pixels[pos2];
            this.pixels[pos2++] = tmp;

            tmp = this.pixels[pos1];
            this.pixels[pos1++] = this.pixels[pos2];
            this.pixels[pos2++] = tmp;

            tmp = this.pixels[pos1];
            this.pixels[pos1++] = this.pixels[pos2];
            this.pixels[pos2++] = tmp;

            tmp = this.pixels[pos1];
            this.pixels[pos1++] = this.pixels[pos2];
            this.pixels[pos2++] = tmp;

            pos2 -= 8;
        }
    }

    rotate90(direction) {
        const pixels2 = new Uint8Array(Image.getBufSize(this));

        switch (direction) {
            case 0:
                {
                    const yi = 4 * (this.h - 1);

                    let y = 0,
                        x;

                    let pos1 = 0,
                        pos2 = yi;

                    for (; y < this.h; y++) {
                        for (x = 0; x < this.w; x++) {
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];

                            pos2 += yi;
                        }

                        pos2 = 4 * (this.h - y - 2);
                    }
                }

                break;
            case 1:
                {
                    const yi = -4 * (this.h + 1);

                    let y = 0,
                        x;

                    let pos1 = 0,
                        pos2 = this.pixels.length + yi + 4;

                    for (; y < this.h; y++) {
                        for (x = 0; x < this.w; x++) {
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];

                            pos2 += yi;
                        }

                        pos2 = this.pixels.length - 4 * (this.h - y - 1);
                    }
                }

                break;
            default:
                return;
        }

        let tmp = this.w;
        this.w = this.h;
        this.h = tmp;

        this.pixels = pixels2;
    }

    fill(x1, y1, x2, y2, color) {
        if ((x1 < 0 && x2 < 0) || (x1 > this.w && x2 > this.w) || (y1 < 0 && y2 < 0) || (y1 > this.h && y2 > this.h)) {
            return;
        }

        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = this.clamp(x2, y2);

        const w = Math.abs(x2 - x1) + 1,
            h = Math.abs(y2 - y1) + 1;

        let tmp;
        const clr_a = color.a;

        if (w === 1 && h === 1) {
            this.setPixel_u(x1, y1, color);
        } else if (h === 1) {
            let pos1 = 4 * (y1 * this.w + x1),
                pos2 = 4 * (y2 * this.w + x2);

            if (pos1 > pos2) {
                tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while (pos1 <= pos2) {
                const a = this.pixels[pos1 + 3];

                if (a === 0 || clr_a === 255) {
                    this.pixels[pos1++] = color.r;
                    this.pixels[pos1++] = color.g;
                    this.pixels[pos1++] = color.b;
                    this.pixels[pos1++] = clr_a;
                } else {
                    pos1 = this._blendPixel(pos1, color, a, clr_a);
                }
            }
        } else if (w === 1) {
            const yi = 4 * (this.w - 1);

            let pos1 = 4 * (y1 * this.w + x1),
                pos2 = 4 * (y2 * this.w + x2);

            if (pos1 > pos2) {
                tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while (pos1 <= pos2) {
                const a = this.pixels[pos1 + 3];

                if (a === 0 || clr_a === 255) {
                    this.pixels[pos1++] = color.r;
                    this.pixels[pos1++] = color.g;
                    this.pixels[pos1++] = color.b;
                    this.pixels[pos1++] = clr_a;
                } else {
                    pos1 = this._blendPixel(pos1, color, a, clr_a);
                }

                pos1 += yi;
            }
        } else {
            if (x1 > x2) {
                tmp = x1;
                x1 = x2;
                x2 = tmp;
            }

            if (y1 > y2) {
                tmp = y1;
                y1 = y2;
                y2 = tmp;
            }

            const yi = 4 * (this.w - w);

            let i = 0,
                j;

            let pos = 4 * (y1 * this.w + x1);

            for (; i < h; i++) {
                for (j = 0; j < w; j++) {
                    const a = this.pixels[pos + 3];

                    if (a === 0 || clr_a === 255) {
                        this.pixels[pos++] = color.r;
                        this.pixels[pos++] = color.g;
                        this.pixels[pos++] = color.b;
                        this.pixels[pos++] = clr_a;
                    } else {
                        pos = this._blendPixel(pos, color, a, clr_a);
                    }
                }

                pos += yi;
            }
        }
    }

    blit(x1, y1, src, x2 = 0, y2 = 0, w, h) {
        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = src.clamp(x2, y2);

        w = Math.floor(w);
        h = Math.floor(h);

        let sw = Math.min(w, src.w) || src.w,
            sh = Math.min(h, src.h) || src.h;

        if (sw + x1 >= this.w) sw = this.w - x1;
        if (sw + x2 >= src.w) sw = src.w - x2;

        if (sh + y1 >= this.h) sh = this.h - y1;
        if (sh + y2 >= src.h) sh = src.h - y2;

        const yi1 = 4 * (this.w - sw),
            yi2 = 4 * (src.w - sw);

        let i = 0,
            j;

        let pos1 = 4 * (y1 * this.w + x1),
            pos2 = 4 * (y2 * src.w + x2);

        for (; i < sh; i++) {
            for (j = 0; j < sw; j++) {
                this.pixels[pos1++] = src.pixels[pos2++];
                this.pixels[pos1++] = src.pixels[pos2++];
                this.pixels[pos1++] = src.pixels[pos2++];
                this.pixels[pos1++] = src.pixels[pos2++];
            }

            pos1 += yi1;
            pos2 += yi2;
        }
    }

    overlap(x, y, src, w, h) {
        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = src.clamp(x2, y2);

        w = Math.floor(w);
        h = Math.floor(h);

        let sw = Math.min(w, src.w) || src.w,
            sh = Math.min(h, src.h) || src.h;

        if (sw + x1 >= this.w) sw = this.w - x1;
        if (sw + x2 >= src.w) sw = src.w - x2;

        if (sh + y1 >= this.h) sh = this.h - y1;
        if (sh + y2 >= src.h) sh = src.h - y2;

        const yi1 = 4 * (this.w - sw),
            yi2 = 4 * (src.w - sw);

        let i = 0,
            j;

        let pos1 = 4 * (y1 * this.w + x1),
            pos2 = 4 * (y2 * src.w + x2);

        for (; i < sh; i++) {
            for (j = 0; j < sw; j++) {
                const a = this.pixels[pos1 + 3],
                    clr_a = src.pixels[pos2 + 3];

                if (a === 0 || clr_a === 255) {
                    this.pixels[pos1++] = src.pixels[pos2++];
                    this.pixels[pos1++] = src.pixels[pos2++];
                    this.pixels[pos1++] = src.pixels[pos2++];
                    this.pixels[pos1++] = src.pixels[pos2++];
                } else {
                    pos1 = this._blendPixel_rgb(
                        pos1,
                        a,
                        src.pixels[pos2++],
                        src.pixels[pos2++],
                        src.pixels[pos2++],
                        clr_a
                    );
                    pos2++;
                }
            }

            pos1 += yi1;
            pos2 += yi2;
        }
    }

    scale(w, h) {
        if (typeof h === "undefined") {
            const x = w;

            w = this.w * x;
            h = this.h * x;
        }

        w = Math.floor(w);
        h = Math.floor(h);

        if (w === this.w && h === this.h) {
            return;
        }

        const pixels2 = new Uint8Array(Image.getBufSize(w, h));

        let i = 0,
            j;

        for (; i < h; i++) {
            for (j = 0; j < w; j++) {
                const x = Math.floor((j / w) * this.w),
                    y = Math.floor((i / h) * this.h);

                let pos1 = 4 * (i * w + j),
                    pos2 = 4 * (y * this.w + x);

                pixels2[pos1] = this.pixels[pos2];
                pixels2[pos1 + 1] = this.pixels[pos2 + 1];
                pixels2[pos1 + 2] = this.pixels[pos2 + 2];
                pixels2[pos1 + 3] = this.pixels[pos2 + 3];
            }
        }

        this.pixels = pixels2;
        this.w = w;
        this.h = h;
    }

    clip(x, y, w, h) {
        [x, y] = this.clamp(x1, y1);

        w = Math.floor(w);
        h = Math.floor(h);

        if (w + x >= this.w) {
            w = this.w - x;
        }

        if (h + y >= this.h) {
            h = this.h - y;
        }

        const pixels2 = new Uint8Array(Image.getBufSize(w, h));

        const yi = 4 * (this.w - w);

        let i = 0,
            j;

        let pos1 = 0,
            pos2 = 4 * (y * this.w + x);

        for (; i < h; i++) {
            for (j = 0; j < w; j++) {
                pixels2[pos1++] = this.pixels[pos2++];
                pixels2[pos1++] = this.pixels[pos2++];
                pixels2[pos1++] = this.pixels[pos2++];
                pixels2[pos1++] = this.pixels[pos2++];
            }

            pos2 += yi;
        }

        this.pixels = pixels2;
        this.w = w;
        this.h = h;
    }

    invert(alpha = false) {
        let i = 0;

        if (alpha) {
            for (; i < this.pixels.length; i++) {
                this.pixels[i] = 255 - this.pixels[i];
            }
        } else {
            for (; i < this.pixels.length; i += 4) {
                this.pixels[i] = 255 - this.pixels[i];
                this.pixels[i + 1] = 255 - this.pixels[i + 1];
                this.pixels[i + 2] = 255 - this.pixels[i + 2];
            }
        }
    }

    removeChannel(channel) {
        let i = 0,
            zero = true;

        switch (channel) {
            case "r":
                break;
            case "g":
                i = 1;
                break;
            case "b":
                i = 2;
                break;
            case "a":
                i = 3;
                zero = false;
                break;
            default:
                return;
        }

        if (zero) {
            for (; i < this.pixels.length; i += 4) {
                this.pixels[i] = 0;
            }
        } else {
            for (; i < this.pixels.length; i += 4) {
                this.pixels[i] = 255;
            }
        }
    }

    fillRadius(x, y, r, color) {
        r = Math.round(2 * r) / 2;

        if (Math.floor(r) === 0) {
            this.setPixel(x, y, color);
            return;
        }

        const x1 = x - r + 1,
            y1 = y - r + 1;

        const x2 = x + r,
            y2 = y + r;

        this.fill(x1, y1, x2, y2, color);
    }

    drawFrame(x1, y1, x2, y2, color) {
        if ((x1 < 0 && x2 < 0) || (x1 > this.w && x2 > this.w) || (y1 < 0 && y2 < 0) || (y1 > this.h && y2 > this.h)) {
            return;
        }

        let tmp;

        if (x1 > x2) {
            tmp = x1;
            x1 = x2;
            x2 = tmp;
        }

        if (y1 > y2) {
            tmp = y1;
            y1 = y2;
            y2 = tmp;
        }

        const w = x2 - x1 + 1,
            h = y2 - y1 + 1;

        if (w === 1 && h === 1) {
            this.setPixel(x1, y1, color);
            return;
        } else if (w === 1 || h === 1) {
            this.setPixel(x1, y1, color);
            this.setPixel(x2, y2, color);
        } else {
            this.setPixel(x1, y1, color);
            this.setPixel(x1, y2, color);
            this.setPixel(x2, y1, color);
            this.setPixel(x2, y2, color);
        }

        if (w >= 3) {
            this.fill(x1 + 1, y1, x2 - 1, y1, color);
            this.fill(x1 + 1, y2, x2 - 1, y2, color);
        }

        if (h >= 3) {
            this.fill(x1, y1 + 1, x1, y2 - 1, color);
            this.fill(x2, y1 + 1, x2, y2 - 1, color);
        }
    }

    drawFrameRadius(x, y, r, color) {
        r = Math.round(2 * r) / 2;

        if (Math.floor(r) === 0) {
            this.setPixel(x, y, color);
            return;
        }

        const x1 = x - r + 1,
            y1 = y - r + 1;

        const x2 = x + r,
            y2 = y + r;

        this.drawFrame(x1, y1, x2, y2, color);
    }

    _clampLiangBarsky(x0src, y0src, x1src, y1src) {
        if (this.inBounds(x0src, y0src) && this.inBounds(x1src, y1src)) {
            return [Math.floor(x0src), Math.floor(y0src), Math.floor(x1src), Math.floor(y1src)];
        }

        const edgeLeft = 0,
            edgeRight = this.w,
            edgeBottom = 0,
            edgeTop = this.h;

        const xdelta = x1src - x0src,
            ydelta = y1src - y0src;

        let t0 = 0.0,
            t1 = 1.0;

        let p, q, r;

        for (let edge = 0; edge < 4; edge++) {
            switch (edge) {
                case 0:
                    p = -xdelta;
                    q = -(edgeLeft - x0src);
                    break;
                case 1:
                    p = xdelta;
                    q = edgeRight - x0src;
                    break;
                case 2:
                    p = -ydelta;
                    q = -(edgeBottom - y0src);
                    break;
                case 3:
                    p = ydelta;
                    q = edgeTop - y0src;
                    break;
            }

            r = q / p;

            if (p === 0 && q < 0) {
                return false;
            }

            if (p < 0) {
                if (r > t1) {
                    return false;
                } else if (r > t0) {
                    t0 = r;
                }
            } else if (p > 0) {
                if (r < t0) {
                    return false;
                } else if (r < t1) {
                    t1 = r;
                }
            }
        }

        const x0clip = Math.floor(x0src + t0 * xdelta),
            y0clip = Math.floor(y0src + t0 * ydelta),
            x1clip = Math.floor(x0src + t1 * xdelta),
            y1clip = Math.floor(y0src + t1 * ydelta);

        return [x0clip, y0clip, x1clip, y1clip];
    }

    drawLine(x1, y1, x2, y2, color) {
        if (x1 === x2 && y1 === y2) {
            this.setPixel(x1, y1, color);
            return;
        }

        const coords = this._clampLiangBarsky(x1, y1, x2, y2);

        if (!coords) {
            return;
        }

        [x1, y1, x2, y2] = coords;

        let dx = x2 - x1,
            dy = y2 - y1;

        let tmp;
        const clr_a = color.a;

        if (dx === 0 && dy === 0) {
            this.setPixel_u(x1, y1, color);
        } else if (dy === 0) {
            let pos1 = 4 * (y1 * this.w + x1),
                pos2 = 4 * (y2 * this.w + x2);

            if (pos1 > pos2) {
                tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while (pos1 <= pos2) {
                const a = this.pixels[pos1 + 3];

                if (a === 0 || clr_a === 255) {
                    this.pixels[pos1++] = color.r;
                    this.pixels[pos1++] = color.g;
                    this.pixels[pos1++] = color.b;
                    this.pixels[pos1++] = clr_a;
                } else {
                    pos1 = this._blendPixel(pos1, color, a, clr_a);
                }
            }
        } else if (dx === 0) {
            const yi = 4 * (this.w - 1);

            let pos1 = 4 * (y1 * this.w + x1),
                pos2 = 4 * (y2 * this.w + x2);

            if (pos1 > pos2) {
                tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while (pos1 <= pos2) {
                const a = this.pixels[pos1 + 3];

                if (a === 0 || clr_a === 255) {
                    this.pixels[pos1++] = color.r;
                    this.pixels[pos1++] = color.g;
                    this.pixels[pos1++] = color.b;
                    this.pixels[pos1++] = clr_a;
                } else {
                    pos1 = this._blendPixel(pos1, color, a, clr_a);
                }

                pos1 += yi;
            }
        } else if (Math.abs(dy) < Math.abs(dx)) {
            if (x1 > x2) {
                tmp = x2;
                x2 = x1;
                x1 = tmp;

                tmp = y2;
                y2 = y1;
                y1 = tmp;

                dx = -dx;
                dy = -dy;
            }

            let yi = 4 * this.w;

            if (dy < 0) {
                yi = -yi;
                dy = -dy;
            }

            let err = 2 * dy - dx,
                derr1 = -2 * dx,
                derr2 = 2 * dy;

            let pos = 4 * (y1 * this.w + x1);

            for (; x1 <= x2; x1++) {
                const a = this.pixels[pos + 3];

                if (a === 0 || clr_a === 255) {
                    this.pixels[pos++] = color.r;
                    this.pixels[pos++] = color.g;
                    this.pixels[pos++] = color.b;
                    this.pixels[pos++] = clr_a;
                } else {
                    pos = this._blendPixel(pos, color, a, clr_a);
                }

                if (err >= 0) {
                    pos += yi;
                    err += derr1;
                }

                err += derr2;
            }
        } else {
            if (y1 > y2) {
                tmp = x2;
                x2 = x1;
                x1 = tmp;

                tmp = y2;
                y2 = y1;
                y1 = tmp;

                dx = -dx;
                dy = -dy;
            }

            let xi = 4,
                yi = 4 * (this.w - 1);

            if (dx < 0) {
                xi = -xi;
                dx = -dx;
            }

            let err = 2 * dx - dy,
                derr1 = -2 * dy,
                derr2 = 2 * dx;

            let pos = 4 * (y1 * this.w + x1);

            for (; y1 <= y2; y1++) {
                const a = this.pixels[pos + 3];

                if (a === 0 || clr_a === 255) {
                    this.pixels[pos++] = color.r;
                    this.pixels[pos++] = color.g;
                    this.pixels[pos++] = color.b;
                    this.pixels[pos++] = clr_a;
                } else {
                    pos = this._blendPixel(pos, color, a, clr_a);
                }

                if (err >= 0) {
                    pos += xi;
                    err += derr1;
                }

                err += derr2;
                pos += yi;
            }
        }
    }

    drawLineThick(x1, y1, x2, y2, color, thickness) {
        const thick2 = Math.floor(thickness / 2);

        const dx = Math.abs(x2 - x1),
            dy = Math.abs(y2 - y1);

        if (dy < dx) {
            for (let i = -thick2; i <= thick2; i++) {
                this.drawLine(x1, y1 + i, x2, y2 + i, color);
            }
        } else {
            for (let i = -thick2; i <= thick2; i++) {
                this.drawLine(x1 + i, y1, x2 + i, y2, color);
            }
        }
    }

    drawTriangle(x1, y1, x2, y2, x3, y3, color) {
        this.drawLine(x1, y1, x2, y2, color);
        this.drawLine(x2, y2, x3, y3, color);
        this.drawLine(x3, y3, x1, y1, color);
    }

    _interpolate(x1, y1, x2, y2, y) {
        if (y2 === y1) {
            return x1;
        }

        return x1 + ((x2 - x1) * (y - y1)) / (y2 - y1);
    }

    fillTriangle(x1, y1, x2, y2, x3, y3, color) {
        if (
            (x1 < 0 && x2 < 0 && x3 < 0) ||
            (x1 > this.w && x2 > this.w && x3 > this.w) ||
            (y1 < 0 && y2 < 0 && y3 < 0) ||
            (y1 > this.h && y2 > this.h && y3 > this.h)
        ) {
            return;
        }

        const points = [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
            { x: x3, y: y3 }
        ].sort((a, b) => a.y - b.y);

        ({ x: x1, y: y1 } = points[0]);
        ({ x: x2, y: y2 } = points[1]);
        ({ x: x3, y: y3 } = points[2]);

        for (let y = y1; y <= y3; y++) {
            let xLeft, xRight;

            if (y < y2) {
                xLeft = this._interpolate(x1, y1, x2, y2, y);
                xRight = this._interpolate(x1, y1, x3, y3, y);
            } else {
                xLeft = this._interpolate(x2, y2, x3, y3, y);
                xRight = this._interpolate(x1, y1, x3, y3, y);
            }

            xLeft = Math.round(xLeft);
            xRight = Math.round(xRight);

            this.fill(Math.min(xLeft, xRight), y, Math.max(xLeft, xRight), y, color);
        }
    }

    _circlePoints(xc, yc, x, y, color) {
        this.setPixel(xc + x, yc + y, color);
        this.setPixel(xc - x, yc + y, color);
        this.setPixel(xc + x, yc - y, color);
        this.setPixel(xc - x, yc - y, color);

        if (Math.abs(x - y) > 2) {
            this.setPixel(xc + y, yc + x, color);
            this.setPixel(xc - y, yc + x, color);
            this.setPixel(xc + y, yc - x, color);
            this.setPixel(xc - y, yc - x, color);
        }
    }

    drawCircle(xc, yc, r, color) {
        r = Math.round(r);

        if (r === 0) {
            this.setPixel(xc, yc, color);
            return;
        }

        const left = xc - r,
            right = xc + r,
            up = yc - r,
            down = yc + r;

        if (right < 0 || left > this.w || down < 0 || up > this.h) {
            return;
        }

        xc = Math.floor(xc);
        yc = Math.floor(yc);

        this.setPixel(left, yc, color);
        this.setPixel(right, yc, color);
        this.setPixel(xc, up, color);
        this.setPixel(xc, down, color);

        let x = 0,
            y = r,
            d = 3 - 2 * r;

        while (y >= x) {
            x++;

            if (d > 0) {
                y--;
                d += 4 * (x - y) + 10;
            } else {
                d += 4 * x + 6;
            }

            this._circlePoints(xc, yc, x, y, color);
        }
    }

    _circleLines(xc, yc, x, y, color, dx) {
        this.fill(xc + x, yc + y, xc - x, yc + y, color);
        this.fill(xc + x, yc - y, xc - x, yc - y, color);

        if (Math.abs(x - y) > 2 && dx) {
            this.fill(xc + y, yc + x, xc - y, yc + x, color);
            this.fill(xc + y, yc - x, xc - y, yc - x, color);
        }
    }

    fillCircle(xc, yc, r, color) {
        r = Math.round(r);

        if (r === 0) {
            this.setPixel(xc, yc, color);
            return;
        }

        const left = xc - r,
            right = xc + r;

        if (right < 0 || left > this.w || yc + r < 0 || yc - r > this.h) {
            return;
        }

        xc = Math.floor(xc);
        yc = Math.floor(yc);

        this.fill(left, yc, right, yc, color);

        let x = r,
            y = 0,
            d = 3 - 2 * r;

        let dx = d > 0;

        while (x >= y) {
            y++;

            if (dx) {
                x--;
                d = d + 4 * (y - x) + 10;
            } else {
                d = d + 4 * y + 6;
            }

            dx = d > 0;
            this._circleLines(xc, yc, x, y, color, dx);
        }
    }

    drawPoints(points, color, size) {
        if (points.length % 2 !== 0) {
            throw new DrawingError("Invalid points array");
        }

        let pixel = this.setPixel;
        if (size) {
            pixel = this.fillRadius;
        }

        pixel = pixel.bind(this);

        for (let i = 0; i < points.length; i += 2) {
            pixel(points[i], points[i + 1], color, size);
        }
    }

    drawGrid(grid, color) {
        for (let i = 0; i <= grid.xDiv; i++) {
            let x1, y2;

            for (let j = 0; j < grid.yDiv; j++) {
                x1 = grid.x + i * grid.xMult;

                const y1 = grid.y + j * grid.yMult;
                y2 = grid.y + (j + 1) * grid.yMult - 1;

                this.drawLine(x1, y1, x1, y2, color);
            }

            if (i !== grid.xDiv) {
                for (let j = 0; j <= grid.yDiv; j++) {
                    const x2 = grid.x + i * grid.xMult + 1,
                        y1 = grid.y + j * grid.yMult,
                        x3 = grid.x + (i + 1) * grid.xMult - 1;

                    this.drawLine(x2, y1, x3, y1, color);
                }
            }

            this.setPixel(x1, y2 + 1, color);
        }
    }

    drawString(x, y, str, font) {
        let x_of = 0,
            h = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (char === "\n") {
                continue;
            }

            const glyph = font.getGlyph(char);
            this.blit(x + x_of, y, glyph);

            x_of += glyph.w + font.spacing;
            h = Math.max(h, glyph.h);
        }

        const w = x_of - font.spacing;
        return [w, h];
    }
}

const DigitFont = new Font(f_1);
module.exports = { Color, Point, Grid, Font, Colors, f_1, DigitFont, Image };
