// utils
const Utils = {
    clamp: (x, a, b) => {
        return Math.max(Math.min(x, b), a);
    },

    push_n: function (array, n, ...val) {
        for (let i = 0; i < n; i++) {
            array.push(...val);
        }
    },

    findMult: function (str, start) {
        let end = str.indexOf("}", start),
            num;

        if (end) {
            num = str.slice(start, end);
            num = Number.parseInt(num);
        }

        return [end, num];
    },

    padding: function (a, b) {
        const len = a.toString().length - b.toString().length;
        return len > 0 ? Array(len).fill(" ").join("") : "";
    },

    getClassSigs: function (obj) {
        const src = obj.toString(),
            regex = /^\s{4}((?:static\s)?\w+\s*\((?:.+\)?))\s{/gm;

        let sigs = [],
            match;

        while ((match = regex.exec(src))) {
            sigs.push(match[1]);
        }

        return sigs;
    },

    genDesc: function (header, vals, descDict) {
        const noDesc = "NO DESCRIPTION PROVIDED / WIP",
            nameRegex = /(?:static\s)?(.+)\(/;

        let desc = "",
            skip = 0;

        for (let i = 0; i < vals.length; i++) {
            let name = vals[i];

            if (name.includes("(")) {
                name = name.match(nameRegex)[1];
            }

            if (name.startsWith("_")) {
                skip++;
                continue;
            }

            let title = `    ${i - skip + 1}. ${vals[i]} - `,
                varDesc = descDict[name];

            varDesc = !varDesc || varDesc instanceof Function ? noDesc : varDesc;

            if (varDesc.includes("\n")) {
                const padding = Array(title.length).fill(" ").join("");
                varDesc = varDesc.split("\n").join("\n" + padding);
            }

            desc += "\n" + title + varDesc;
        }

        return `${header}:${desc}`;
    }
};

class Benchmark {
    static data = Object.create(null);
    static timepoints = new Map();

    static timeToUse = (_ => {
        if (typeof performance !== "undefined") {
            return "performanceNow";
        }

        if (typeof vm !== "undefined") {
            return "vmTime";
        }

        return "dateNow";
    })();

    static ns_per_ms = 10n ** 6n;

    static getCurrentTime() {
        switch (this.timeToUse) {
            case "performanceNow":
                return performance.now();
            case "vmTime":
                return vm.getWallTime();
            case "dateNow":
                return Date.now();
        }
    }

    static startTiming(key) {
        key = this._formatKey(key);

        const t1 = this.getCurrentTime();
        this.timepoints.set(key, t1);
    }

    static stopTiming(key) {
        key = this._formatKey(key);
        const t1 = this.timepoints.get(key);

        if (typeof t1 === "undefined") {
            return;
        }

        this.timepoints.delete(key);

        let t2 = this.getCurrentTime(),
            dt = t2 - t1;

        switch (this.timeToUse) {
            case "performanceNow":
                dt = Math.floor(dt);
                break;
            case "vmTime":
                dt = Number(dt / this.ns_per_ms);
                break;
            case "dateNow":
                break;
        }

        this.data[key] = dt;
    }

    static getTime(key) {
        key = this._formatKey(key);
        const time = this.data[key];

        if (typeof time === "undefined") {
            return "Key not found";
        }

        return this._formatTime(key, time);
    }

    static deleteTime(key) {
        key = this._formatKey(key);
        this.timepoints.delete(key);

        if (key in this.data) {
            delete this.data[key];
            return true;
        }

        return false;
    }

    static clear() {
        for (const key of Object.keys(this.data)) {
            delete this.data[key];
        }

        this.timepoints.clear();
    }

    static clearExcept(...keys) {
        const clearKeys = Object.keys(this.data).filter(key => !keys.includes(key));

        for (const key of clearKeys) {
            delete this.data[key];
        }

        this.timepoints.clear();
    }

    static clearExceptLast(n = 1) {
        const clearKeys = Object.keys(this.data).slice(0, -n);

        for (const key of clearKeys) {
            delete this.data[key];
        }

        this.timepoints.clear();
    }

    static getSum(...keys) {
        let sumTimes;

        if (keys.length > 0) {
            sumTimes = keys.map(key => this.data[key]).filter(time => typeof time !== "undefined");
        } else {
            sumTimes = Object.values(this.data);
        }

        return sumTimes.reduce((a, b) => a + b, 0);
    }

    static getAll(...includeSum) {
        const times = Object.keys(this.data).map(key => this.getTime(key));

        if (includeSum[0]) {
            const keys = includeSum[0] === true ? [] : includeSum,
                sum = this.getSum(...keys);

            times.push(this._formatTime("sum", sum));
        }

        return times.join(",\n");
    }

    static _formatTime(key, time) {
        return `${key}: ${time.toLocaleString()}ms`;
    }

    static _formatKey(key) {
        switch (typeof key) {
            case "number":
                return key.toString();
            case "string":
                return key;
            default:
                throw new Error("Time keys must be strings");
        }
    }
}

// errors
class CustomError extends Error {
    constructor(message = "", ...args) {
        super(message, ...args);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class DrawingError extends CustomError {}
class EncoderError extends CustomError {}
class ExitError extends CustomError {}
class OptionParserError extends CustomError {}
class ChecksumError extends CustomError {}

// structs
class Color {
    constructor(r, g, b) {
        if (r instanceof Color) {
            const clr = r;

            this.r = clr.r;
            this.g = clr.g;
            this.b = clr.b;

            return this;
        }

        this.r = Utils.clamp(Math.round(r), 0, 255);
        this.g = Utils.clamp(Math.round(g), 0, 255);
        this.b = Utils.clamp(Math.round(b), 0, 255);
    }

    toString() {
        return `Color: {${this.r}, ${this.g}, ${this.b}}`;
    }

    equals(clr) {
        return this.r === clr.r && this.g === clr.g && this.b === clr.b;
    }

    approxEquals(clr, tolerance = 2) {
        const distance = Math.sqrt(
            (this.r - clr.r) * (this.r - clr.r) +
                (this.g - clr.g) * (this.g - clr.g) +
                (this.b - clr.b) * (this.b - clr.b)
        );

        return distance <= tolerance;
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
        h = Utils.clamp(h || 0, 0, 360);
        s = Utils.clamp(s || 0, 0, 1);
        v = Utils.clamp(v || 0, 0, 1);

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

    //add operators
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

// encoding
class CRC32 {
    constructor() {
        if (typeof CRC32.table === "undefined") {
            CRC32.table = CRC32.generateTable();
        }

        this.crc = 0 ^ -1;
    }

    static generateTable() {
        const polynomial = 0xedb88320,
            table = new Int32Array(256);

        for (let i = 0; i < 256; i++) {
            let crc = i;

            for (let bit = 0; bit < 8; bit++) {
                if (crc & 1) {
                    crc = polynomial ^ (crc >>> 1);
                } else {
                    crc = crc >>> 1;
                }
            }

            table[i] = crc;
        }

        return table;
    }

    get value() {
        return (this.crc ^ -1) >>> 0;
    }

    updateByte(byte) {
        if (typeof byte !== "number") {
            throw new ChecksumError("Byte has to be a number");
        }

        byte |= 0;

        const x = CRC32.table[(this.crc ^ byte) & 0xff];
        this.crc = (this.crc >>> 8) ^ x;

        return this.value;
    }

    calculate(bytes, start = 0, end) {
        if (typeof start !== "number") {
            throw new ChecksumError("Start index has to be a number");
        }

        if (start % 1 !== 0 || start < 0) {
            throw new ChecksumError("Invalid start position");
        }

        if (typeof end === "undefined") {
            end = bytes.length;
        } else if (typeof end !== "number") {
            throw new ChecksumError("End index has to be a number");
        }

        if (end % 1 !== 0 || end < 0) {
            throw new ChecksumError("Invalid end position");
        }

        for (let i = start; i < end; i++) {
            const byte = bytes[i] | 0,
                x = CRC32.table[(this.crc ^ byte) & 0xff];

            this.crc = (this.crc >>> 8) ^ x;
        }

        return this.value;
    }
}

class Adler32 {
    constructor() {
        this.a = 1;
        this.b = 0;
    }

    get value() {
        const sum = (this.b << 16) | this.a;
        return sum >>> 0;
    }

    updateByte(byte) {
        if (typeof byte !== "number") {
            throw new ChecksumError("Byte has to be a number");
        }

        byte |= 0;

        this.a += byte;
        this.b += this.a;

        this.a %= 65521;
        this.b %= 65521;

        return this.value;
    }

    calculate(bytes, start = 0, end) {
        if (typeof start !== "number") {
            throw new ChecksumError("Start index has to be a number");
        }

        if (start % 1 !== 0 || start < 0) {
            throw new ChecksumError("Invalid start position");
        }

        if (typeof end === "undefined") {
            end = bytes.length;
        } else if (typeof end !== "number") {
            throw new ChecksumError("End index has to be a number");
        }

        if (end % 1 !== 0 || end < 0) {
            throw new ChecksumError("Invalid end position");
        }

        let len = end,
            i = start;

        while (len) {
            let chunkLen = Math.min(len, 4096);
            len -= chunkLen;

            while (chunkLen--) {
                this.a += bytes[i++];
                this.b += this.a;
            }

            this.a %= 65521;
            this.b %= 65521;
        }

        return this.value;
    }
}

class Buffer2 extends Uint8Array {
    static alloc(size) {
        return new Buffer2(size);
    }

    toString() {
        let str = `Buffer2 Size: ${this.length} bytes`;
        let len = this.length,
            i = 0;

        while (len) {
            let chunkLen = Math.min(len, 32);
            len -= chunkLen;

            str += `\n${i} - [ `;

            while (chunkLen--) {
                let hex = this[i++].toString(16);
                str += ("0" + hex).slice(-2) + " ";
            }

            str += `] - ${i - 1}`;
        }

        return str;
    }

    inspect(depth, opts) {
        return this.toString();
    }

    writeUInt32BE(value, offset) {
        this[offset] = (value >> 24) & 0xff;
        this[offset + 1] = (value >> 16) & 0xff;
        this[offset + 2] = (value >> 8) & 0xff;
        this[offset + 3] = value & 0xff;
    }

    writeUInt16LE(value, offset) {
        this[offset] = value & 0xff;
        this[offset + 1] = (value >> 8) & 0xff;
    }

    write(value, offset, a) {
        for (let i = 0; i < value.length; i++) {
            let code = value.charCodeAt(i);
            code &= 0xff;
            this[offset++] = code;
        }
    }

    blit(src, offset, start, length) {
        if (offset >= this.length || start >= src.length) {
            return;
        }

        if (length + offset >= this.length || length + start >= src.length) {
            length = Math.min(this.length - offset, src.length - start);
        }

        for (let i = 0; i < length; i++) {
            this[i + offset] = src[i + start] & 0xff;
        }
    }

    writeCRC32(start, end) {
        let crc = new CRC32().calculate(this, start, end);
        this.writeUInt32BE(crc, end);
    }
}

class Zlib {
    constructor(data) {
        if (!(data instanceof Buffer2 || data instanceof Uint8Array)) {
            throw new EncoderError("Invalid data array type");
        }

        this.data = data;
    }

    blurredCompress() {
        //still need to add the compression
        const chunks = Math.ceil(this.data.length / 65535),
            buf = Buffer2.alloc(this.data.length + 6 + 5 * chunks);

        buf.write("\x78\x01", 0);

        let len = this.data.length,
            i = 2,
            doffset = 0;

        while (len) {
            let chunkLen = Math.min(len, 65535);
            len -= chunkLen;

            buf[i] = len ? 0 : 1;

            buf.writeUInt16LE(chunkLen, i + 1);
            buf.writeUInt16LE(~chunkLen, i + 3);

            buf.blit(this.data, i + 5, doffset, chunkLen);

            i += chunkLen + 5;
            doffset += chunkLen;
        }

        const checksum = new Adler32().calculate(this.data, 0, this.data.length);
        buf.writeUInt32BE(checksum, i);

        return buf;
    }

    dynamicHuffmannDeflate() {}

    nodejsDeflate() {
        const zlib = require("zlib");

        const buf = zlib.deflateSync(Buffer.from(this.data));
        this.data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }

    deflate(ctype) {
        Benchmark.startTiming("enc_compress");
        let compressed;

        switch (ctype) {
            case 0:
                compressed = this.blurredCompress();
                break;
            case 1:
                compressed = this.dynamicHuffmannDeflate();
                break;
            case 2:
                this.nodejsDeflate();
                compressed = this.data;
                break;
            default:
                throw new EncoderError("Invalid compression type");
        }

        Benchmark.stopTiming("enc_compress");
        return compressed;
    }

    inflate() {}
}

const DataTypes = {
    UInt32BE: 0,
    string: 1,
    buffer: 2,
    byte: 3
};

class ChunkPNG {
    constructor(name) {
        if (typeof name !== "string" || name.length !== 4) {
            throw new EncoderError("Invalid chunk name");
        }

        this.name = name;

        this.data = [];
        this.types = [];
    }

    addData(data, type) {
        this.data.push(data);
        this.types.push(type);
    }

    getSize() {
        let size = 12;

        for (let i = 0; i < this.data.length; i++) {
            switch (this.types[i]) {
                case DataTypes.UInt32BE:
                    size += 4;
                    break;
                case DataTypes.byte:
                    size++;
                    break;
                default:
                    size += this.data[i].length;
                    break;
            }
        }

        return size;
    }
}

class EncoderPNG {
    static signature = "\x89PNG\x0d\x0a\x1a\x0a";
    static idatFlags = "\x08\x02\x00\x00\x00";

    constructor(pixels, w, h) {
        if (!(pixels instanceof Uint8Array)) {
            throw new EncoderError("Invalid pixel array type");
        }

        if (pixels.length !== 3 * w * h) {
            throw new EncoderError("Pixel array size invalid");
        }

        this.pixels = pixels;

        this.w = w;
        this.h = h;

        this.offset = 0;
        this.chunks = [];
    }

    filterPixels() {
        Benchmark.startTiming("enc_filter");
        const buf = Buffer2.alloc(this.pixels.length + this.h);

        for (let y = 0; y < this.h; y++) {
            buf[y * this.w * 3 + y] = 1;

            for (let x = 0; x < this.w; x++) {
                let pos = 3 * (y * this.w + x);
                let pos_b = pos + y;
                let r_f, g_f, b_f;

                if (x === 0) {
                    r_f = this.pixels[pos];
                    g_f = this.pixels[pos + 1];
                    b_f = this.pixels[pos + 2];
                } else {
                    r_f = this.pixels[pos] - this.pixels[pos - 3];
                    g_f = this.pixels[pos + 1] - this.pixels[pos - 2];
                    b_f = this.pixels[pos + 2] - this.pixels[pos - 1];
                }

                buf[pos_b + 1] = r_f;
                buf[pos_b + 2] = g_f;
                buf[pos_b + 3] = b_f;
            }
        }

        this.pixels = buf;
        Benchmark.stopTiming("enc_filter");
    }

    compressPixels() {
        const zlib = new Zlib(this.pixels);
        this.pixels = zlib.deflate(0);
    }

    getChunksSize() {
        let size = 0;
        this.sizes = Array(this.chunks.length);

        for (let i = 0; i < this.chunks.length; i++) {
            const chunkSize = this.chunks[i].getSize();

            size += chunkSize;
            this.sizes[i] = chunkSize;
        }

        return size;
    }

    writeChunks() {
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i],
                size = this.sizes[i];

            this.buf.writeUInt32BE(size - 12, this.offset);
            this.buf.write(chunk.name, this.offset + 4);
            this.offset += 8;

            for (let j = 0; j < chunk.data.length && size > 0; j++) {
                switch (chunk.types[j]) {
                    case DataTypes.UInt32BE:
                        this.buf.writeUInt32BE(chunk.data[j], this.offset);
                        this.offset += 4;
                        break;
                    case DataTypes.string:
                        this.buf.write(chunk.data[j], this.offset);
                        this.offset += chunk.data[j].length;
                        break;
                    case DataTypes.buf:
                        this.buf.blit(chunk.data[j], this.offset, 0, chunk.data[j].length);
                        this.offset += chunk.data[j].length;
                        break;
                    case DataTypes.byte:
                        this.buf[this.offset++] = chunk.data[j];
                        break;
                }
            }

            this.buf.writeCRC32(this.offset - size + 8, this.offset);
            this.offset += 4;
        }
    }

    writeSignature() {
        const sigSize = EncoderPNG.signature.length;

        this.buf.write(EncoderPNG.signature, 0);
        this.offset += sigSize;
    }

    createBuffer() {
        const sigSize = EncoderPNG.signature.length;
        this.buf = new Buffer2(this.getChunksSize() + sigSize);
    }

    addChunks() {
        const ihdr = new ChunkPNG("IHDR");
        ihdr.addData(this.w, DataTypes.UInt32BE);
        ihdr.addData(this.h, DataTypes.UInt32BE);
        ihdr.addData(EncoderPNG.idatFlags, DataTypes.string);

        const idat = new ChunkPNG("IDAT");
        idat.addData(this.pixels, DataTypes.buf);

        const iend = new ChunkPNG("IEND");

        this.chunks.push(ihdr);
        this.chunks.push(idat);
        this.chunks.push(iend);
    }

    encode() {
        this.filterPixels();
        this.compressPixels();

        this.addChunks();

        this.createBuffer();

        this.writeSignature();
        this.writeChunks();

        return this.buf;
    }
}

// options
const OptionTypes = {
    empty: 0,
    int: 1,
    float: 2,
    string: 3,
    array: 4,

    number: 5,
    any: 6,
    nonempty: 7,
    joined: 3
};

class Option {
    constructor(args = {}) {
        this.val = args.val;
        this.type = args.type || OptionTypes.any;

        this.required = args.required || false;
    }

    validate(option) {
        switch (this.type) {
            case OptionTypes.any:
                return true;
            case OptionTypes.nonempty:
                return option.type !== OptionTypes.empty;
            case OptionTypes.number:
                return [OptionTypes.int, OptionTypes.float].includes(option.type);
            default:
                if (this.type.constructor === Array) {
                    return this.type.includes(option.type);
                } else {
                    return this.type === option.type;
                }
        }
    }

    getTypeName() {
        if (this.type.constructor === Array) {
            return this.type.map(x => Object.keys(OptionTypes)[x]).join("or");
        }

        return Object.keys(OptionTypes)[this.type];
    }
}

class ArgsParser {
    constructor(prefix = "-") {
        this.prefix = prefix;

        this.optionsExp = new RegExp(`${prefix}([\\w|\\d]+)\\s*(.+?\\b\\W?(?=(?:\\s${prefix}|$)))?`, "g");
        this.argsExp = /"([^"\\]*(?:\\.[^"\\]*)*)"|[^\s]+/g;
    }

    parse(str, expect = {}) {
        let options = {},
            match;

        const expectNames = Object.keys(expect);

        this.optionsExp.lastIndex = 0;

        while ((match = this.optionsExp.exec(str))) {
            let name = match[1],
                val = match[2],
                type = OptionTypes.string;

            if (!val || !val.length) {
                val = undefined;
                type = OptionTypes.empty;
            } else if (!isNaN(val)) {
                val = Number(val);

                if (Math.trunc(val) === val) {
                    type = OptionTypes.int;
                } else {
                    type = OptionTypes.float;
                }
            } else if (val.includes(" ") || val.includes('"')) {
                [val, type] = this.parseString(val, expect[name]);
            }

            options[name] = new Option({
                val,
                type
            });
        }

        expectNames.forEach(x => {
            const option = options[x],
                expected = expect[x];

            if (typeof option !== "undefined") {
                if (!expected.validate(option)) {
                    const type = expected.getTypeName();
                    throw new OptionParserError(`Option ${this.prefix}${x} is invalid. Expected type ${type}.`);
                }
            } else if (expected.required === true) {
                throw new OptionParserError(`Required option ${this.prefix}${x} not found`);
            }
        });

        return options;
    }

    parseString(str, expect) {
        let argsList = [],
            match;

        if (typeof expect !== "undefined" && expect.type === OptionTypes.joined) {
            return [str, OptionTypes.joined];
        }

        this.argsExp.lastIndex = 0;

        while ((match = this.argsExp.exec(str))) {
            if (match[1]) {
                argsList.push(match[1].replace('\\"', '"'));
            } else {
                argsList.push(match[0]);
            }
        }

        if (argsList.length === 1) {
            return [argsList[0], OptionTypes.string];
        } else {
            return [argsList, OptionTypes.array];
        }
    }
}

// image
class Image {
    static stride = 3;

    static getBufSize(w, h) {
        if (typeof w === "object") {
            const img = w;

            w = img.w;
            h = img.h;
        }

        return this.stride * w * h;
    }

    constructor(w, h) {
        if (w <= 0 || h <= 0 || w > 1920 || h > 1080) {
            throw new DrawingError("Invalid image size");
        }

        this.w = Math.floor(w);
        this.h = Math.floor(h);

        this.aspect = this.w / this.h;

        this.pixels = new Uint8Array(Image.getBufSize(this)).fill(0);
    }

    static fromPixels(pixels, w, h) {
        if (pixels.length % 3 !== 0) {
            throw new DrawingError("Pixel array is invalid");
        }

        if (pixels.length > Image.getBufSize(w, h)) {
            throw new DrawingError("Pixel array is too large");
        }

        const img = new Image(w, h);

        let i = 0;

        if (pixels instanceof Uint8Array) {
            img.pixels = pixels;
        } else {
            for (; i < pixels.length; i++) {
                img.pixels[i] = pixels[i] & 0xff;
            }
        }

        return img;
    }

    static loadFile(buf) {
        //
    }

    encode() {
        // finalize opacity
        return new EncoderPNG(this.pixels, this.w, this.h).encode();
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
        x = Utils.clamp(Math.floor(x), 0, this.w - 1);
        y = Utils.clamp(Math.floor(y), 0, this.h - 1);

        return [x, y];
    }

    getPixel(x, y) {
        x = Math.floor(x);
        y = Math.floor(y);

        if (!this.inBounds(x, y)) {
            return Colors.black;
        }

        const pos = 3 * (y * this.w + x);

        const r = this.pixels[pos],
            g = this.pixels[pos + 1],
            b = this.pixels[pos + 2];

        return new Color(r, g, b);
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
        const pos = 3 * (y * this.w + x);

        this.pixels[pos] = color.r;
        this.pixels[pos + 1] = color.g;
        this.pixels[pos + 2] = color.b;
    }

    setPixel_u_rgb(x, y, r, g, b) {
        const pos = 3 * (y * this.w + x);

        this.pixels[pos] = r;
        this.pixels[pos + 1] = g;
        this.pixels[pos + 2] = b;
    }

    clear(color) {
        let i = 0;

        while (i < this.pixels.length) {
            this.pixels[i++] = color.r;
            this.pixels[i++] = color.g;
            this.pixels[i++] = color.b;
        }
    }

    flipHorizontal() {
        const w = this.w / 2,
            yi = 3 * (this.w - 1);

        let x = 0,
            y,
            tmp;

        let pos1 = 0,
            pos2 = 3 * (this.w - 1);

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

                pos1 += yi;
                pos2 += yi;
            }

            pos1 = 3 * x;
            pos2 = 3 * (this.w - x - 2);
        }
    }

    flipVertical() {
        const w = 3 * this.w,
            h = this.h / 2,
            yi = -2 * w;

        let y = 0,
            x,
            tmp;

        let pos1 = 0,
            pos2 = this.pixels.length - 3 * this.w;

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
            pos2 = this.pixels.length - 3;

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

            pos2 -= 6;
        }
    }

    rotate90(direction) {
        const pixels2 = new Uint8Array(Image.getBufSize(this));

        switch (direction) {
            case 0:
                {
                    const yi = 3 * (this.h - 1);

                    let y = 0,
                        x;

                    let pos1 = 0,
                        pos2 = yi;

                    for (; y < this.h; y++) {
                        for (x = 0; x < this.w; x++) {
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];

                            pos2 += yi;
                        }

                        pos2 = 3 * (this.h - y - 2);
                    }
                }

                break;
            case 1:
                {
                    const yi = -3 * (this.h + 1);

                    let y = 0,
                        x;

                    let pos1 = 0,
                        pos2 = this.pixels.length + yi + 3;

                    for (; y < this.h; y++) {
                        for (x = 0; x < this.w; x++) {
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];
                            pixels2[pos2++] = this.pixels[pos1++];

                            pos2 += yi;
                        }

                        pos2 = this.pixels.length - 3 * (this.h - y - 1);
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

        let tmp;

        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = this.clamp(x2, y2);

        const w = Math.abs(x2 - x1) + 1,
            h = Math.abs(y2 - y1) + 1;

        if (w === 1 && h === 1) {
            this.setPixel_u(x1, y1, color);
        } else if (h === 1) {
            let pos1 = 3 * (y1 * this.w + x1),
                pos2 = 3 * (y2 * this.w + x2);

            if (pos1 > pos2) {
                tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while (pos1 <= pos2) {
                this.pixels[pos1++] = color.r;
                this.pixels[pos1++] = color.g;
                this.pixels[pos1++] = color.b;
            }
        } else if (w === 1) {
            const yi = 3 * (this.w - 1);

            let pos1 = 3 * (y1 * this.w + x1),
                pos2 = 3 * (y2 * this.w + x2);

            if (pos1 > pos2) {
                tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while (pos1 <= pos2) {
                this.pixels[pos1++] = color.r;
                this.pixels[pos1++] = color.g;
                this.pixels[pos1++] = color.b;

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

            const yi = 3 * (this.w - w);

            let i = 0,
                j;

            let pos = 3 * (y1 * this.w + x1);

            for (; i < h; i++) {
                for (j = 0; j < w; j++) {
                    this.pixels[pos++] = color.r;
                    this.pixels[pos++] = color.g;
                    this.pixels[pos++] = color.b;
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

        if (sw + x1 > this.w) sw = this.w - x1;
        if (sw + x2 > src.w) sw = src.w - x2;

        if (sh + y1 > this.h) sh = this.h - y1;
        if (sh + y2 > src.h) sh = src.h - y2;

        const yi1 = 3 * (this.w - sw),
            yi2 = 3 * (src.w - sw);

        let i = 0,
            j;

        let pos1 = 3 * (y1 * this.w + x1),
            pos2 = 3 * (y2 * src.w + x2);

        for (; i < sh; i++) {
            for (j = 0; j < sw; j++) {
                this.pixels[pos1++] = src.pixels[pos2++];
                this.pixels[pos1++] = src.pixels[pos2++];
                this.pixels[pos1++] = src.pixels[pos2++];
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

        let x, y;
        let pos1, pos2;

        for (; i < h; i++) {
            for (j = 0; j < w; j++) {
                x = Math.floor((j / w) * this.w);
                y = Math.floor((i / h) * this.h);

                pos1 = 3 * (i * w + j);
                pos2 = 3 * (y * this.w + x);

                pixels2[pos1] = this.pixels[pos2];
                pixels2[pos1 + 1] = this.pixels[pos2 + 1];
                pixels2[pos1 + 2] = this.pixels[pos2 + 2];
            }
        }

        this.pixels = pixels2;
        this.w = w;
        this.h = h;
    }

    clip(x, y, w, h) {
        [x, y] = this.clamp(x, y);

        w = Math.floor(w);
        h = Math.floor(h);

        if (w + x > this.w) {
            w = this.w - x;
        }

        if (h + y > this.h) {
            h = this.h - y;
        }

        const pixels2 = new Uint8Array(Image.getBufSize(w, h));

        const yi = 3 * (this.w - w);

        let i = 0,
            j;

        let pos1 = 0,
            pos2 = 3 * (y * this.w + x);

        for (; i < h; i++) {
            for (j = 0; j < w; j++) {
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

    invert() {
        let i = 0;

        for (; i < this.pixels.length; i++) {
            this.pixels[i] = 255 - this.pixels[i];
        }
    }

    removeChannel(channel) {
        let i = 0;

        switch (channel) {
            case "r":
                break;
            case "g":
                i = 1;
                break;
            case "b":
                i = 2;
                break;
            default:
                return;
        }

        for (; i < this.pixels.length; i += 3) {
            this.pixels[i] = 0;
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

        let tmp;

        [x1, y1, x2, y2] = coords;

        let dx = x2 - x1,
            dy = y2 - y1;

        if (dx === 0 && dy === 0) {
            this.setPixel_u(x1, y1, color);
        } else if (dy === 0) {
            let pos1 = 3 * (y1 * this.w + x1),
                pos2 = 3 * (y2 * this.w + x2);

            if (pos1 > pos2) {
                tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while (pos1 <= pos2) {
                this.pixels[pos1++] = color.r;
                this.pixels[pos1++] = color.g;
                this.pixels[pos1++] = color.b;
            }
        } else if (dx === 0) {
            const yi = 3 * (this.w - 1);

            let pos1 = 3 * (y1 * this.w + x1),
                pos2 = 3 * (y2 * this.w + x2);

            if (pos1 > pos2) {
                tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while (pos1 <= pos2) {
                this.pixels[pos1++] = color.r;
                this.pixels[pos1++] = color.g;
                this.pixels[pos1++] = color.b;

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

            let yi = 3 * this.w;

            if (dy < 0) {
                yi = -yi;
                dy = -dy;
            }

            let err = 2 * dy - dx,
                derr1 = -2 * dx,
                derr2 = 2 * dy;

            let pos = 3 * (y1 * this.w + x1);

            for (; x1 <= x2; x1++) {
                this.pixels[pos++] = color.r;
                this.pixels[pos++] = color.g;
                this.pixels[pos++] = color.b;

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

            let xi = 3,
                yi = 3 * (this.w - 1);

            if (dx < 0) {
                xi = -xi;
                dx = -dx;
            }

            let err = 2 * dx - dy,
                derr1 = -2 * dy,
                derr2 = 2 * dx;

            let pos = 3 * (y1 * this.w + x1);

            for (; y1 <= y2; y1++) {
                this.pixels[pos++] = color.r;
                this.pixels[pos++] = color.g;
                this.pixels[pos++] = color.b;

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
        this.setPixel(xc + y, yc + x, color);
        this.setPixel(xc - y, yc + x, color);
        this.setPixel(xc + y, yc - x, color);
        this.setPixel(xc - y, yc - x, color);
    }

    drawCircle(xc, yc, r, color) {
        r = Math.round(r);

        if (r === 0) {
            this.setPixel(xc, yc, color);
            return;
        }

        if (xc + r < 0 || xc - r > this.w || yc + r < 0 || yc - r > this.h) {
            return;
        }

        xc = Math.floor(xc);
        yc = Math.floor(yc);

        this._circlePoints(xc, yc, x, y, color);

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

    _circleLines(xc, yc, x, y, color) {
        this.fill(xc + x, yc + y, xc - x, yc + y, color);
        this.fill(xc + x, yc - y, xc - x, yc - y, color);
        this.fill(xc + y, yc + x, xc - y, yc + x, color);
        this.fill(xc + y, yc - x, xc - y, yc - x, color);
    }

    fillCircle(xc, yc, r, color) {
        r = Math.floor(r);

        if (r === 0) {
            this.setPixel(xc, yc, color);
            return;
        }

        if (xc + r < 0 || xc - r > this.w || yc + r < 0 || yc - r > this.h) {
            return;
        }

        xc = Math.floor(xc);
        yc = Math.floor(yc);

        this.fill(xc + x, yc, xc - x, yc, color);

        let x = r - 1,
            y = 0,
            d = 3 - 2 * r;

        while (x >= y) {
            y++;
            const dx = d > 0;

            if (dx) {
                x--;
                d = d + 4 * (y - x) + 10;
            } else {
                d = d + 4 * y + 6;
            }

            this._circleLines(xc, yc, x, y, color);
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

    drawGrid(grid, color, thickness) {
        if (typeof thickness !== "number" || thickness <= 1) {
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
        } else {
            const steps = Math.floor(thickness / 2);

            for (let i = 0; i <= grid.xDiv; i++) {
                let x1, y2;

                for (let j = 0; j < grid.yDiv; j++) {
                    x1 = grid.x + i * grid.xMult;

                    const y1 = grid.y + j * grid.yMult;
                    y2 = grid.y + (j + 1) * grid.yMult - 1;

                    this.drawLineThick(x1, y1, x1, y2, color, thickness);
                }

                if (i !== grid.xDiv) {
                    for (let j = 0; j <= grid.yDiv; j++) {
                        const x2 = grid.x + i * grid.xMult + steps,
                            y1 = grid.y + j * grid.yMult,
                            x3 = grid.x + (i + 1) * grid.xMult - steps;

                        this.drawLineThick(x2, y1, x3, y1, color, thickness);
                    }
                }

                this.fill(x1 - steps, y2 + 1, x1 + steps, y2 + 1, color);
            }
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

// leveret
function exit(msg) {
    throw new ExitError(msg);
}

const Help = {
    header: `ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ
ඞ ----СУС DRAW 1996 Help document---- ඞ
ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ
Very sus tag for drawing images. Made by sqrt(-i)#1415`,

    footer: `Help last updated: 04.04.2022`,

    headers: {
        input: "Special input variables",
        vars: "Image properties",
        funcs: "Image functions",
        color: "Color object (required in drawing)",
        namedColors: "Named and cached colors (Colors.name)"
    },

    usage: `Usage: %t cycdraw \`\`\`[drawing code]\`\`\`
Code can be uploaded as a message, enclosed in backticks as plain text or an URL, or as an attachment.
Aliases of cycdraw can be created, but code can not be uploaded as an attachment. Use an url instead.
Code can be downloaded using %t raw cycdraw and ran locally in node. Drawing code is to be placed in writeImg()

Example usage:
%t cycdraw \`\`\`img.fill(0, 0, 100, 100, Colors.clr69);\`\`\`;
%t cycdraw \`\`\`https:\/\/pastebin.com/raw/umhLsJzt\`\`\`
%t cycdraw --time \`\`\`img.drawLine(0, 0, img.w, img.h, Colors.red);\`\`\`
          ^--- attaches information about execution time
               
%t alias amongus cycdraw \`\`\`img.clear(Colors.red);
img.fillCircle(img.w / w, img.h / 2 - 100, Colors.white);\`\`\`
%t amongus --time`,

    inputVars: ["img", "evalArgs", "options", "exit(msg)"],
    inputDesc: {
        img: "output image. Size limited to 720x480 as to not spam the bot with large files until I implement compression.",
        evalArgs: "arguments passed from aliased command",
        options: `arguments from aliased command, in format: -test 1 -example a b c -arg
split into an array of objects: [{"test", "1"}, {"example", ["a", "b", "c"]}, {"-arg", ""}]`,
        exit: `can be used to exit out of the script with a message that will be outputted.
Image will not be outputted if exit is called, but time information will.
Script can also be exitted out of by returning in the outer scope.`
    },

    varsDesc: {
        w: "image width",
        h: "image height",
        pixels: `raw image pixels, flattened Uint8Array of RGB pixel values.
Only tamper with this if you know exactly what you're doing.
Length: 3 * img.w * img.h - Index formula: 3 * (y * img.w + x)`
    },

    funcsDesc: {
        constructor: "creates a new image with specified width and height",
        fromArray: "creates a new image from a array of pixel values",
        encode: "encodes image to Buffer2 object with PNG data",
        inBounds: "checks if point is in bounds, returns bool",
        clamp: "clamps point to bounds, returns array",
        getPixel: "returns color at a point, returns clr69 if pixel is out of bounds",
        setPixel: `sets color at a point, automatically check bounds and rounds coords.
Useful if coords may or may not be valid`,
        setPixel_u: `sets color at a point, no bounds check.
Mostly used internally. May cause encoding errors or super weird bugs if coords are invalid`,
        setPixel_u_rgb: `sets color at a point, no bounds check or need for a color object.
Optimal performance when drawing image pixel by pixel.`,
        clear: "clears image with color",
        fill: "fills rectangle defined by points",
        blit: "copies source image over current image at specified point",
        fillRadius: "fills square with center x, y and radius r",
        drawLine: "draws line between 2 points",
        drawPoints:
            "draws an array of points, all with the same color, each point is 2 integers. Optionalize for all points."
    },

    colorDesc: {
        r: "red channel value (0 - 255)",
        g: "green channel value (0 - 255)",
        b: "blue channel value (0 - 255)",
        constructor: "creates color from RGB values, automatically clamped and rounded",
        fromHex: "creates color from hex string, # is optional",
        normalize: "returns normalized color components",
        toHSV: `returns equivalent HSV values of color
H: 0 - 360, S: 0 - 1, V: 0 - 1`,
        fromHSV: "creates color from HSV values, converted to equivalent RGB"
    },

    computeInfo: _ => {
        Help.imgProps = Object.keys(new Image(1, 1));
        Help.imgFuncs = Utils.getClassSigs(Image);

        Help.colorProps = Object.keys(Colors.black).concat(Utils.getClassSigs(Color));

        Help.colorNames = Object.keys(Colors);
        Help.colorVals = Help.colorNames.map(name => `Color(${Colors[name].r}, ${Colors[name].g} ${Colors[name].b})`);

        Help.clrDescs = Help.colorVals.reduce((descs, val, i) => {
            const name = Help.colorNames[i];
            descs[name] = val;

            return descs;
        }, {});
    },

    generate: _ => {
        Help.computeInfo();

        const inputInfo = Utils.genDesc(Help.headers.input, Help.inputVars, Help.inputDesc),
            imgVars = Utils.genDesc(Help.headers.vars, Help.imgProps, Help.varsDesc),
            imgFuncs = Utils.genDesc(Help.headers.vars, Help.imgFuncs, Help.funcsDesc),
            colorInfo = Utils.genDesc(Help.headers.color, Help.colorProps, Help.colorDesc),
            namedColors = Utils.genDesc(Help.headers.namedColors, Help.colorNames, Help.clrDescs);

        let out = [
            Help.header,
            Help.usage,
            "-".repeat(10),
            inputInfo,
            imgVars,
            imgFuncs,
            colorInfo,
            namedColors,
            Help.footer
        ];

        return out.join("\n\n");
    }
};

const ctxNames = [
    "evalArgs",
    "img",

    "tag",
    "msg",
    "http",

    "Image",
    "Color",
    "Colors",
    "Point",
    "Grid",
    "Font",

    "Benchmark",
    "DigitFont",

    "Utils",
    "Buffer2",

    "OptionTypes",
    "Option",
    "ArgsParser",

    "exit"
];

function handleMsg() {
    if (tag.args === "help") {
        const helpText = Help.generate();

        msg.reply(helpText);
        return;
    }

    Benchmark.startTiming("total");
    Benchmark.startTiming("resolve_code");

    let code = tag.args,
        evalArgs = "";

    if (msg.attachments.length > 0) {
        let url = msg.attachments[0].url,
            res;

        try {
            res = http.request(url);
        } catch (err) {
            msg.reply("Could not fetch attachment file. Error: " + err.message);
            return;
        }

        if (res.status === 200) {
            code = res.data.trim();
            evalArgs = tag.args ?? "";
        } else {
            msg.reply("Could not fetch attachment file. Code: " + res.status);
            return;
        }
    } else if (code) {
        code = code.trim();
        const start = code.indexOf("```");

        if (start === -1 || code.slice(-3) !== "```") {
            msg.reply("Code must be enclosed in triple backticks (```). See %t cycdraw help");
            return;
        }

        evalArgs = code.slice(0, start);
        code = code.slice(start + 3, -3);

        if (code.slice(0, 3) === "js\n") {
            code = code.slice(3);
        }

        const urlexp = /\w+?:\/\/(.+\.)?[\w|\d]+\.\w+\/?.*/g;

        if (urlexp.test(code)) {
            let res;

            try {
                res = http.request(code);
            } catch (err) {
                msg.reply("URL invalid or unreachable. Error: " + err.message);
                return;
            }

            if (res.status === 200) {
                code = res.data;
            } else {
                msg.reply("Unsuccessful download. Code: " + res.status);
                return;
            }
        }
    }

    evalArgs = evalArgs.trim();
    evalArgs = evalArgs.replace("\n", " ");

    if (!code) {
        msg.reply("No code provided. Help: %t cycdraw help");
    }

    const flags = evalArgs.match(/--[\w|\d]+/g);

    let showTimes = false,
        highRes = false;

    if (flags) {
        showTimes = flags.includes("--time");
        highRes = flags.includes("--hires");

        if (flags.includes("--append_code")) {
            const i1 = evalArgs.find("`"),
                i2 = evalArgs.indexOf("`", i1 + 1);

            if (i1 && i2) {
                const newCode = evalArgs.slice(i1 + 1, i2 - 1);

                evalArgs = evalArgs.slice(0, i1 - 1) + evalArgs.slice(i2 + 1);
                code += ";" + newCode;
            }
        }

        const flagStrs = evalArgs.match(/--[\w|\d]+\s?/g);

        for (const str of flagStrs) {
            evalArgs = evalArgs.replace(str, "");
        }
    }

    code = `let output = (() => {try {\n${code}\n} catch(err) {return err;}})(); return [img, output];`;

    Benchmark.stopTiming("resolve_code");
    Benchmark.startTiming("create_img");

    const w = highRes ? 1920 : 640,
        h = highRes ? 1080 : 480;

    let img = new Image(w, h);

    Benchmark.stopTiming("create_img");
    Benchmark.startTiming("draw_img");

    const ctxVars = [
        evalArgs,
        img,
        tag,
        msg,
        http,
        Image,
        Color,
        Colors,
        Point,
        Grid,
        Font,
        Benchmark,
        DigitFont,
        Utils,
        Buffer2,
        OptionTypes,
        Option,
        ArgsParser,
        exit
    ];

    let output = "";
    [img, output] = Function(...ctxNames, code).apply(undefined, ctxVars);

    if (output instanceof Error) {
        if (output.name === "ExitError") {
            output = output.message;
        } else {
            output = `\`\`\`js\nError occured while drawing. Stacktrace:\n${output.stack}\`\`\``;
        }
    }

    if (!isNaN(output)) {
        output = output.toString();
    }

    if (
        !img ||
        (!img) instanceof Image ||
        img.w === null ||
        img.h === null ||
        img.pixels === null ||
        !img.pixels.length
    ) {
        throw new DrawingError("Invalid image");
    }

    Benchmark.stopTiming("draw_img");
    Benchmark.startTiming("encode_img");

    const embed = {};

    if (!output) {
        const encoded = img.encode();

        embed.file = {
            name: "cyc_save.png",
            data: encoded
        };
    }

    Benchmark.stopTiming("encode_img");
    Benchmark.stopTiming("total");

    if (showTimes) {
        embed.embed = {
            title: "Execution times:",
            description: Benchmark.getAll()
        };
    }

    msg.reply(output, embed);
}

// node

function writeImg() {
    const fs = require("fs");

    Benchmark.startTiming("total");
    Benchmark.startTiming("create_img");

    const w = 1920,
        h = 1080;

    let img = new Image(w, h);

    Benchmark.stopTiming("create_img");
    Benchmark.startTiming("draw_img");

    img = drawImg(img);

    Benchmark.stopTiming("draw_img");
    Benchmark.startTiming("encode_img");

    let buf = img.encode();

    Benchmark.stopTiming("encode_img");
    Benchmark.startTiming("write_file");

    fs.writeFileSync(`./amongus.png`, Buffer.from(buf));

    Benchmark.stopTiming("write_file");

    Benchmark.stopTiming("total");

    console.log("\nBenchmark times:\n\n" + Benchmark.getAll() + "\n");
}

function drawImg(img) {
    img.fill(0, 0, 500, 400, Colors.green);
    img.fill(0, 0, 500, 400, Colors.green);
    img.fillRadius(500, 400, Colors.red, 50);
    img.fillRadius(0, 0, Colors.yellow, 2);
    img.drawLine(0, 0, img.w, img.h, Colors.blue);
    img.drawLine(img.w - 20, img.h - 20, 50, 70, Colors.yellow);
    img.drawLine(20, img.h - 20, img.w - 20, 20, Colors.lime);
    img.drawLine(50, 50, 100, 300, Colors.red);
    img.drawLine(70, 100, 700, 100, Colors.brown);
    img.drawLine(700, 300, 70, 300, Colors.brown);
    img.drawLine(90, 200, 90, 400, Colors.cyan);
    img.drawLine(600, 400, 600, 200, Colors.cyan);
    img.drawLineThick(40, 40, img.w - 70, img.h - 40, Colors.red, 40);
    img.drawLineThick(40, 40, img.w - 70, img.h - 40, Colors.red, 40);
    img.fillTriangle(img.w / 2, 20, img.w / 2 + 100, img.h / 2, img.w / 2 + 200, img.h / 2 - 100, Colors.red);
    img.rotate(180);
    img.flipHorizontal();
}

//debugger;
if (Object.keys(this).length) {
    handleMsg();
} else {
    writeImg();
}

console.log();
