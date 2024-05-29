const zlib = require("zlib")
const fs = require("fs")


class Color {
    constructor(r, g, b) {
        this.r = Math.min(Math.max(Math.round(r), 0), 255)
        this.g = Math.min(Math.max(Math.round(g), 0), 255)
        this.b = Math.min(Math.max(Math.round(b), 0), 255)
    }
}

function makeCRC32Table() {
    let crcTable = []
    for(let n = 0; n < 256; n++) {
        c = n
        for(let k = 0; k < 8; k++) {
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1))
        }
        crcTable[n] = c
    }
    return crcTable
}

function writeCRC32(buf, table, start, end) {
    let crc = 0 ^ (-1)
    console.log(crc)
    for(let i = start; i < end; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
    }
    crc = (crc ^ (-1)) >>> 0
    
    buf.writeUInt32BE(crc, end)
}

function printBuf(buf) {
    for(let i = 0; i < buf.length; i += 30) {
        console.log(buf.slice(i, i + 30))
    }
}

function filterPixels(pixels, width, height) {
    buf = Buffer.alloc(width * height * 3 + height)
    
    for(let y = 0; y < height; y++) {
        buf[y * width * 3 + y] = 1
        for(let x = 0; x < width; x++) {
        	    let pos = y * width + x
        	    let pos_b = pos * 3 + y
        	    let r_f, g_f, b_f
        	    
        	    if(x == 0) {
        	        r_f = pixels[pos].r
        	        g_f = pixels[pos].g
        	        b_f = pixels[pos].b
        	    } else {
        	        r_f = pixels[pos].r - pixels[pos - 1].r
        	        g_f = pixels[pos].g - pixels[pos - 1].g
        	        b_f = pixels[pos].b - pixels[pos - 1].b
        	    }
        	    
        	    buf[pos_b + 1] = r_f & 0xff
            buf[pos_b + 2] = g_f & 0xff
            buf[pos_b + 3] = b_f & 0xff
        }
    }
    
    return buf
}

function png(pixels, width, height) {
    data = filterPixels(pixels, width, height)
    data = zlib.deflateSync(data)
	
    const sig_size = 8
    const chunk_size = 12

    const ihdr_size = 13
    const ihdr_offset = sig_size

    const idat_size = data.length
    const idat_offset = ihdr_offset + ihdr_size + chunk_size

    const iend_offset = idat_offset + idat_size + chunk_size
    const buffer_size = iend_offset + chunk_size
    
    let buf = Buffer.alloc(buffer_size)
    const crcTable = makeCRC32Table()
    
//SIG
    buf.write("\x89PNG\x0d\x0a\x1a\x0a", 0, "ascii")
    
//IHDR
    buf.writeUInt32BE(ihdr_size, ihdr_offset)
    buf.write("IHDR", ihdr_offset + 4, "ascii")
    buf.writeUInt32BE(width, ihdr_offset + 8)
    buf.writeUInt32BE(height, ihdr_offset + 12)
    buf.write("\x08\x02\x00\x00\x00", ihdr_offset + 16, "ascii")
    writeCRC32(buf, crcTable, ihdr_offset + 4, idat_offset - 4)

//IDAT
    buf.writeUInt32BE(idat_size, idat_offset)
    buf.write("IDAT", idat_offset + 4, "ascii")
    for(let i = 0; i < data.length; i++) {
        buf[idat_offset + i + 8] = data[i]
    }
    writeCRC32(buf, crcTable, idat_offset + 4, iend_offset - 4)

//IEND
    buf.write("IEND", iend_offset + 4, "ascii")
    writeCRC32(buf, crcTable, iend_offset + 4, iend_offset + 8)
    
    return buf
}

function f(x) {
    return x < 0 ? 0 : Math.sqrt(x)
}

function drawLine(pixels, w, h, xStart, yStart, xEnd, yEnd, color) {
    let slope = (yEnd - yStart) / (xEnd - xStart)
    console.log(slope)
    for(let x = xStart; x <= xEnd; x += slope) {
        for(let y = yStart; y <= yEnd; y += slope) {
        	    pixels[Math.floor(y * w + x)] = color
        	}
    }
}


let w = 1280, h = 720
let pixels = Array(w * h).fill(new Color(0, 0, 0))
let white = new Color(255, 255, 255)

let xPrev, yPrev
for(let x = 0; x < w; x++) {
    let nx = (x - w / 2) / 100
    let y = h - f(nx) * 100 - h / 2
    
    if (x == 0) {
        xPrev = x
        yPrev = y
    } else {
        drawLine(pixels, w, h, xPrev, yPrev, x, y, white)
    }
}

console.log(pixels)
buf = png(pixels, w, h)
fs.writeFile("/storage/emulated/0/amongus1.png", buf)

