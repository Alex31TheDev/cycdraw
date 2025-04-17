const errMsg = "Invalid args. Usage: %t mandelbrot [point_r float] [point_i float] [scale float > 0] {colorMethod 0/1} {freq_r float} {freq_g float} {freq_b float} {freqMult float}";

const split = evalArgs.split(" ").filter(x => x.length > 0);

if (split.length < 3 || split.length > 8) {
    return errMsg;
}

let point_r = parseFloat(split[0]),
    point_i = parseFloat(split[1]),
    scale = parseFloat(split[2]),
    colorMethod = parseInt(split[3]) || 0,
    freq_r = parseFloat(split[4]) || 0.9,
    freq_g = parseFloat(split[5]) || 0.4,
    freq_b = parseFloat(split[6]) || 0.6,
    freqMult = parseFloat(split[7]) || 64;

if (isNaN(point_r) || isNaN(point_i) || !scale) {
    return errMsg;
}

const bailout = 16,
      lnbail = 1 / Math.log(bailout),
      ln2 = 1 / Math.LN2;

const w2 = img.w / 2,
      h2 = img.h / 2;

let count = Math.pow(1.3, scale) + 22 * scale,
    count2 = 1 / count;
scale = 1 / Math.pow(2, scale);

freq_r *= freqMult;
freq_g *= freqMult;
freq_b *= freqMult;

let light_r = 1,
    light_i = 1;

let light_h = Math.sqrt(light_r * light_r + light_i * light_i);
light_r /= light_h;
light_i /= light_h;

function normCos(x) {
    return (Math.cos(Math.PI * x + Math.PI) + 1) / 2;
}

let x, y, pos, R, G, B;
let i, cr, ci, zr, zi, zr2, zi2, mag, iter, dr, di, dr2, dsum, ur, ui, umag, light, rval;

y = pos = 0;
for (; y < img.h; y++) {
    for (x = 0; x < img.w; x++) {
        R = G = B = 0;

        cr = (x - w2) * scale + point_r;
        ci = (y - h2) * scale + point_i;
        zr = zi = dr = di = 0;

        for (i = 0; i < count; i++) {
            switch (colorMethod) {
                case 1:
                    dr2 = dr;
                    dr = 2 * (zr * dr - zi * di) + 1;
                    di = 2 * (zr * di + zi * dr2);
                    break;
            }

            zr2 = zr * zr;
            zi2 = zi * zi;
            mag = zr2 + zr;

            zi = 2 * zr * zi - ci;
            zr = zr2 - zi2 + cr;

            if (mag > bailout) {
                switch (colorMethod) {
                    case 0:
                        iter = i - Math.log(Math.log(Math.sqrt(mag)) * lnbail) * ln2;
                        rval = iter * count2;

                        R = ~~(normCos(rval * freq_r) * 255);
                        G = ~~(normCos(rval * freq_g) * 255);
                        B = ~~(normCos(rval * freq_b) * 255);
                        break;

                    case 1:
                        dsum = 1 / (dr * dr + di * di);
                        ur = (zr * dr + zi * di) * dsum;
                        ui = (zi * dr - zr * di) * dsum;

                        umag = 1 / Math.sqrt(ur * ur + ui * ui);
                        ur *= umag;
                        ui *= umag;

                        light = (ur * light_r + ui * light_i + light_h) / (light_h + 1);
                        rval = Math.max(light, 0) + 1;

                        R = G = B = ~~(rval * 255);
                        break;
                }

                break;
            }
        }

        img.pixels[pos++] = R;
        img.pixels[pos++] = G;
        img.pixels[pos++] = B;
    }
}
