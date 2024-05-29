function sussorng(y, x, seed) {
    x = x * 3266489917 + 374761393;
    x = (x << 17) | (x >> 15);
    x += y * 3266489917;
    x += seed * 3266489917;
    x *= 668265263;
    x ^= x >> 15;
    x *= 2246822519;
    x ^= x >> 13;
    x *= 3266489917;
    x ^= x >> 16;
    return (x & 0x00ffffff) * (1 / 0x1000000);
}

function gradient(ix, iy, x, y, seed) {
    let rng = 2 * sussorng(ix, iy, seed) * Math.PI;
    let gx = Math.cos(rng);
    let gy = Math.sin(rng);

    let dx = x - ix;
    let dy = y - iy;
    return gx * dx + gy * dy;
}

function smooth(a, b, t) {
    return (b - a) * (3 - t * 2) * t * t + a;
}

function smooth2(a, b, x) {
    return a + (b - a) * x * x * x;
}

function perlin(x, y, seed) {
    let x1 = Math.floor(x);
    let y1 = Math.floor(y);
    let x2 = x1 + 1;
    let y2 = y1 + 1;

    let t1 = x - x1;
    let t2 = y - y1;

    let g1 = gradient(x1, y1, x, y, seed);
    let g2 = gradient(x2, y1, x, y, seed);
    let ix1 = smooth(g1, g2, t1);

    let g3 = gradient(x1, y2, x, y, seed);
    let g4 = gradient(x2, y2, x, y, seed);
    let ix2 = smooth(g3, g4, t1);

    return smooth(ix1, ix2, t2);
}

let scale = 5;
let inc = 0.01;
let iterations = 100;
let maxSpeed = 2;
let count = 10000;

let rows = Math.floor(img.h / scale);
let cols = Math.floor(img.w / scale);

let field = new Array(2 * rows * cols);
let particles = new Array(2 * count);
let particleVels = new Array(2 * count).fill(0);

let seed = Math.random();

for(let x = 0; x < cols; x++) {
    for(let y = 0; y < rows; y++) {
        let n1 = 8 * perlin(x * inc, y * inc, seed) * Math.PI;
        let pos = 2 * (y * cols + x);

        field[pos] = Math.cos(n1);
        field[pos + 1] = Math.sin(n1);
    }
}

for(let i = 0; i < count; i++) {
    let pos = 2 * i;
    particles[pos] = Math.random() * img.w;
    particles[pos + 1] = Math.random() * img.h;
}

for(let i = 0; i < iterations; i++) {
    let val = smooth2(0, 255, i / iterations);
    let color = new Color(val, val, val);
    
    for(let j = 0; j < count; j++) {
        let pos1 = 2 * j;
        let x = Math.floor(particles[pos1] / scale);
        let y = Math.floor(particles[pos1 + 1] / scale);
        
        let prev_x = Math.floor(particles[pos1]);
        let prev_y = Math.floor(particles[pos1 + 1]);

        let pos2 = 2 * (y * cols + x);
        let f_x = field[pos2];
        let f_y = field[pos2 + 1];

        particleVels[pos1] += f_x * 0.02;
        particleVels[pos1 + 1] += f_y * 0.02;

        particleVels[pos1] = Math.min(particleVels[pos1], maxSpeed);
        particleVels[pos1 + 1] = Math.min(particleVels[pos1 + 1], maxSpeed);

        particles[pos1] += particleVels[pos1];
        particles[pos1 + 1] += particleVels[pos1 + 1];

        x = Math.floor(particles[pos1]);
        y = Math.floor(particles[pos1 + 1]);
        img.drawLine(prev_x, prev_y, x, y, color);
    }
}