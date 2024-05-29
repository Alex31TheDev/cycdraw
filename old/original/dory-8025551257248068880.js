class Buffer2 extends Uint8Array {
    static alloc(size) {
        return new Buffer2(size);
    }  
    
    toString() {
        let str = `Buffer2 Size: ${this.length} bytes`;
        let len = this.length, i = 0;
        
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
        for(let i = 0; i < length; i++) {
            if((i + start) >= src.length || (i + offset) >= this.length) {
                return;
            }

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
    
    static fromHex(hex) {
        if(hex.startsWith("#")) {
        	    hex = hex.slice(1);
        	}
        	
        if(hex.length % 3 != 0) {
	           throw new DrawingError("Invalid hex color.");
	       }
        	
        let comp = hex.match(/.{2}/g);
        let r = parseInt(comp[0], 16) || 0,
            g = parseInt(comp[1], 16) || 0,
            b = parseInt(comp[2], 16) || 0;
	       
        return new Color(r, g, b);
    }

    static fromHSV(h, s, v) {

    }

    toHSV() {
        //https://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/

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
    purple: new Color(128, 0, 128),
    purple: new Color(147, 112, 219),
    red: new Color(255, 0, 0),
    silver: new Color(192, 192, 192),
    tan: new Color(210, 180, 140),
    violet: new Color(138, 43, 226),
    violet: new Color(238, 130, 238),
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
        
        let regex = new RegExp("^\\s{4}((?:static\\s)?\\w+\\s*\\((?:.+\\)?))\\s{", "gm");
        let match = regex.exec(src);
        
        while(match) {
            sigs.push(match[1]);
            match = regex.exec(src);
        }
        
        return sigs;
    },
    
    genDesc(header, vals, descDict) {
        let noDesc = "NO DESCRIPTION PROVIDED / WIP";
        let desc = "";
        
        for(let i = 0; i < vals.length; i++) {
        	    let name = vals[i];
        	    if(name.includes("(")) {
        	        let regex = /(?:static\s)?(.+)\(/;
        	        name = name.match(regex)[1];
        	    }
        	    
        	    let title = `    ${i + 1}. ${vals[i]} - `;
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
        for(let i = 0; i < pixels.length; i++) {
            img.pixels[i] = pixels[i];
        }

        return img;
    }
    
    static loadFile(buf) {
        //
        ;
    }

    static Gus(str) {
        let dim = str.split("/")[0].split(",");

        let w = parseInt(dim[0]);
        let h = parseInt(dim[1]);

        let pixels = [];

        for(let i = dim.join("").length + 2; i < str.length; i++) {
            let code = str.charCodeAt(i) - 430;

            if(str[i] == "(") {
                let end = str.indexOf("){", i);

                if(end) {
                    let end2, num;
                    [end2, num] = Utils.findMult(str, end);

                    if(num) {
                        let group = str.slice(i + 1, end);
                        let codes = [...group].map(x => x.charCodeAt(0) - 430);

                        Utils.push_n(pixels, num, ...codes);
                        i = end2;
                    }
                }
            } else if(str[i + 1] == "{") {
                let end, num;
                [end, num] = Utils.findMult(str, i);

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

    getPixel(x, y) {
        if(!this.inBounds(x, y)) return Colors.clr69;

        x = Math.floor(x);
        y = Math.floor(y);

        let pos = 3 * (y * this.w + x);
        return new Color(this.pixels[pos],
        	                 this.pixels[pos + 1],
        	                 this.pixels[pos + 2]);
    }
  
    setPixel(x, y, color) {
        if(!this.inBounds(x, y)) return;
        this.setPixel_u(Math.floor(x), Math.floor(y), color);
    }
    
    setPixel_u(x, y, color) {
        let pos = 3 * (y * this.w + x);
        this.pixels[pos] = color.r;
        this.pixels[pos + 1] = color.g;
        this.pixels[pos + 2] = color.b;
    }
    
    setPixel_u_rgb(x, y, r, g, b) {
        let pos = 3 * (y * this.w + x);
        this.pixels[pos] = r;
        this.pixels[pos + 1] = g;
        this.pixels[pos + 2] = b;
    }
    
    clear(color) {
        for(let i = 0; i < this.pixels.length; i += 3) {
            this.pixels[i] = color.r;
            this.pixels[i + 1] = color.g;
            this.pixels[i + 2] = color.b;
        }
    }

    fill(x1, y1, x2, y2, color) {
        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = this.clamp(x2, y2);

        let nx1 = Math.min(x1, x2);
        x2 = Math.max(x1, x2);
        let ny1 = Math.min(y1, y2);
        y2 = Math.max(y1, y2);

        for(let x = nx1; x <= x2; x++) {
            for(let y = ny1; y <= y2; y++) {
                this.setPixel_u(x, y, color);
            }
        }
    }

    blit(x, y, src) {
        let sw = src.w,
            sh = src.h;

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

    fillRadius(x, y, color, r) {
        [x, y] = this.clamp(x, y);

        let x1 = Math.max(0, x - r);
        let y1 = Math.max(0, y - r);
        let x2 = Math.min(this.w - 1, x + r);
        let y2 = Math.min(this.h - 1, y + r);

        for(let x = x1; x <= x2; x++) {
            for(let y = y1; y <= y2; y++) {
                this.setPixel_u(x, y, color);
            }
        }
    }

    drawLine(x1, y1, x2, y2, color) {
        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = this.clamp(x2, y2);
        
        if(x1 > x2) {
        	    let tmp = x2;
        	    x2 = x1;
        	    x1 = tmp;
        	}
        	if(y1 > y2) {
        	    let tmp = y2;
        	    y2 = y1;
        	    y1 = tmp;
        	}
        
        //https://www.cs.helsinki.fi/group/goa/mallinnus/lines/bresenh.html
        let dx = x2 - x1;
        let dy = y2 - y1;
        
        if(Math.abs(dy) < Math.abs(dx)) {
            let yi = 1;
            if(dy < 0) {
                yi = -1;
                dy = -dy;
            }
            
            let err = 2 * dy - dx;
            for(; x1 <= x2; x1++) {
               this.setPixel_u(x1, y1, color);
           
        	       if(err > 0) { 
        	           err += 2 * dy - dx;
        	           y1 += yi; 
        	       } else {
        	           err += 2 * dy;
        	       }
        	    }
        	} else {
            let xi = 1;
            if(dx < 0) {
                xi = -1;
                dx = -dx;
            }
            
            let err = 2 * dx - dy;
            for(; y1 <= y2; y1++) {
               this.setPixel_u(x1, y1, color);
           
        	       if(err > 0) { 
        	           err += 2 * dx - dy;
        	           x1 += xi; 
        	       } else {
        	           err += 2 * dx;
        	       }
        	    }
        	}
    }
    
    drawLineThick(x1, x2, y1, y2, color, thicc) {
    	
    }

    fillTriangle(x1, y1, x2, y2, x3, y3, color) {
        [x1, y1] = this.clamp(x1, y1);
        [x2, y2] = this.clamp(x2, y2);
        [x3, y3] = this.clamp(x3, y3);

        function getLinePoints(x1, y1, x2, y2) {

        }

        //TODO: СУС DRAWING FUNC
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
        if(ctype < 0 || ctype > 2) {
        	    throw new EncoderError("Invalid compression type.");
        	}
        	
        let d1 = Date.now(), compressed;
        if(ctype == 0) {
        	    compressed = this.blurredCompress();
        	} else {
        	    compressed = this.dynamicHuffmannDeflate();
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

function writeImg() {
    const fs = require("fs");

    let d1 = Date.now(), d2 = Date.now();
    let w = 720,
        h = 480;
    let img = new Image(w, h);
    benchmark["create_img"] = Date.now() - d1;
    d1 = Date.now();
    
    
    
    //drawing code
    img.fill(0,0,100,100,Colors.green);
    img.drawLine(20,20,50,200,Colors.red);
    
    
    benchmark["draw_img"] = Date.now() - d1;
    d1 = Date.now();
    let buf = img.encode();
    benchmark["encode_img"] = Date.now() - d1;
    
    d1 = Date.now();  
    fs.writeFile("/storage/emulated/0/amongus1.png", Buffer.from(buf))
    benchmark["write_file"] = Date.now() - d1;
    
    benchmark["total"] = Date.now() - d2;
    console.log(benchmark);
    console.log(img.pixels)
}

function exit(msg) {
    throw new ExitError(msg);
}

function generateHelp() {
    let header = `ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ
ඞ----СУС DRAW 1996 Help document---- ඞ
ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ ඞ
Very sus tag for drawing images. Made by sqrt(-i)#1415`;

    let footer = `Help last updated: 27.03.2022`;

    let usage = `Usage: %t cycdraw \`\`\`[drawing code]\`\`\`
Code can be uploaded as a message, enclosed in backticks as plain text or an URL, or as an attachment.
Aliases of cycdraw can be created, but code can not be uploaded as an attachment. Use an url instead.
Code can be downloaded using %t raw cycdraw and ran locally in node. Drawing code is to be placed in writeImg()

Example usage:
%t cycdraw \`\`\`img.fill(0, 0, 100, 100, Colors.clr69);\`\`\`;
%t cycdraw \`\`\`https:\/\/pastebin.com/raw/umhLsJzt\`\`\`
%t cycdraw --time \`\`\`img.drawLine(0, 0, img.w, img.h, Colors.red);\`\`\`
              ^--- attaches information about execution time
                   must be first argument in aliased commands
                   
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
        drawLineThick: "draws a thick line",
        drawPoints: "draws an array of points, all with the same color, each point is 2 integers. Optionalize for all points.",
        Gus: `highly cyc function, loads image from special GUS string.
GUS encoder left as an excercise to the user.`
    };
    
    colorDesc = {
        r: "red channel value (0 - 255)",
        g: "green channel value (0 - 255)",
        b: "blue channel value (0 - 255)",
        constructor: "creates color from RGB values, automatically clamped and rounded",
        fromHex: "creates color from hex string, # is optional"
    };
    
    let clrNames = Object.keys(Colors);
    let clrVals = clrNames.map(x => `Color(${Colors[x].r}, ${Colors[x].g} ${Colors[x].b})`);
    
    let clrDescs = {};
    for(let i = 0; i < clrVals.length; i++) {
        clrDescs[clrNames[i]] = clrVals[i];
    }
    
    let inputInfo = Utils.genDesc("Special input variables", inputVars, inputDesc)
    let imgVars = Utils.genDesc("Image properties", Object.keys(new Image(1, 1)), varsDesc);
    let imgFuncs = Utils.genDesc("Image functions", Utils.getClassSigs(Image), funcsDesc);
    let colorInfo = Utils.genDesc("Color object (required in drawing)", Object.keys(Colors.black).concat(Utils.getClassSigs(Color)), colorDesc);
    let namedColors = Utils.genDesc("Named and cached colors (Colors.name)", clrNames, clrDescs);
    
    return `${header}\n\n${usage}\n\n--------------\n\n${inputInfo}\n\n${imgVars}\n\n${imgFuncs}\n\n${colorInfo}\n\n${namedColors}\n\n${footer}`;
}

function handleMsg() {
    let d1 = Date.now(), d2 = Date.now();
    if(tag.args == "help") {
        msg.reply(generateHelp());
    }
    
    let code = tag.args, evalArgs = "";
    if(msg.attachments.length) {
    	   let url = msg.attachments[0].url;
    	   try {
    	       let resp = http.request(url);
    	       code = resp.data;
    	       evalArgs = tag.args;
        } catch(e) {
           msg.reply("Could not fetch file. " + e.message);
        }
    } else if(code) {
        let start = code.indexOf("\`\`\`");
        if(start == -1 || code.slice(-3) != "\`\`\`") {
            msg.reply("Code must be enclosed in backticks. See %t cycdraw help");
        }
    
        evalArgs = code.slice(0, start - 1);
        code = code.slice(start + 3, -3);
        if(code.slice(0, 3) == "js\n") {
            code = code.slice(3);	
        }
        
        const urlexp = /\w+?:\/\/(.+\.)?[\w|\d]+\.\w+\/?.*/g;
        if(urlexp.test(code)) {
            try {
                let resp = http.request(code);
        	        code = resp.data;
        	    } catch(e) {
        	        msg.reply("URL invalid or unreachable. " + e.message);
        	    }
        }
    } if(!code) {
        msg.reply("No code provided. Help: %t cycdraw help");
    }
    
    code = `(() => {${code}})();`;
    evalArgs = evalArgs.replace("\n", "");
    
    let showTimes = false;
    if(evalArgs.split(" ")[0] == "--time") {
        showTimes = true;
        evalArgs = evalArgs.slice(evalArgs.indexOf(" ") + 1);
    }
    benchmark["resolve_code"] = Date.now() - d1;
        
    d1 = Date.now();
    let w = 720,
        h = 480;
    let img = new Image(w, h);
    benchmark["create_img"] = Date.now() - d1;
    
    d1 = Date.now();
    let output = "";
    try {
        with(evalArgs, msg, http, img, Image, Color, Colors, Buffer2, exit) output = eval(code);
    } catch(err) {
        if(err.name == "ExitError") {
        	    output = err.message;
        	} else {
        	    output = `\`\`\`js\nError occured while drawing. Stacktrace:\n${err.stack}\`\`\``;
        	}
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

let benchmark = {};
if(Object.keys(this).length) {
    handleMsg();
} else {
    writeImg();
}
