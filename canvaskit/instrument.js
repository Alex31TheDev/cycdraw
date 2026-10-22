"use strict";

class InstrumentError extends CustomError {}

class InstrumentGenerator {
    static sampleRate = 48000;
    static pitchMin = 25;
    static pitchMax = 105;
    static tableSize = 150;
    static defaultAmplitude = 8000;

    static get wavetable() {
        return (InstrumentGenerator._wavetable ??= new Float32Array(InstrumentGenerator._wavetableData));
    }

    static valueToPitch(val, maxVal, pitchMin, pitchMax) {
        if (maxVal == null || maxVal <= 0) return pitchMin ?? InstrumentGenerator.pitchMin;

        pitchMin ??= InstrumentGenerator.pitchMin;
        pitchMax ??= InstrumentGenerator.pitchMax;

        const clamped = LoaderUtils.clamp(val, 0, maxVal);
        return (clamped / maxVal) * (pitchMax - pitchMin) + pitchMin;
    }

    static pitchToFrequency(pitch) {
        return 147 * Math.pow(2, (pitch - 62) / 12);
    }

    static valueToFrequency(val, maxVal, pitchMin, pitchMax) {
        const pitch = InstrumentGenerator.valueToPitch(val, maxVal, pitchMin, pitchMax);
        return InstrumentGenerator.pitchToFrequency(pitch);
    }

    static calculateVelocity(pitch, noteCount = 1) {
        const pitchDelta = Math.max(0, InstrumentGenerator.pitchMax - Math.floor(pitch)),
            countFactor = Math.pow(Math.max(1, noteCount), -0.25);

        let vel = Math.floor((pitchDelta * pitchDelta * countFactor * 64) / 2);
        if (vel < 256) vel *= vel;

        return Math.min(1, Math.max(0.05, vel / 127));
    }

    constructor(options = {}) {
        options = LoaderUtils.setValuesWithDefaults({}, options, InstrumentGenerator._constructorDefaults);

        this.options = options;

        this.sampleRate = options.sampleRate;
        this.amplitude = options.amplitude;

        this.attackMs = options.attackMs;
        this.releaseMs = options.releaseMs;
    }

    fillBuffer(buffer, freqs, phaseStates, options = {}) {
        options = LoaderUtils.setValuesWithDefaults({}, options, InstrumentGenerator._fillBufferDefaults);

        const isUint8 = buffer instanceof Uint8Array,
            samples = isUint8 ? new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2) : buffer,
            count = samples.length;

        if (!count) return;

        samples.fill(0);

        if (!Array.isArray(phaseStates)) return;

        const noteCount = Array.isArray(freqs) ? freqs.length : 0,
            amp = noteCount > 0 ? (options.amplitude ?? this.amplitude) / noteCount : 0;

        const attackSamples = Math.max(1, Math.floor((this.sampleRate * this.attackMs) / 1000)),
            releaseSamples = Math.max(1, Math.floor((this.sampleRate * this.releaseMs) / 1000));

        const attackStep = 1 / attackSamples,
            releaseStep = 1 / releaseSamples;

        const enableEnvelope = options.envelope,
            applyVelocity = options.applyVelocity;

        const maxVoices = Math.max(noteCount, phaseStates.length);

        for (let i = 0; i < maxVoices; i++) {
            const hasNote = i < noteCount && typeof freqs[i] !== "undefined" && freqs[i] > 0,
                phaseState = phaseStates[i] ?? (phaseStates[i] = { phase: 0, gain: 0, value: 0 });

            if (typeof phaseState.phase === "undefined") {
                phaseState.phase = phaseState.value ?? 0;
            }
            if (typeof phaseState.gain === "undefined") {
                phaseState.gain = 0;
            }

            if (!hasNote && phaseState.gain <= 0.0001) {
                phaseState.gain = 0;
                continue;
            }

            const freq = hasNote ? freqs[i] : phaseState.lastFreq ?? 147;
            if (hasNote) phaseState.lastFreq = freq;

            const step = (freq / this.sampleRate) * InstrumentGenerator.tableSize;

            const velocity =
                hasNote && applyVelocity
                    ? InstrumentGenerator.calculateVelocity(62 + 12 * Math.log2(freq / 147), noteCount)
                    : 1;

            const targetGain = hasNote ? 1 : 0,
                noteAmp = amp * velocity;

            let phase = phaseState.phase,
                gain = phaseState.gain;

            for (let j = 0; j < count; j++) {
                if (enableEnvelope) {
                    if (gain < targetGain) {
                        gain = Math.min(targetGain, gain + attackStep);
                    } else if (gain > targetGain) {
                        gain = Math.max(targetGain, gain - releaseStep);
                    }
                } else {
                    gain = targetGain;
                }

                if (gain <= 0.0001 && targetGain === 0) {
                    gain = 0;
                    break;
                }

                const idx = Math.floor(phase),
                    frac = phase - idx;

                const s1 = InstrumentGenerator.wavetable[idx],
                    s2 = InstrumentGenerator.wavetable[(idx + 1) % InstrumentGenerator.tableSize];

                const waveVal = s1 + frac * (s2 - s1);

                samples[j] += Math.round(waveVal * (hasNote ? noteAmp : phaseState.lastAmp ?? noteAmp) * gain);
                phase += step;

                if (phase >= InstrumentGenerator.tableSize) {
                    phase -= InstrumentGenerator.tableSize;
                }
            }

            phaseState.phase = phase;
            phaseState.value = phase;
            phaseState.gain = gain;
            if (hasNote) phaseState.lastAmp = noteAmp;
        }

