function genRule(n) {
    const r = Array(8).fill(0);
    
    n.toString(2).padStart(8, "0").split("").forEach((c, i) => {
        r[7 - i] = Number(c);
    });

    return r;
}

function step(c1, c2, r) {
    c2.fill(0);

    for(let i = 0; i < c1.length; i++) {
        const i1 = i === 0 ? c1.length - 1 : i - 1,
              i2 = i,
              i3 = i === c1.length - 1 ? 1 : i + 1;

        c2[i] = r[c1[i1] * 4 + c1[i2] * 2 + c1[i3]];
    }
    
    c2.forEach((x, i) => c1[i] = x);
}

function drawArr(c, px, y) {
    c.forEach((x, i) => {
        if(x === 1) {
            img.fill(i * px, y * px, (i + 1) * px, (y + 1) * px, Colors.white);
        }
    });
}

const usage = "\nSee %t rule help for usage.",
      help = `1D cellular automata rule plotter
Examples: https:\/\/plato.stanford.edu/entries/cellular-automata/supplement.html
Usage: %t rule (number 1-255)`;

let n;
const args = evalArgs.split(" ").filter(x => x.length > 0);

if(args[0] === "help") {
    return help;
} else if(args.length < 1) {
    n = Math.floor(Math.random() * 255);
} else {
    n = Number(evalArgs);

    if(isNaN(n)) {
        return `:warning: Rule ${evalArgs} is invalid.` + usage;
    }

    if(n < 0 || n > 255) {
        return `:warning: Rule ${evalArgs} is invalid. Rules range from 0 to 255.` + usage; 
    }
}

const px = 4,
      w = Math.floor(img.w / px),
      h = Math.floor(img.h / px);

const c1 = Array(w).fill(0),
      c2 = Array(w),
      r = genRule(n);

c1[Math.floor(w / 2)] = 1;

for(let i = 0; i < h; i++) {
    drawArr(c1, px, i);
    step(c1, c2, r);
}