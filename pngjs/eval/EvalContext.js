const PNG = require("pngjs").PNG;

const exit = require("./exit.js");
const ImageUtil = require("../image/ImageUtil.js");
const Color = require("../structs/Color.js");
const Colors = require("../collections/Colors.js");
const Point = require("../structs/Point.js");
const Benchmark = require("../util/Benchmark.js");
const Util = require("../util/Util.js");
const Codegen = require("../util/Codegen.js");

class EvalContext {
    static names = [
        // context vars
        "img",
        "evalArgs",

        // tag vars
        "tag",
        "msg",
        "http",

        // context functions
        "exit",

        // classes
        "PNG",
        "ImageUtil",
        "Color",
        "Colors",
        "Point",
        "Benchmark",
        "Util",
        "Buffer"
    ];

    static ctxVars = [tag, msg, http, exit];
    static classes = [PNG, ImageUtil, Color, Colors, Point, Benchmark, Util, Buffer];

    constructor(img) {
        this.img = img;
    }

    getVars(evalArgs) {
        const constArgs = EvalContext.ctxVars.concat(EvalContext.classes);
        return [this.img, evalArgs].concat(constArgs);
    }

    getErrorEmbed(err) {
        const embed = {
            description: `\`\`\`js\n${err.stack}\n\`\`\``
        };

        return {
            content: ":no_entry_sign: Error occured while drawing:",
            embed
        };
    }

    execute(code, evalArgs) {
        code = Codegen.wrapCode(code);

        const vars = this.getVars(evalArgs),
            ctxFunc = Function(...EvalContext.names, code);

        let [img, output] = ctxFunc.apply(undefined, vars);

        if (output instanceof Error) {
            if (output.name === "ExitError") {
                output = output.message;
            } else {
                output = this.getErrorEmbed(output);
            }
        } else {
            output = Util.formatOutput(output);
        }

        this.img = img;

        const imageValid = img !== null && typeof img !== "undefined" && img instanceof PNG,
            metadataValid =
                typeof img.width === "number" && typeof img.height === "number" && img.width > 0 && img.height > 0,
            pixelsValid =
                img.data !== null &&
                typeof img.data !== "undefined" &&
                img.data instanceof Uint8Array &&
                img.data.length > 0;

        if (!imageValid || !metadataValid || !pixelsValid) {
            return [undefined, ":no_entry_sign: Invalid image."];
        }

        return [img, output];
    }
}

module.exports = EvalContext;
