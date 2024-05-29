
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