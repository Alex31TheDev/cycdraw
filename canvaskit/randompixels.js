"use strict";

if (!tag.args) msg.reply("width height");

let [width, height] = tag.args.split(" ");
[width, height] = [Number.parseInt(width, 10), Number.parseInt(height, 10)];

if (Number.isNaN(width) || Number.isNaN(height) || width <= 0 || height <= 0) msg.reply("width height");

util.loadLibrary = "lodepng";
util._isolateGlobals = false;

if (util.env) {
    eval(util.fetchTag("canvaskitloader").body);
} else {
    util.executeTag("canvaskitloader");
}

function fastRandom255() {
    fastRandom255.seed ^= fastRandom255.seed << 13;
    fastRandom255.seed ^= fastRandom255.seed >>> 17;
    fastRandom255.seed ^= fastRandom255.seed << 5;
    return fastRandom255.seed & 0xff;
}

fastRandom255.seed = 1;

const pixels = new Uint8Array(4 * width * height).fill(255);

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const pos = 4 * (y * width + x);
        pixels[pos] = fastRandom255();
        pixels[pos + 1] = fastRandom255();
        pixels[pos + 2] = fastRandom255();
    }
}

msg.reply({
    file: {
        name: "garmin.png",
        data: lodepng.encode({
            width,
            height,
            data: pixels
        })
    }
});
