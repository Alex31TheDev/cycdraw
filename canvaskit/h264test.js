"use strict";

const width = 64,
    height = 64,
    fps = 30,
    durationSecs = 60;

function makeFrame(r, g, b) {
    const pixels = new Uint8Array(width * height * 4);

    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = 255;
    }

    return pixels;
}

util.loadLibrary = "h264";
util.loadSource = "url";
util._isolateGlobals = false;
eval(util.fetchTag("canvaskitloader").body);

const encoder = H264MP4Encoder.createH264MP4Encoder();
encoder.outputFilename = "rgb-cycle.mp4";
encoder.width = width;
encoder.height = height;
encoder.frameRate = fps;
encoder.kbps = 0;
encoder.speed = 0;
encoder.quantizationParameter = 10;
encoder.groupOfPictures = 1;
encoder.temporalDenoise = false;
encoder.desiredNaluBytes = 0;
encoder.initialize();

const frames = [makeFrame(255, 0, 0), makeFrame(0, 255, 0), makeFrame(0, 0, 255)],
    totalFrames = fps * durationSecs;

Benchmark.startTiming("render_frames");

for (let i = 0; i < totalFrames; i++) {
    encoder.addFrameRgba(frames[i % frames.length]);
}

Benchmark.stopTiming("render_frames");

Benchmark.startTiming("finalize_video");
encoder.finalize();
Benchmark.stopTiming("finalize_video");

const fileName = encoder.outputFilename,
    out = encoder.FS.readFile(fileName);
encoder.delete();

msg.reply(Benchmark.getAll(true), {
    file: {
        name: fileName,
        data: out
    }
});
