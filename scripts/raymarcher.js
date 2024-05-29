let n = 100;
let eps = 0.01;

let org_x = 0,
    org_y = 0,
    org_z = 1;
    
let light_x = 0,
    light_y = 5,
    light_z = 2;
    
let lightInt = 0.7;
let lightAmb = 0.1;

function mod(n, m) {
  return ((n % m) + m) % m;
}

function opRep(x, y, z, p_x, p_y, p_z) {
    let q_x = mod(x + 0.5 * p_x, p_x) - 0.5 * p_x,
        q_y = mod(y + 0.5 * p_y, p_y) - 0.5 * p_y,
        q_z = mod(z + 0.5 * p_z, p_z) - 0.5 * p_z;
    return [q_x, q_y, q_z];
}

function sphereDist(x, y, z, pos_x, pos_y, pos_z, r) {
    return Math.sqrt((x - pos_x) * (x - pos_x) +
                     (y - pos_y) * (y - pos_y) +
                     (z - pos_z) * (z - pos_z)) - r;
}

function dist(x, y, z) {
    return sphereDist(x, y, z, 0, 0, -1, 0.5);
}

function calcLight(x, y, z) {
    let d1 = dist(x + eps, y - eps, z - eps),
        d2 = dist(x - eps, y - eps, z + eps),
        d3 = dist(x - eps, y + eps, z - eps),
        d4 = dist(x + eps, y + eps, z + eps);
    let norm_x =  eps * d1 - eps * d2 - eps * d3 + eps * d4,
        norm_y = -eps * d1 - eps * d2 + eps * d3 + eps * d4,
        norm_z = -eps * d1 + eps * d2 - eps * d3 + eps * d4;
    let mag = 1 / Math.sqrt(norm_x * norm_x + norm_y * norm_y + norm_z * norm_z);
    norm_x *= mag;
    norm_y *= mag;
    norm_z *= mag;
    
    let lp_x = light_x - x,
        lp_y = light_y - y,
        lp_z = light_z - z;
    mag = 1 / Math.sqrt(lp_x * lp_x + lp_y * lp_y + lp_z * lp_z);
    lp_x *= mag;
    lp_y *= mag;
    lp_z *= mag;
    
    let diff = norm_x * lp_x + norm_y * lp_y + norm_z * lp_z;
    diff *= lightInt / (lp_x * lp_x + lp_y * lp_y + lp_z * lp_z);
    return Math.max(diff, 0);
}

function fragFunc(x, y) {
    let dir_x = x - org_x,
        dir_y = y - org_y,
        dir_z = -org_z;
    let mag = 1 / Math.sqrt(dir_x * dir_x + dir_y * dir_y + dir_z * dir_z);
    dir_x *= mag;
    dir_y *= mag;
    dir_z *= mag;
        
    let i = 0, sum = 1, distVal;
    let p_x, p_y, p_z, a = 0;
    
    for(; i < n; i++) {
        p_x = org_x + dir_x * sum;
        p_y = org_y + dir_y * sum;
        p_z = org_z + dir_z * sum;
        
        distVal = dist(p_x, p_y, p_z);
        sum += distVal;
        
        if(distVal < eps) {
            a = Math.min(lightAmb + calcLight(p_x, p_y, p_z), 1);
            break;
        }
    }
    
    return [a, a, a];
}

let y = 0, x, pos = 0;
let w2 = img.w / 2, h2 = img.h / 2;
let r, g, b;

for(; y < img.h; y++) {
    for(x = 0; x < img.w; x++) {
        [r, g, b] = fragFunc((x - w2) / img.h, -(y - h2) / img.h);
        
        img.pixels[pos++] = ~~(r * 255);
        img.pixels[pos++] = ~~(g * 255);
        img.pixels[pos++] = ~~(b * 255);
    }
}