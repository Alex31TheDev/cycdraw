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
