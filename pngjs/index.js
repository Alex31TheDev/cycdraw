debugger;

const PNG = require("pngjs").PNG;

const Util = require("./util/Util.js");
const Benchmark = require("./util/Benchmark.js");

const ImageUtil = require("./image/ImageUtil.js");
const { consturctorOpts, filename } = require("./image/defaultOpts.js");

const EvalContext = require("./eval/EvalContext.js");

function createImage() {
    Benchmark.startTiming("create_img");

    const img = new PNG(constructorOpts);

    Benchmark.stopTiming("create_img");
    Benchmark.startTiming("clear_img");

    ImageUtil.clear(img);

    Benchmark.stopTiming("clear_img");

    return img;
}

function drawImage(img, code, evalArgs) {
    Benchmark.startTiming("draw_img");

    const context = new EvalContext(img);

    let output;
    [img, output] = context.execute(code, evalArgs);

    Benchmark.stopTiming("draw_img");
    return [img, output];
}

function getImageFile(img) {
    Benchmark.startTiming("encode_img");

    const encoded = PNG.sync.write(img);

    Benchmark.stopTiming("encode_img");

    const file = {
        name: filename,
        data: encoded
    };

    return {
        file
    };
}

function getBenchmarkEmbed() {
    const table = Benchmark.getTable("doubleVertical", 1),
        format = `\`\`\`js\n${table}\n\`\`\``;

    const embed = {
        title: ":information_source: Benchmark times",
        description: format
    };

    return {
        embed
    };
}

function sendImage() {
    Benchmark.startTiming("total");
    Benchmark.startTiming("resolve_code");

    let code, evalArgs;

    try {
        [code, evalArgs] = Util.parseArgs(tag.args, msg);
    } catch (err) {
        if (err.name === "CustomError") {
            return `:warning: ${err.message}.`;
        }

        throw err;
    }

    Benchmark.stopTiming("resolve_code");

    let img = createImage(),
        output;

    [img, output] = drawImage(img, code, evalArgs);

    if (typeof output !== "undefined") {
        return output;
    }

    const file = getImageFile(img);

    Benchmark.stopTiming("total");

    msg.reply({
        ...getBenchmarkEmbed(),
        ...file
    });
}

const output = sendImage();

if (typeof output !== "undefined") {
    msg.reply(output);
}

msg.reply(".");
