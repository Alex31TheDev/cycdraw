class Buffer2 extends Uint8Array {
    static alloc(size) {
        return new Buffer2(size);
    }

    toString() {
        let str = `Buffer2 Size: ${this.length} bytes`;
        let len = this.length,
            i = 0;

        while(len) {
            let chunkLen = Math.min(len, 32);
            len -= chunkLen;

            str += `\n${i} - [ `;

            while(chunkLen--) {
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
        for(let i = 0; i < value.length; i++) {
            let code = value.charCodeAt(i);
            code &= 0xff;
            this[offset++] = code;
        }
    }

    blit(src, offset, start, length) {
        if(offset >= this.length || start >= src.length) {
            return;
        }

        if(length + offset >= this.length || length + start >= src.length) {
            length = Math.min(this.length - offset, src.length - start);
        }

        for(let i = 0; i < length; i++) {
            this[i + offset] = src[i + start] & 0xff;
        }
    }

    writeCRC32(start, end) {
        let crc = CRC32.checksum(this, start, end);
        this.writeUInt32BE(crc, end);
    }
}

const Adler32 = {
    checksum: function(buf, start, end) {
        let a = 1,
            b = 0;
        let len = end,
            i = start;

        while(len) {
            let chunkLen = Math.min(len, 4096);
            len -= chunkLen;

            while(chunkLen--) {
                a += buf[i++];
                b += a;
            }

            a %= 65521;
            b %= 65521;
        }

        let sum = (b << 16) | a;
        return sum >>> 0;
    }
};

const CRC32 = {
    makeTable: function() {
        let table = [];

        for(let n = 0; n < 256; n++) {
            let c = n;
            for(let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }


            table[n] = c;
        }

        return table;
    },

    checksum: function(buf, start, end) {
        if(!CRC32.table) {
            CRC32.table = CRC32.makeTable();
        }

        let crc = 0 ^ (-1);

        for(let i = start; i < end; i++) {
            crc = (crc >>> 8) ^ this.table[(crc ^ buf[i]) & 0xff];
        }

        return (crc ^ (-1)) >>> 0;
    }
};

class DrawingError extends Error {
    constructor(message) {
        super(message);
        this.name = "DrawingError";
    }
}

class EncoderError extends Error {
    constructor(message) {
        super(message);
        this.name = "EncoderError";
    }
}

class ExitError extends Error {
    constructor(message) {
        super(message);
        this.name = "ExitError";
    }
}

class Color {
    constructor(r, g, b) {
        if(r instanceof Color) {
            this.r = r.r;
            this.g = r.g;
            this.b = r.b;
        } else {
            this.r = Math.min(Math.max(Math.round(r), 0), 255);
            this.g = Math.min(Math.max(Math.round(g), 0), 255);
            this.b = Math.min(Math.max(Math.round(b), 0), 255);
        }
    }

    toString() {
        return `Color: {${this.r}, ${this.g}, ${this.b}}`;
    }

    inverted() {
        return new Color(255 - this.r, 255 - this.g, 255 - this.b);
    }

    static fromHex(hex) {
        if(hex.startsWith("#")) {
            hex = hex.slice(1);
        }

        let comp = hex.match(/.{2}/g);
        let r = parseInt(comp[0], 16) || 0,
            g = parseInt(comp[1], 16) || 0,
            b = parseInt(comp[2], 16) || 0;

        return new Color(r, g, b);
    }

    toHex() {
        return `#${this.r.toString(16)}, ${this.g.toString(16)}, ${this.b.toString(16)}`;
    }

    static fromHSV(h, s, v) {
        h = Math.min(Math.max(h, 0), 360);
        s = Math.min(Math.max(s, 0), 1);
        v = Math.min(Math.max(v, 0), 1);

        let r = 0,
            g = 0,
            b = 0;
        let c = s * v;
        let x = c * (1 - Math.abs((h / 60) % 2 - 1));
        let m = v - c;

        if(h >= 0 && h < 60) {
            r = c, g = x;
        } else if(h >= 60 && h < 120) {
            r = x, g = c;
        } else if(h >= 120 && h < 180) {
            g = c, b = x;
        } else if(h >= 180 && h < 240) {
            g = x, b = c;
        } else if(h >= 240 && h < 300) {
            r = x, b = c;
        } else {
            r = c, b = x;
        }

        r = (r + m) * 255;
        g = (g + m) * 255;
        b = (b + m) * 255;

        return new Color(r, g, b);
    }

    normalize() {
        return [this.r / 255, this.g / 255, this.b / 255];
    }

    toHSV() {
        //https://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/
        let [r, g, b] = this.normalize();

        let maxc = Math.max(r, g, b);
        let minc = Math.min(r, g, b);
        let diff = maxc - minc;
        let h, s = diff / maxc;

        switch(maxc) {
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

    //add operators
}

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
    lightBlue: new Color(173, 216, 230),
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

Utils = {
    push_n: function(array, n, ...val) {
        for(let i = 0; i < n; i++) {
            array.push(...val);
        }
    },

    findMult: function(str, start) {
        let end = str.indexOf("}", start),
            num;
        if(end) {
            num = str.slice(start, end);
            num = parseInt(num);
        }

        return [end, num];
    },

    padding: function(a, b) {
        let len = a.toString().length - b.toString().length;
        return len > 0 ? Array(len).fill(" ").join("") : "";
    },

    getClassSigs: function(obj) {
        let src = obj.toString();
        let sigs = [];

        let regex = /^\s{4}((?:static\s)?\w+\s*\((?:.+\)?))\s{/gm;
        let match;

        while(match = regex.exec(src)) {
            sigs.push(match[1]);
        }

        return sigs;
    },

    genDesc: function(header, vals, descDict) {
        let noDesc = "NO DESCRIPTION PROVIDED / WIP";
        let desc = "";
        let skip = 0;

        for(let i = 0; i < vals.length; i++) {
            let name = vals[i];
            if(name.includes("(")) {
                let regex = /(?:static\s)?(.+)\(/;
                name = name.match(regex)[1];
            }

            if(name.startsWith("i_")) {
                skip++;
                continue;
            }

            let title = `    ${i - skip + 1}. ${vals[i]} - `;
            let varDesc = descDict[name];
            varDesc = (!varDesc || varDesc instanceof Function) ? noDesc : varDesc;

            if(varDesc.includes("\n")) {
                let padding = Array(title.length).fill(" ").join("");
                varDesc = varDesc.split("\n").join("\n" + padding);
            }

            desc += "\n" + title + varDesc;
        }

        return `${header}:${desc}`;
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    
    static fromPolar(phase, length) {
        return new Point(length * Math.cos(phase), length * Math.sin(phase));
    }
    
    toString() {
        return `Point: {x: ${this.x}, y: ${this.y}}`;
    }
    
    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }
    
    equals(p) {
        return this.x == p.x && this.y == p.y;
    }
    
    add(p) {
        if(isNaN(p)) {
            return new Point(this.x + p.x, this.y + p.y);
        }
        
        return new Point(this.x + p, this.y + p);
    }
    
    sub(p) {
        if(isNaN(p)) {
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
        return Math.sqrt((p.x - this.x) * (p.x - this.x) + (p.y - this.y) * (p.y - this.y));
    }
    
    midpoint(p) {
        return new Point(Math.floor((this.x + p.x) / 2), Math.floor((this.y + p.y) / 2));
    }
    
    quadrant() {
        if(this.x >= 0 && this.y >= 0) {
            return 1;
        } else if(this.x < 0 && this.y > 0) {
            return 2;
        } else if(this.x < 0 && this.y < 0) {
            return 3;
        } else if(this.x > 0 && this.y < 0) {
            return 4;
        }
    }
    
    complexPhase() {
        return Math.atan2(this.y, this.x);
    }
    
    toPolar() {
        return new Point(this.complexPhase(), this.length());
    }
    
    complexMult(p) {
        return new Point(this.x * p.x - this.y * p.y,
                         this.x * p.y + this.y * p.x);
    }
    
    complexDiv(p) {
        let sum = this.y * this.y + p.y * p.y;
        return new Point((this.x * p.x - this.y * p.y) / sum,
                         (this.x * p.y + this.y * p.x) / sum);
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
        
        if(x1 > x2) {
            this.x = x2;
        } else {
            this.x = x1;
        }
        
        if(y1 > y2) {
            this.y = y2;
        } else {
            this.y = y1;
        }
    }
    
    point(i, j) {
        return new Point(this.x + i * this.xMult, this.y + j * this.yMult);
    }
}

class Image {
    constructor(w, h) {
        if(w <= 0 || h <= 0 || w > 1440 || h > 1080) {
            throw new DrawingError("Invalid image size.");
        }

        this.w = Math.floor(w);
        this.h = Math.floor(h);

        this.pixels = new Uint8Array(w * h * 3).fill(0);
    }

    static fromArray(pixels, w, h) {
        if(pixels.length % 3 != 0) {
            throw new DrawingError("Pixel array invalid.");
        }

        if(pixels.length > w * h * 3) {
            throw new DrawingError("Pixel array too large.");
        }

        let img = new Image(w, h);
        let i = 0;
        for(; i < pixels.length; i++) {
            img.pixels[i] = pixels[i] & 0xff;
        }

        return img;
    }

    static loadFile(buf) {
        //
        ;
    }

    static Gus(str) {
        let dim = str.split("/")[0].split(",");

        if(!dim || !dim.length) {
            throw new DrawingError("Invalid string. No width or height information.");
        }

        let w = parseInt(dim[0]);
        let h = parseInt(dim[1]);

        let pixels = [];

        for(let i = dim.join("").length + 2; i < str.length; i++) {
            let code = str.charCodeAt(i) - 430;

            if(str[i] == "(") {
                let end = str.indexOf("){", i);

                if(end) {
                    let [end2, num] = Utils.findMult(str, end);

                    if(num) {
                        let group = str.slice(i + 1, end);
                        let codes = [...group].map(x => x.charCodeAt(0) - 430);

                        Utils.push_n(pixels, num, ...codes);
                        i = end2;
                    }
                }
            } else if(str[i + 1] == "{") {
                let [end, num] = Utils.findMult(str, i);

                if(num) {
                    Utils.push_n(pixels, num, code);
                    i = end;
                }
            } else {
                pixels.push(code);
            }
        }

        return Image.fromArray(pixels, w, h);
    }

    encode() {
        // finalize opacity
        return new EncoderPNG(this.pixels, this.w, this.h).encode();
    }

    inBounds(x, y) {
        return x >= 0 && x < this.w && y >= 0 && y < this.h;
    }

    clamp(x, y) {
        x = Math.min(Math.max(x, 0), this.w - 1);
        y = Math.min(Math.max(y, 0), this.h - 1);
        return [Math.floor(x), Math.floor(y)];
    }

    i_clampLiangBarsky(x1, y1, x2, y2) {
        if(this.inBounds(x1, y1) && this.inBounds(x2, y2)) {
            return [Math.floor(x1), Math.floor(y1), Math.floor(x2), Math.floor(y2)];
        }

        //https://www.skytopia.com/project/articles/compsci/clipping.html
        let dx = x2 - x1;
        let dy = y2 - y1;

        let s1 = 0,
            s2 = 1;
        let nd1, nd2;
        let i = 0,
            slope;

        for(; i < 4; i++) {
            switch(i) {
                case 0:
                    nd1 = -dx;
                    nd2 = x1;
                    break;
                case 1:
                    nd1 = dx;
                    nd2 = this.w - x1 - 1;
                    break;
                case 2:
                    nd1 = -dy;
                    nd2 = y1;
                    break;
                case 3:
                    nd1 = dy;
                    nd2 = this.h - y1 - 1;
                    break;
            }

            if(nd1 == 0 && nd2 < 0) {
                return false;
            }
            slope = nd2 / nd1;

            if(nd1 < 0) {
                if(slope > s2) {
                    return false;
                }
                if(slope > s1) {
                    s1 = slope;
                }
            } else {
                if(slope < s1) {
                    return false;
                }
                if(slope < s2) {
                    s2 = slope;
                }
            }
        }

        let nx1 = x1 + s1 * dx;
        let ny1 = y1 + s1 * dy;

        let nx2 = x1 + s2 * dx;
        let ny2 = y1 + s2 * dy;

        return [Math.floor(nx1), Math.floor(ny1), Math.floor(nx2), Math.floor(ny2)];
    }

    getPixel(x, y) {
        if(!this.inBounds(x, y)) {
            return Colors.clr69
        };

        x = Math.floor(x);
        y = Math.floor(y);

        let pos = 3 * (y * this.w + x);

        return new Color(this.pixels[pos],
            this.pixels[pos + 1],
            this.pixels[pos + 2]);
    }

    setPixel(x, y, color) {
        if(!this.inBounds(x, y)) {
            return;
        }

        this.setPixel_u(Math.floor(x), Math.floor(y), color);
    }

    setPixel_u(x, y, color) {
        let pos = 3 * (y * this.w + x);

        this.pixels[pos++] = color.r;
        this.pixels[pos++] = color.g;
        this.pixels[pos] = color.b;
    }

    setPixel_u_rgb(x, y, r, g, b) {
        let pos = 3 * (y * this.w + x);

        this.pixels[pos++] = r;
        this.pixels[pos++] = g;
        this.pixels[pos] = b;
    }

    clear(color) {
        let i = 0;

        while(i < this.pixels.length) {
            this.pixels[i++] = color.r;
            this.pixels[i++] = color.g;
            this.pixels[i++] = color.b;
        }
    }

    flipHorizontal() {
        let w = this.w / 2;
        let yi = 3 * (this.w - 1);

        let x = 0,
            y, tmp;
        let pos1 = 0,
            pos2 = 3 * (this.w - 1);

        for(; x < w; x++) {
            for(y = 0; y < this.h; y++) {
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
        let w = 3 * this.w,
            h = this.h / 2;
        let yi = -2 * w;

        let y = 0,
            x, tmp;
        let pos1 = 0,
            pos2 = this.pixels.length - 3 * this.w;

        for(; y < h; y++) {
            for(x = 0; x < w; x++) {
                tmp = this.pixels[pos1];
                this.pixels[pos1++] = this.pixels[pos2];
                this.pixels[pos2++] = tmp;
            }

            pos2 += yi;
        }
    }
    
    rotate180() {
        let pos1 = 0, pos2 = this.pixels.length - 3;
        let max = this.pixels.length / 2, tmp;
                
        while(pos1 < max) {
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
        let pixels2 = new Uint8Array(this.w * this.h * 3);

        switch(direction) {
            case 0: {
                let yi = 3 * (this.h - 1);

                let y = 0,
                    x;
                let pos1 = 0,
                    pos2 = 0;

                for(; y < this.h; y++) {
                    for(x = 0; x < this.w; x++) {
                        pixels2[pos2++] = this.pixels[pos1++];
                        pixels2[pos2++] = this.pixels[pos1++];
                        pixels2[pos2++] = this.pixels[pos1++];

                        pos2 += yi;
                    }

                    pos2 = 3 * (this.h - y - 2);
                }
            }
            break;
            case 1: {
                let yi = -3 * (this.h + 1);

                let y = 0,
                    x;
                let pos1 = 0,
                    pos2 = this.pixels.length - 3 * this.h;

                for(; y < this.h; y++) {
                    for(x = 0; x < this.w; x++) {
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
    
    rotate(angle) {
        angle = Math.floor(angle) % 360;
        
        if(angle > 180) {
            angle -= 360;
        } else if(angle == 0) {
            return;
        }
        
        switch(angle) {
            case 90:
                this.rotate90(0);
                break;
            case -90:
                this.rotate90(1);
                break;
            case 180:
                this.rotate180();
                break;
            default:
                let angleRad = angle / 180 * Math.PI;
                let sin = Math.abs(Math.sin(angleRad));
                let cos = Math.abs(Math.cos(angleRad));
            
                let nw = Math.floor(cos * this.w + sin * this.h);
                let nh = Math.floor(cos * this.h + sin * this.w);
                let pixels2 = new Uint8Array(3 * nw * nh).fill(0);
            
                //
            
                this.w = nw;
                this.h = nh;
            
                this.pixels = pixels2;
                break;
        }
    }

    fill(x1, y1, x2, y2, color) {
        if((x1 < 0 && x2 < 0) || (x1 > this.w && x2 > this.w) ||
            (y1 < 0 && y2 < 0) || (y1 > this.h && y2 > this.h)) {
            return;
        }

        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = this.clamp(x2, y2);

        if(x2 < x1) {
            let tmp = x1;
            x1 = x2;
            x2 = tmp;
        }

        if(y2 < y1) {
            let tmp = y1;
            y1 = y2;
            y2 = tmp;
        }

        let w = Math.abs(x2 - x1);
        let h = Math.abs(y2 - y1);

        if(w == 0 && h == 0) {
            this.setPixel_u(x1, y1, color);
        } else if(h == 0) {
            let pos1 = 3 * (y1 * this.w + x1);
            let pos2 = 3 * (y2 * this.w + x2);

            while(pos1 <= pos2) {
                this.pixels[pos1++] = color.r;
                this.pixels[pos1++] = color.g;
                this.pixels[pos1++] = color.b;
            }
        } else if(w == 0) {
            let yi = 3 * (this.w - 1);

            let pos1 = 3 * (y1 * this.w + x1);
            let pos2 = 3 * (y2 * this.w + x2);

            while(pos1 <= pos2) {
                this.pixels[pos1++] = color.r;
                this.pixels[pos1++] = color.g;
                this.pixels[pos1++] = color.b;

                pos1 += yi;
            }
        } else {
            let yi = -3 * (w - this.w + 1);

            let i = 0,
                j;
            let pos = 3 * (y1 * this.w + x1);

            for(; i <= h; i++) {
                for(j = 0; j <= w; j++) {
                    this.pixels[pos++] = color.r;
                    this.pixels[pos++] = color.g;
                    this.pixels[pos++] = color.b;
                }

                pos += yi;
            }
        }
    }
    
    average(x1, y1, x2, y2) {
        if((x1 < 0 && x2 < 0) || (x1 > this.w && x2 > this.w) ||
            (y1 < 0 && y2 < 0) || (y1 > this.h && y2 > this.h)) {
            return;
        }

        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = this.clamp(x2, y2);

        if(x2 < x1) {
            let tmp = x1;
            x1 = x2;
            x2 = tmp;
        }

        if(y2 < y1) {
            let tmp = y1;
            y1 = y2;
            y2 = tmp;
        }

        let w = Math.abs(x2 - x1);
        let h = Math.abs(y2 - y1);
        
        let yi = -3 * (w - this.w + 1);

        let i = 0,
            j;
        let pos = 3 * (y1 * this.w + x1);
        
        let sum_r = 0, sum_g = 0, sum_b = 0;

        if(w == 0 && h == 0) {
            sum_r = this.pixels[pos++];
            sum_g = this.pixels[pos++];
            sum_b = this.pixels[pos++];
        } else if(h == 0) {
            let pos1 = 3 * (y1 * this.w + x1);
            let pos2 = 3 * (y2 * this.w + x2);

            while(pos1 <= pos2) {
                sum_r += this.pixels[pos++];
                sum_g += this.pixels[pos++];
                sum_b += this.pixels[pos++];
            }
        } else if(w == 0) {
            let yi = 3 * (this.w - 1);

            let pos1 = 3 * (y1 * this.w + x1);
            let pos2 = 3 * (y2 * this.w + x2);

            while(pos1 <= pos2) {
                sum_r += this.pixels[pos++];
                sum_g += this.pixels[pos++];
                sum_b += this.pixels[pos++];

                pos1 += yi;
            }
        } else {
            let yi = -3 * (w - this.w + 1);

            let i = 0,
                j;
            let pos = 3 * (y1 * this.w + x1);

            for(; i <= h; i++) {
                for(j = 0; j <= w; j++) {
                    sum_r += this.pixels[pos++];
                    sum_g += this.pixels[pos++];
                    sum_b += this.pixels[pos++];
                }

                pos += yi;
            }
        }
        
        let count = (w + 1) * (h + 1);
        return new Color(sum_r / count, sum_g / count, sum_b / count);
    }

    fillGradient(x1, y1, x2, y2, gradient) {



    }

    blit(x, y, src, w, h) {
        let sw = Math.min(w, src.w) || src.w,
            sh = Math.min(h, src.h) || src.h;

        if(sw + x >= this.w) {
            sw = this.w - x;
        }
        if(sh + y >= this.h) {
            sh = this.h - y;
        }

        for(let i = 0; i < sw; i++) {
            for(let j = 0; j < sh; j++) {
                let pos1 = 3 * ((j + y) * this.w + i + x);
                let pos2 = 3 * (j * src.w + i);

                this.pixels[pos1] = src.pixels[pos2];
                this.pixels[pos1 + 1] = src.pixels[pos2 + 1];
                this.pixels[pos1 + 2] = src.pixels[pos2 + 2];
            }
        }
    }

    invert() {
        let i = 0;

        for(; i < this.pixels.length; i++) {
            this.pixels[i] = ~this.pixels[i];
        }
    }

    removeChannel(channel) {
        let i = 0;

        switch(channel) {
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

        for(; i < this.pixels.length; i += 3) {
            this.pixels[i] = 0;
        }
    }

    fillRadius(x, y, color, r) {
        if(!this.inBounds(x + r, y + r) && !this.inBounds(x - r, y - r)) {
            return;
        }

        r = Math.floor(r);
        if(r == 0) {
            this.setPixel(x, y, color);
            return;
        }

        let x1 = Math.max(0, x - r);
        let y1 = Math.max(0, y - r);

        let w = 2 * r;
        let h = 2 * r;

        if(x1 + w > this.w) {
            w = this.w - x1;
        }

        if(y1 + h > this.h) {
            h = this.h - y1;
        }

        let i = 0,
            j;
        let yi = -3 * (w - this.w + 1);
        let pos = 3 * (y1 * this.w + x1);

        for(; i <= h; i++) {
            for(j = 0; j <= w; j++) {
                this.pixels[pos++] = color.r;
                this.pixels[pos++] = color.g;
                this.pixels[pos++] = color.b;
            }

            pos += yi;
        }
    }

    drawLine(x1, y1, x2, y2, color) {
        if(x1 == x2 && y1 == y2) {
            this.setPixel_u(x1, y1, color);
            return;
        }

        let coords = this.i_clampLiangBarsky(x1, y1, x2, y2);
        if(!coords) {
            return;
        }

        [x1, y1, x2, y2] = coords;

        //https://www.cs.helsinki.fi/group/goa/mallinnus/lines/bresenh.html
        let dx = x2 - x1;
        let dy = y2 - y1;

        if(dx == 0 && dy == 0) {
            this.setPixel_u(x1, y1, color);
        } else if(dy == 0) {
            let pos1 = 3 * (y1 * this.w + x1);
            let pos2 = 3 * (y2 * this.w + x2);

            if(pos1 > pos2) {
                let tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while(pos1 <= pos2) {
                this.pixels[pos1++] = color.r;
                this.pixels[pos1++] = color.g;
                this.pixels[pos1++] = color.b;
            }
        } else if(dx == 0) {
            let yi = 3 * (this.w - 1);

            let pos1 = 3 * (y1 * this.w + x1);
            let pos2 = 3 * (y2 * this.w + x2);

            if(pos1 > pos2) {
                let tmp = pos1;
                pos1 = pos2;
                pos2 = tmp;
            }

            while(pos1 <= pos2) {
                this.pixels[pos1++] = color.r;
                this.pixels[pos1++] = color.g;
                this.pixels[pos1++] = color.b;

                pos1 += yi;
            }
        } else if(Math.abs(dy) < Math.abs(dx)) {
            if(x1 > x2) {
                let tmp = x2;
                x2 = x1;
                x1 = tmp;

                tmp = y2;
                y2 = y1;
                y1 = tmp;

                dx = -dx;
                dy = -dy;
            }

            let yi = 3 * this.w;
            if(dy < 0) {
                yi = -yi;
                dy = -dy;
            }

            let err = 2 * dy - dx;
            let derr1 = -2 * dx;
            let derr2 = 2 * dy;

            let pos = 3 * (y1 * this.w + x1);

            for(; x1 <= x2; x1++) {
                this.pixels[pos++] = color.r;
                this.pixels[pos++] = color.g;
                this.pixels[pos++] = color.b;

                if(err >= 0) {
                    pos += yi;
                    err += derr1;
                }

                err += derr2;
            }
        } else {
            if(y1 > y2) {
                let tmp = x2;
                x2 = x1;
                x1 = tmp;

                tmp = y2;
                y2 = y1;
                y1 = tmp;

                dx = -dx;
                dy = -dy;
            }

            let xi = 3;
            let yi = 3 * (this.w - 1);
            if(dx < 0) {
                xi = -xi;
                dx = -dx;
            }

            let err = 2 * dx - dy;
            let derr1 = -2 * dy;
            let derr2 = 2 * dx;

            let pos = 3 * (y1 * this.w + x1);

            for(; y1 <= y2; y1++) {
                this.pixels[pos++] = color.r;
                this.pixels[pos++] = color.g;
                this.pixels[pos++] = color.b;

                if(err >= 0) {
                    pos += xi;
                    err += derr1;
                }

                err += derr2;
                pos += yi;
            }
        }
    }
    
    drawGrid(grid, color, thicc) {
        if(!thicc) {
            for(let i = 0; i <= grid.xDiv; i++) {
                let x1, y2;
                
                for(let j = 0; j < grid.yDiv; j++) {
                    x1 = grid.x + i * grid.xMult;
                    let y1 = grid.y + j * grid.yMult;
                    y2 = grid.y + (j + 1) * grid.yMult - 1;
                    
                    this.drawLine(x1, y1, x1, y2, color);
                }
                
                if(i != grid.xDiv) {
                    for(let j = 0; j <= grid.yDiv; j++) {
                        let x2 = grid.x + i * grid.xMult + 1;
                        let y1 = grid.y + j * grid.yMult;
                        let x3 = grid.x + (i + 1) * grid.xMult - 1;
                        
                        this.drawLine(x2, y1, x3, y1, color);
                    }
                }
                
                this.setPixel(x1, y2 + 1, color);
            }
        } else {
            let steps = Math.floor(thicc / 2);
            
            for(let i = 0; i <= grid.xDiv; i++) {
                let x1, y2;
                
                for(let j = 0; j < grid.yDiv; j++) {
                    x1 = grid.x + i * grid.xMult;
                    let y1 = grid.y + j * grid.yMult;
                    y2 = grid.y + (j + 1) * grid.yMult - 1;
                    
                    this.drawLineThick(x1, y1, x1, y2, color, thicc);
                }
                
                if(i != grid.xDiv) {
                    for(let j = 0; j <= grid.yDiv; j++) {
                        let x2 = grid.x + i * grid.xMult + steps;
                        let y1 = grid.y + j * grid.yMult;
                        let x3 = grid.x + (i + 1) * grid.xMult - steps;
                        
                        this.drawLineThick(x2, y1, x3, y1, color, thicc);
                    }
                }
                
                this.fill(x1 - steps, y2 + 1, x1 + steps, y2 + 1, color);
            }
        }
    }

    drawPoints(points, color, size) {
        if(points.length % 2 != 0) {
            throw "Invalid points array";
        }

        let pixel = this.setPixel;
        if(size) {
            pixel = this.fillRadius;
        }

        pixel = pixel.bind(this);

        for(let i = 0; i < points.length; i += 2) {
            pixel(points[i], points[i + 1], color, size);
        }
    }

    i_lineHorizontal(x1, y1, x2, color) {
        for(; x1 <= x2; x1++) {
            this.setPixel_u(x1, y1, color);
        }
    }

    i_flatTop(x1, y1, x2, y2, x3, y3, color) {

    }

    i_flatBottom(x1, y1, x2, y2, x3, y3, color) {
        let dx1 = x2 - x1;
        let dy1 = y2 - y1;

        let dx2 = x3 - x1;
        let dy2 = y3 - y1;

        let xi1 = 1,
            xi2 = 1;
        if(dx1 < 0) {
            xi1 = -1;
            dx1 = -dx1;
        }

        if(dx2 < 0) {
            xi2 = -1;
            dx2 = -dx2;
        }

        if(Math.abs(dy1) < Math.abs(dx1) && Math.abs(dy2) < Math.abs(dx2)) {
            let err1 = 2 * dy1 - dx1;
            let derr1 = -2 * dx1;
            let derr2 = 2 * dy1;

            let err2 = 2 * dy2 - dx2;
            let derr3 = -2 * dx2;
            let derr4 = 2 * dy2;

            let steps = Math.abs(dx1);
            let ny1 = y1,
                ny2 = y1,
                nx1 = x1,
                nx2 = x2;

            for(let i = 0; i <= steps; i++) {
                let cx1 = Math.min(Math.max(nx1, 0), this.w - 1);
                let cx2 = Math.min(Math.max(nx2, 0), this.w - 1);

                if(cx1 > cx2) {
                    let tmp = cx1;
                    cx1 = cx2;
                    cx2 = tmp;
                }

                this.i_lineHorizontal(cx1, ny1, cx2, color);

                while(err1 > 0) {
                    ny1++;
                    err1 += derr1;
                }

                err1 += derr2;
                nx1 += xi1;

                while(ny1 != ny2) {
                    while(err2 > 0) {
                        ny2++;
                        err2 += derr3;
                    }

                    err2 += derr4;
                    nx2 += xi2;
                }
            }
        } else if(Math.abs(dy1) > Math.abs(dx1) && Math.abs(dy2) > Math.abs(dx2)) {
            let err1 = 2 * dx1 - dy1;
            let derr1 = -2 * dy1;
            let derr2 = 2 * dx1;

            let err2 = 2 * dx2 - dy2;
            let derr3 = -2 * dy2;
            let derr4 = 2 * dx2;

            let nx1 = x1,
                nx2 = x1;
            for(let y = y1; y <= y2; y++) {
                if(y < 0 || y >= this.h) {
                    continue;
                }

                let cx1 = Math.min(Math.max(nx1, 0), this.w - 1);
                let cx2 = Math.min(Math.max(nx2, 0), this.w - 1);
                this.i_lineHorizontal(cx1, y, cx2, color);

                if(err1 >= 0) {
                    nx1 += xi1;
                    err1 += derr1;
                }

                err1 += derr2;

                if(err2 >= 0) {
                    nx2 += xi2;
                    err2 += derr3;
                }

                err2 += derr4;
            }
        } else {

        }
    }

    fillTriangle(x1, y1, x2, y2, x3, y3, color) {
        if((x1 < 0 && x2 < 0 && x3 < 0) || (x1 > this.w && x2 > this.w && x3 > this.w) ||
            (y1 < 0 && y2 < 0 && y3 < 0) || (y1 > this.h && y2 > this.h && y3 > this.h)) {
            return;
        }

        //http://www.sunshine2k.de/coding/java/TriangleRasterization/TriangleRasterization.html
        if(y1 > y3) {
            let tmp = y1;
            y1 = y3;
            y3 = tmp;

            tmp = x1;
            x1 = x3;
            x3 = tmp;
        }

        if(y1 > y2) {
            let tmp = y1;
            y1 = y2;
            y2 = tmp;

            tmp = x1;
            x1 = x2;
            x2 = tmp;
        }

        if(y2 > y3) {
            let tmp = y2;
            y2 = y3;
            y3 = tmp;

            tmp = x2;
            x2 = x3;
            x3 = tmp;
        }

        if(y1 == y2) {
            this.i_flatTop(x1, y1, x2, y2, x3, y3, color);
        } else if(y2 == y3) {
            this.i_flatBottom(x1, y1, x2, y2, x3, y3, color);
        } else {
            let x4 = Math.floor(x1 + ((y2 - y1) / (y3 - y1)) * (x3 - x1));

            this.i_flatBottom(x1, y1, x2, y2, x4, y2, color);
            //this.i_flatTop(x2, y2, x4, y2, x3, y3, color);
        }

        this.drawLine(x1, y1, x2, y2, color.inverted());
        this.drawLine(x2, y2, x3, y3, color.inverted());
        this.drawLine(x1, y1, x3, y3, color.inverted());
    }

    drawLineThick(x1, y1, x2, y2, color, thicc) {
        let coords = this.i_clampLiangBarsky(x1, y1, x2, y2);
        if(!coords) {
            return;
        }

        [x1, y1, x2, y2] = coords;


    }
}

class Zlib {
    constructor(data) {
        if(!(data instanceof Buffer2 || data instanceof Uint8Array)) {
            throw new EncoderError("Invalid data array type.");
        }

        this.data = data;
    }

    blurredCompress() {
        //still need to add the compression
        let chunks = Math.ceil(this.data.length / 65535);
        let buf = Buffer2.alloc(this.data.length + 6 + 5 * chunks);
        buf.write("\x78\x01", 0);

        let len = this.data.length,
            i = 2,
            doffset = 0;

        while(len) {
            let chunkLen = Math.min(len, 65535);
            len -= chunkLen;

            buf[i] = len ? 0 : 1;

            buf.writeUInt16LE(chunkLen, i + 1);
            buf.writeUInt16LE(~chunkLen, i + 3);

            buf.blit(this.data, i + 5, doffset, chunkLen);

            i += chunkLen + 5;
            doffset += chunkLen;
        }

        let sum = Adler32.checksum(this.data, 0, this.data.length);
        buf.writeUInt32BE(sum, i);

        return buf;
    }

    dynamicHuffmannDeflate() {

    }

    deflate(ctype) {
        let d1 = Date.now(),
            compressed;

        switch(ctype) {
            case 0:
                compressed = this.blurredCompress();
                break;
            case 1:
                compressed = this.dynamicHuffmannDeflate();
                break;
            default:
                throw new EncoderError("Invalid compression type.");
                break;
        }

        benchmark["enc_compress"] = Date.now() - d1;
        return compressed;
    }

    inflate() {

    }
}

class EncoderPNG {
    constructor(pixels, w, h) {
        if(!pixels instanceof Uint8Array) {
            throw new EncoderError("Invalid pixel array type.");
        }

        if(pixels.length != w * h * 3) {
            throw new EncoderError("Pixel array size invalid.");
        }

        this.pixels = pixels;

        this.w = w;
        this.h = h;
    }

    filterPixels() {
        let d1 = Date.now();
        let buf = Buffer2.alloc(this.pixels.length + this.h);

        for(let y = 0; y < this.h; y++) {
            buf[y * this.w * 3 + y] = 1;

            for(let x = 0; x < this.w; x++) {
                let pos = 3 * (y * this.w + x);
                let pos_b = pos + y;
                let r_f, g_f, b_f;

                if(x == 0) {
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
        benchmark["enc_filter"] = Date.now() - d1;
    }

    encode() {
        this.filterPixels();
        let data = new Zlib(this.pixels).deflate(0);

        let d1 = Date.now();
        let sig_size = 8;
        let chunk_size = 12;

        let ihdr_size = 13;
        let ihdr_offset = sig_size;

        let idat_size = data.length;
        let idat_offset = ihdr_offset + ihdr_size + chunk_size;

        let iend_offset = idat_offset + idat_size + chunk_size;
        let buffer_size = iend_offset + chunk_size;

        let buf = Buffer2.alloc(buffer_size);

        //SIG
        buf.write("\x89PNG\x0d\x0a\x1a\x0a", 0);

        //IHDR
        buf.writeUInt32BE(ihdr_size, ihdr_offset);
        buf.write("IHDR", ihdr_offset + 4);

        buf.writeUInt32BE(this.w, ihdr_offset + 8);
        buf.writeUInt32BE(this.h, ihdr_offset + 12);
        buf.write("\x08\x02\x00\x00\x00", ihdr_offset + 16);
        buf.writeCRC32(ihdr_offset + 4, idat_offset - 4);

        //IDAT
        buf.writeUInt32BE(idat_size, idat_offset);
        buf.write("IDAT", idat_offset + 4);

        buf.blit(data, idat_offset + 8, 0, data.length);
        buf.writeCRC32(idat_offset + 4, iend_offset - 4);

        //IEND
        buf.write("IEND", iend_offset + 4);
        buf.writeCRC32(iend_offset + 4, iend_offset + 8);
        benchmark["enc_write"] = Date.now() - d1;

        return buf;
    }
}

function exit(msg) {
    throw new ExitError(msg);
}

function generateHelp() {
    let header = `ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ
ඞ----СУС DRAW 1996 Help document---- ඞ
ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ
Very sus tag for drawing images. Made by sqrt(-i)#1415`;

    let footer = `Help last updated: 04.04.2022`;

    let usage = `Usage: %t cycdraw \`\`\`[drawing code]\`\`\`
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
%t amongus --time`;

    let inputVars = ["img", "evalArgs", "options", "exit(msg)"];

    let inputDesc = {
        img: "output image. Size limited to 720x480 as to not spam the bot with large files until I implement compression.",
        evalArgs: "arguments passed from aliased command",
        options: `arguments from aliased command, in format: -test 1 -example a b c -arg
split into an array of objects: [{"test", "1"}, {"example", ["a", "b", "c"]}, {"-arg", ""}]`,
        exit: `can be used to exit out of the script with a message that will be outputted.
Image will not be outputted if exit is called, but time information will.
Script can also be exitted out of by returning in the outer scope.`
    };

    let varsDesc = {
        w: "image width",
        h: "image height",
        pixels: `raw image pixels, flattened Uint8Array of RGB pixel values.
Only tamper with this if you know exactly what you're doing.
Length: 3 * img.w * img.h - Index formula: 3 * (y * img.w + x)`
    };

    let funcsDesc = {
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
        drawLineThick: "draws a very THICK line",
        drawPoints: "draws an array of points, all with the same color, each point is 2 integers. Optionalize for all points.",
        Gus: `highly cyc function, loads image from special GUS string.
GUS encoder left as an excercise to the user.`
    };

    let colorDesc = {
        r: "red channel value (0 - 255)",
        g: "green channel value (0 - 255)",
        b: "blue channel value (0 - 255)",
        constructor: "creates color from RGB values, automatically clamped and rounded",
        fromHex: "creates color from hex string, # is optional",
        normalize: "returns normalized color components",
        toHSV: `returns equivalent HSV values of color
H: 0 - 360, S: 0 - 1, V: 0 - 1`,
        fromHSV: "creates color from HSV values, converted to equivalent RGB"
    };

    let colorProps = Object.keys(Colors.black).concat(Utils.getClassSigs(Color));

    let clrNames = Object.keys(Colors);
    let clrVals = clrNames.map(x => `Color(${Colors[x].r}, ${Colors[x].g} ${Colors[x].b})`);
    let clrDescs = {};
    for(let i = 0; i < clrVals.length; i++) {
        clrDescs[clrNames[i]] = clrVals[i];
    }

    let inputInfo = Utils.genDesc("Special input variables", inputVars, inputDesc)
    let imgVars = Utils.genDesc("Image properties", Object.keys(new Image(1, 1)), varsDesc);
    let imgFuncs = Utils.genDesc("Image functions", Utils.getClassSigs(Image), funcsDesc);
    let colorInfo = Utils.genDesc("Color object (required in drawing)", colorProps, colorDesc);
    let namedColors = Utils.genDesc("Named and cached colors (Colors.name)", clrNames, clrDescs);

    return `${header}\n\n${usage}\n\n--------------\n\n${inputInfo}\n\n${imgVars}\n\n${imgFuncs}\n\n${colorInfo}\n\n${namedColors}\n\n${footer}`;
}

function handleMsg() {
    let d1 = Date.now(),
        d2 = Date.now();

    if(tag.args == "help") {
        msg.reply(generateHelp());
    }

    let code = tag.args,
        evalArgs = "",
        options = {};

    if(msg.attachments.length) {
        let url = msg.attachments[0].url,
            resp;
        try {
            resp = http.request(url);
        } catch (e) {
            msg.reply("Could not fetch attachment file. Error: " + e.message);
        }

        if(resp.status == 200) {
            code = resp.data;
            evalArgs = tag.args || "";
        } else {
            msg.reply("Could not fetch attachment file. Code: " + resp.status);
        }
    } else if(code) {
        let start = code.indexOf("\`\`\`");
        if(start == -1 || code.slice(-3) != "\`\`\`") {
            msg.reply("Code must be enclosed in triple backticks (\`\`\`). See %t cycdraw help");
        }

        evalArgs = code.slice(0, start);
        code = code.slice(start + 3, -3);
        if(code.slice(0, 3) == "js\n") {
            code = code.slice(3);
        }

        const urlexp = /\w+?:\/\/(.+\.)?[\w|\d]+\.\w+\/?.*/g;
        if(urlexp.test(code)) {
            let resp;
            try {
                resp = http.request(code);
            } catch (e) {
                msg.reply("URL invalid or unreachable. Error: " + e.message);
            }

            if(resp.status == 200) {
                code = resp.data;
            } else {
                msg.reply("Unsuccessful download. Code: " + resp.status);
            }
        }
    }
    if(!code) {
        msg.reply("No code provided. Help: %t cycdraw help");
    }

    evalArgs = evalArgs.replace("\n", " ");
    let flags = evalArgs.match(/--[\w|\d]+/g);
    
    let showTimes = false,
        highRes = false;

    if(flags) {
        showTimes = flags.includes("--time");
        highRes = flags.includes("--hires");

        if(flags.includes("--append_code")) {
            let index1 = evalArgs.find("\`");
            let index2 = evalArgs.indexOf("\`", index1 + 1);
            
            if(index1 && index2) {
                let newCode = evalArgs.slice(index1 + 1, index2 - 1);
                evalArgs = evalArgs.slice(0, index1 - 1) + evalArgs.slice(index2 + 1);
                code += ";" + newCode;
            }
        }

        let flagStrs = evalArgs.match(/--[\w|\d]+\s?/g);
        for(let i = 0; i < flagStrs.length; i++) {
            evalArgs = evalArgs.replace(flagStrs[i], "");
        }
    }
    
    code = `let output = (() => {try {${code}} catch(err) {return err;}})(); return [img, output];`;

    let optionsExp = /-([\w|\d]+)\s*([^-]+\b\W?)?/g;
    let argsExp = /"([^"\\]*(?:\\.[^"\\]*)*)"|[^\s]+/g;
    let match;

    while(match = optionsExp.exec(evalArgs)) {
        let args = match[2],
            argsType;

        if(!args || !args.length) {
            args = "";
            argsType = "empty";
        } else if(!isNaN(args)) {
            argsType = "number";
        } else if(args.includes(" ") || args.includes("\"")) {
            argsExp.lastIndex = 0;
            let match2, argsList = [];

            while(match2 = argsExp.exec(args)) {
                if(match2[1]) {
                    argsList.push(match2[1].replace("\\\"", "\""));
                } else {
                    argsList.push(match2[0]);
                }
            }

            args = argsList;
            if(args.length == 1) {
                args = args[0];
                argsType = "string";
            } else {
                argsType = "multiple";
            }
        } else {
            argsType = "string";
        }

        options[match[1]] = [args, argsType];
    }
    benchmark["resolve_code"] = Date.now() - d1;

    d1 = Date.now();
    let w = highRes ? 1440 : 720,
        h = highRes ? 1080 : 480;
    let img = new Image(w, h);
    benchmark["create_img"] = Date.now() - d1;

    d1 = Date.now();
    let output = "";

    [img, output] = Function("evalArgs", "options", "msg", "http", "img", "Image", "Color", "Colors", "Buffer2", "exit", "Utils", "Point", "Grid", code)(
                              evalArgs,   options,   msg,   http,   img,   Image,   Color,   Colors,   Buffer2,   exit,   Utils,   Point,   Grid);

    if(output instanceof Error) {
        if(output.name == "ExitError") {
            output = output.message;
        } else {
            output = `\`\`\`js\nError occured while drawing. Stacktrace:\n${output.stack}\`\`\``;
        }
    }

    if(!isNaN(output)){
        output = output.toString();
    }

    if(!img || !img instanceof Image || img.w == null || img.h == null || img.pixels == null || !img.pixels.length) {
        throw new DrawingError("Invalid image.");
    }
    benchmark["draw_img"] = Date.now() - d1;

    d1 = Date.now();
    let embed = {};
    if(!output) {
        let buf = img.encode();

        embed.file = {
            name: "cyc_save.png",
            data: buf
        };
    }
    benchmark["encode_img"] = Date.now() - d1;
    benchmark["total"] = Date.now() - d2;

    if(showTimes) {
        let keys = Object.keys(benchmark);
        let names = keys.map(x => x + Utils.padding(benchmark[x], x)).join(" | ");
        let times = keys.map(x => benchmark[x] + Utils.padding(x, benchmark[x])).join(" | ");

        embed.embed = {
            title: "Execution times",
            description: `\`\`\`js\nname:      ${names}\ntime (ms): ${times}\`\`\``
        };
    }

    msg.reply(output, embed);
}

function writeImg() {
    const fs = require("fs");

    let d1 = Date.now(),
        d2 = Date.now();
    let w = 720,
        h = 480;
    let img = new Image(w, h);
    benchmark["create_img"] = Date.now() - d1;
    d1 = Date.now();

    benchmark["draw_img"] = Date.now() - d1;
    d1 = Date.now();
    let buf = img.encode();
    benchmark["encode_img"] = Date.now() - d1;

    d1 = Date.now();
    fs.writeFile("./amongus1.png", Buffer.from(buf))
    benchmark["write_file"] = Date.now() - d1;

    benchmark["total"] = Date.now() - d2;
    console.log(benchmark);
    console.log(amogstr);
    console.log(img.pixels)
}

let benchmark = {};
let amogstr = "";

if(Object.keys(this).length) {
    handleMsg();
} else {
    writeImg();
}