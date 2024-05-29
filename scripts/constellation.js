let distMax = 40;
let step = 10;
let zoom = 50;

let g = new Grid(0, 0, img.w, img.h, 8, 12);
g.pointRandVar = function(i, j, d) { return new Point(this.x + i * this.xMult + Math.random() * d, this.y + j * this.yMult + Math.random() * d); };

let points = [...g.pointRandVar(2, 1, 30), ...g.pointRandVar(3, 1, 30), ...g.pointRandVar(4, 1, 30), ...g.pointRandVar(5, 1, 30), ...g.pointRandVar(6, 1, 30), ...g.pointRandVar(1, 2, 30), ...g.pointRandVar(1, 3, 30), ...g.pointRandVar(1, 5, 30), ...g.pointRandVar(1, 8.3, 30), ...g.pointRandVar(1.8, 10, 30), ...g.pointRandVar(2.5, 8, 30), ...g.pointRandVar(2.5, 5.5, 30), ...g.pointRandVar(3, 4, 30), ...g.pointRandVar(3.5, 8, 30), ...g.pointRandVar(3.5, 5.5, 30), ...g.pointRandVar(4, 10, 30), ...g.pointRandVar(5, 10, 30), ...g.pointRandVar(6.8, 10, 30), ...g.pointRandVar(7, 2.3, 30), ...g.pointRandVar(6.8, 4.3, 30), ...g.pointRandVar(6, 4.3, 30), ...g.pointRandVar(5.5, 4.3, 30), ...g.pointRandVar(5.5, 6, 30), ...g.pointRandVar(5.8, 7, 30), ...g.pointRandVar(6.5, 8, 30)];
let n = points.length / 2;

for (let x = 0; x < img.w; x++) {
    for (let y = 0; y < img.h; y++) {
        let min = Infinity;

        for(let i = 0; i < n; i++) {
            let pos = 2 * i;
            let dist = (points[pos] - x) * (points[pos] - x) + (points[pos + 1] - y) * (points[pos + 1] - y);
            min = Math.min(min, dist);
        }

        min = Math.min(Math.sqrt(min), distMax);
        let val = min / distMax * 255;
        val = 255 - val;
        img.setPixel_u_rgb(x, y, val, val, val);
  }
}