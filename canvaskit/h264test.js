"use strict";

const width = 64,
    height = 64,
    fps = 30,
    durationSecs = 60;

const audioSampleRate = 48000,
    audioChannels = 1,
    audioBitrate = 128000,
    audioFrequency = 440;

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

function fillSineWave(samples, frequency, sampleRate, phaseState) {
    const amplitude = 12000;
    let phase = phaseState.value;
    const phaseStep = (Math.PI * 2 * frequency) / sampleRate;

    for (let i = 0; i < samples.length; ++i) {
        samples[i] = Math.round(Math.sin(phase) * amplitude);
        phase += phaseStep;
        if (phase >= Math.PI * 2) {
            phase -= Math.PI * 2;
        }
    }

    phaseState.value = phase;
}

util.loadLibrary = "h264";
util._isolateGlobals = false;

if (util.env) {
    eval(util.fetchTag("canvaskitloader").body);
} else {
    util.executeTag("canvaskitloader");
}

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
encoder.audioSampleRate = audioSampleRate;
encoder.audioChannels = audioChannels;
encoder.audioBitrate = audioBitrate;
encoder.initialize();

const frames = [makeFrame(255, 0, 0), makeFrame(0, 255, 0), makeFrame(0, 0, 255)],
    totalFrames = fps * durationSecs,
    samplesPerFrame = audioSampleRate / fps;

if (!Number.isInteger(samplesPerFrame)) {
    throw new Error("audioSampleRate must divide evenly by fps");
}

const audioSampleCount = samplesPerFrame * audioChannels,
    audioSamples = new Int16Array(audioSampleCount),
    audioBytes = new Uint8Array(audioSamples.buffer),
    phaseState = { value: 0 };

Benchmark.startTiming("render_frames");

for (let i = 0; i < totalFrames; i++) {
    encoder.addFrameRgba(frames[i % frames.length]);
    fillSineWave(audioSamples, audioFrequency, audioSampleRate, phaseState);
    encoder.addAudioSamples(audioBytes);
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
