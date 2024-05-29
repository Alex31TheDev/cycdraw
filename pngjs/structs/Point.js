class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    equals(p) {
        return this.x === p.x && this.y === p.y;
    }

    add(p) {
        if (p instanceof Point) {
            return new Point(this.x + p.x, this.y + p.y);
        }

        return new Point(this.x + p, this.y + p);
    }

    sub(p) {
        if (p instanceof Point) {
            return new Point(this.x - p.x, this.y - p.y);
        }

        return new Point(this.x - p, this.y - p);
    }

    scale(x) {
        return new Point(this.x * x, this.y * x);
    }

    invScale(x) {
        return new Point(this.x / x, this.y / x);
    }

    abs() {
        return new Point(Math.abs(this.x), Math.abs(this.y));
    }

    round() {
        return new Point(Math.round(this.x), Math.round(this.y));
    }

    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y));
    }

    ceil() {
        return new Point(Math.ceil(this.x), Math.ceil(this.y));
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    dist(p) {
        const dx = p.x - this.x,
            dy = p.y - this.y;

        return Math.sqrt(dx * dx + dy * dy);
    }

    midpoint(p) {
        const mx = (this.x + p.x) / 2,
            my = (this.y + p.y) / 2;

        return new Point(Math.floor(mx), Math.floor(my));
    }

    quadrant() {
        if (this.x >= 0 && this.y >= 0) {
            return 1;
        }

        if (this.x < 0 && this.y > 0) {
            return 2;
        }

        if (this.x < 0 && this.y < 0) {
            return 3;
        }

        if (this.x > 0 && this.y < 0) {
            return 4;
        }
    }

    complexPhase() {
        return Math.atan2(this.y, this.x);
    }

    static fromPolar(phase, length) {
        const re = length * Math.cos(phase),
            im = length * Math.sin(phase);

        return new Point(re, im);
    }

    toPolar() {
        const phase = this.complexPhase(),
            length = this.length();

        return new Point(phase, length);
    }

    complexMult(p) {
        const re = this.x * p.x - this.y * p.y,
            im = this.x * p.y + this.y * p.x;

        return new Point(re, im);
    }

    complexDiv(p) {
        const sum = this.y * this.y + p.y * p.y;

        const re = (this.x * p.x - this.y * p.y) / sum,
            im = (this.x * p.y + this.y * p.x) / sum;

        return new Point(re, im);
    }

    toString() {
        return `Point: {x: ${this.x}, y: ${this.y}}`;
    }

    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }
}

module.exports = Point;