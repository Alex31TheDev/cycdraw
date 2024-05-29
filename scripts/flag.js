let args = evalArgs.split(" ");

let valid = Object.keys(Colors);
let errMsg = `Command for drawing stripe flags. Usage: %t flag [orientation: 0 = horizontal, 1 = vertical] [colors: N >= 2 colors]\nNamed colors: ${valid.join(", ")}\nColors can also be inputted as hex.`;

let type = parseInt(args[0]);
if(args.length < 3 || isNaN(type) || type < 0 || type > 1) { return errMsg; }

let colors = args.slice(1);
for(let i = 0; i < colors.length; i++) {
    let clr1;
    if(colors[i].startsWith("#")) {
        let comp = colors[i].slice(1).match(/.{2}/g);
        let errMsg2 = `Invalid hex color: ${colors[i]}\n${errMsg}`;
        if(comp.length != 3) { return errMsg2; }

        let r = parseInt(comp[0], 16),
              g = parseInt(comp[1], 16),
              b = parseInt(comp[2], 16);

        if(isNaN(r) || isNaN(g) || isNaN(b)) { return errMsg2; }
        clr1 = new Color(r, g, b);
    } else if(valid.includes(colors[i])) {
        clr1 = Colors[colors[i]];
    } else {
        return `Invalid color: ${colors[i]}\n${errMsg}`;
    }

   if(type) {
        let p1 = i * img.w / colors.length;
        let p2 = (i + 1) * img.w / colors.length;
        img.fill(p1, 0, p2, img.h, clr1);
    } else {
        let p1 = i * img.h / colors.length;
        let p2 = (i + 1) * img.h / colors.length;
        img.fill(0, p1, img.w, p2, clr1);
    }
}