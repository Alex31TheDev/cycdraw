const rawArgs = typeof tag !== "undefined" ? tag?.args : null,
    args = Array.isArray(rawArgs)
        ? rawArgs
        : String(rawArgs || "")
              .trim()
              .split(/\s+/);

const ruleNum = Number(args[0]),
    isAll = String(args[0]).toLowerCase() === "all";

const valid = isAll || (args[0] !== null && ruleNum >= 0 && ruleNum <= 255 && Number.isInteger(ruleNum));

if (!valid) {
    (":warning: Invalid rule number. Must be between 0 and 255, or 'all'.");
} else {
    util.loadLibrary = "lodepng";
    util._useWasmBase2nDecoder = false;
    util.executeTag("canvaskitloader");

    (() => {
        const width = 128,
            height = 64;

        const pixelSize = Math.max(1, parseInt(args[1], 10) || (isAll ? 1 : 8));

        const cols = isAll ? 32 : 1,
            rows = isAll ? 8 : 1;

        const tileWidth = width * pixelSize,
            tileHeight = height * pixelSize;

        const totalWidth = cols * tileWidth,
            totalHeight = rows * tileHeight;

        const pixels = new Uint8Array(totalWidth * totalHeight * 4);
        for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;

        function step(current, next, rule) {
            for (let i = 0; i < width; i++) {
                const left = current[i === 0 ? width - 1 : i - 1];
                const right = current[i === width - 1 ? 0 : i + 1];
                next[i] = (rule >> ((left << 2) | (current[i] << 1) | right)) & 1;
            }
        }

        function drawRule(rule, offsetX, offsetY) {
            let current = new Uint8Array(width),
                next = new Uint8Array(width);

            current[width / 2] = 1;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (!current[x]) continue;
                    const startX = offsetX + x * pixelSize,
                        startY = offsetY + y * pixelSize;

                    for (let dy = 0; dy < pixelSize; dy++) {
                        const row = (startY + dy) * totalWidth;

                        for (let dx = 0; dx < pixelSize; dx++) {
                            const pos = 4 * (row + startX + dx);
                            pixels[pos] = pixels[pos + 1] = pixels[pos + 2] = 255;
                        }
                    }
                }

                step(current, next, rule);

                const temp = current;
                current = next;
                next = temp;
            }
        }

        if (isAll) {
            for (let n = 0; n < 256; n++) {
                drawRule(n, (n % cols) * tileWidth, Math.floor(n / cols) * tileHeight);
            }
        } else {
            drawRule(ruleNum, 0, 0);
        }

        const data = lodepng.encode({
            width: totalWidth,
            height: totalHeight,
            data: pixels
        });

        try {
            msg.reply({ file: { name: `rule_${isAll ? "all" : ruleNum}.png`, data } });
        } catch (err) {}
    })();
}