        while (phaseStates.length > noteCount && phaseStates[phaseStates.length - 1].gain <= 0) {
            phaseStates.pop();
        }
    }

    fillValues(buffer, values, maxVal, phaseStates, options = {}) {
        options = LoaderUtils.guaranteeObject(options);

        const hasValues = Array.isArray(values) && values.length > 0;
        const freqs = hasValues ? values.map(val => InstrumentGenerator.valueToFrequency(val, maxVal)) : [];

        this.fillBuffer(buffer, freqs, phaseStates, { applyVelocity: true, ...options });
    }

    static _wavetable = null;

    static _constructorDefaults = Object.freeze({
        sampleRate: InstrumentGenerator.sampleRate,
        amplitude: InstrumentGenerator.defaultAmplitude,
        attackMs: 2,
        releaseMs: 15
    });

    static _fillBufferDefaults = Object.freeze({
        amplitude: null,
        envelope: true,
        applyVelocity: false
    });

    static _wavetableData = Object.freeze([
        -0.00631, 0.11948, 0.22011, 0.33332, 0.43395, 0.50942, 0.58489, 0.63521, 0.66037, 0.68553, 0.68553, 0.68553,
        0.67295, 0.64779, 0.62263, 0.59747, 0.58489, 0.58489, 0.58489, 0.59747, 0.62263, 0.64779, 0.69811, 0.74842,
        0.79874, 0.84905, 0.89937, 0.94968, 0.97484, 1.0, 1.0, 0.98742, 0.96226, 0.91195, 0.86163, 0.78616, 0.71068,
        0.62263, 0.53458, 0.43395, 0.35848, 0.283, 0.20753, 0.15721, 0.11948, 0.09432, 0.08174, 0.08174, 0.09432,
        0.1069, 0.11948, 0.14463, 0.15721, 0.16979, 0.16979, 0.15721, 0.13205, 0.09432, 0.044, -0.01889, -0.09436,
        -0.16983, -0.24531, -0.32078, -0.39625, -0.45914, -0.50945, -0.54719, -0.57235, -0.57235, -0.57235, -0.53461,
        -0.49688, -0.43398, -0.37109, -0.29562, -0.22015, -0.15726, -0.09436, -0.03147, 0.00626, 0.044, 0.05658,
        0.05658, 0.044, 0.01884, -0.00631, -0.05663, -0.09436, -0.14468, -0.19499, -0.22015, -0.25788, -0.27046,
        -0.28304, -0.27046, -0.25788, -0.23273, -0.19499, -0.15726, -0.11952, -0.08179, -0.04405, -0.01889, -0.00631,
        -0.00631, -0.01889, -0.04405, -0.08179, -0.1321, -0.19499, -0.25788, -0.33336, -0.40883, -0.4843, -0.54719,
        -0.59751, -0.64782, -0.67298, -0.69813, -0.69813, -0.68556, -0.6604, -0.62266, -0.58493, -0.53461, -0.49688,
        -0.44656, -0.40883, -0.38367, -0.35851, -0.34593, -0.34593, -0.35851, -0.38367, -0.40883, -0.44656, -0.4843,
        -0.50945, -0.54719, -0.55977, -0.57235, -0.57235, -0.54719, -0.50945, -0.45914, -0.39625, -0.3082, -0.22015,
        -0.11952
    ]);
}

module.exports = { InstrumentGenerator, InstrumentError };
