const fs = require("node:fs");
const path = require("node:path");

const parser = require("@babel/parser");
const diff = require("diff");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const AnsiCodes = Object.freeze({
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m"
});

const SymbolChars = Object.freeze({
    check: "✔",
    x: "✖",
    star: "★"
});

const SymbolColors = Object.freeze({
    [SymbolChars.check]: AnsiCodes.green,
    [SymbolChars.x]: AnsiCodes.red,
    [SymbolChars.star]: AnsiCodes.yellow
});

const utilNameRegex = /\b(\w*Utils?|TypeTester)\b/g;

function isUtilName(name) {
    return /^(?:\w*Utils?|TypeTester)$/.test(name);
}

function readFile(filePath) {
    let text;

    try {
        text = fs.readFileSync(filePath, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            console.error("ERROR: Couldn't find the file at path: " + filePath);
        } else {
            console.error(`ERROR: Occurred while reading file ${filePath}:`);
            console.error(err);
        }

        process.exit(1);
    }

    return text;
}

function parseAst(text) {
    try {
        return parser.parse(text, {
            sourceType: "unambiguous",
            plugins: ["exportDefaultFrom"]
        });
    } catch (err) {
        console.error("ERROR: Occurred while parsing AST:", err);
        return null;
    }
}

function parseUtilFuncs(text, targetName) {
    const ast = parseAst(text);
    if (!ast) return { name: null, functions: new Map() };

    let objName = null,
        objNode = null;

    const unwrap = node => {
        if (
            node &&
            node.type === "CallExpression" &&
            node.callee?.property?.name === "freeze" &&
            node.arguments?.length > 0
        ) {
            return node.arguments[0];
        }

        return node;
    };

    const matchName = name => {
        if (!name) return false;
        if (targetName) return name === targetName;
        return isUtilName(name);
    };

    for (const stmt of ast.program.body) {
        let decl = stmt;

        if (stmt.type === "ExportNamedDeclaration" && stmt.declaration) {
            decl = stmt.declaration;
        }

        if (stmt.type === "ExportDefaultDeclaration" && stmt.declaration) {
            const init = unwrap(stmt.declaration);

            if (init?.type === "ObjectExpression" && (!targetName || targetName === "default")) {
                objName = targetName ?? "default";
                objNode = init;
                break;
            }
        }

        if (decl.type === "VariableDeclaration") {
            for (const d of decl.declarations) {
                if (!matchName(d.id?.name)) continue;

                const init = unwrap(d.init);

                if (init?.type === "ObjectExpression") {
                    objName = d.id.name;
                    objNode = init;
                    break;
                }
            }
        }

        if (objNode) break;
    }

    const functions = new Map();
    if (!objNode) return { name: null, functions };

    for (const prop of objNode.properties) {
        if (prop.type === "SpreadElement") continue;

        const funcName = prop.key.name || prop.key.value;
        if (!funcName) continue;

        let funcBody = text.slice(prop.start, prop.end);

        funcBody = funcBody
            .replace(utilNameRegex, "MAIN_UTIL")
            .split("\n")
            .map(l => l.trimEnd())
            .join("\n")
            .trim();

        functions.set(funcName, funcBody);
    }

    return { name: objName, functions };
}

function parseMainUtils(text) {
    const utilNames = [
            "LoaderUtils",
            "Util",
            "ArrayUtil",
            "ObjectUtil",
            "TypeTester",
            "DiscordUtil",
            "FunctionUtil",
            "RegexUtil",
            "CaseUtil"
        ],
        functions = new Map(),
        objects = new Map();

    let primaryName = null;

    for (const utilName of utilNames) {
        const utilObj = parseUtilFuncs(text, utilName);

        if (utilObj.name === null) continue;
        if (primaryName === null) primaryName = utilObj.name;

        objects.set(utilObj.name, utilObj.functions);
        utilObj.functions.forEach((funcText, funcName) => {
            if (!functions.has(funcName)) {
                functions.set(funcName, funcText);
            }
        });
    }

    return { name: primaryName, functions, objects };
}

function formatLog(msg = "", symbol = null, color = null) {
    if (symbol && Object.values(AnsiCodes).includes(symbol)) {
        color = symbol;
        symbol = null;
    }

    const char = SymbolChars[symbol] ?? symbol;
    color = color ?? SymbolColors[symbol] ?? SymbolColors[char];

    const text = char ? `${char} ${msg}` : msg,
        coloredText = color ? `${color}${text}${AnsiCodes.reset}` : text;

    return { text, coloredText };
}

function printDiff(str1, str2, log = (msg, symbol, color) => console.log(formatLog(msg, symbol, color).coloredText)) {
    const changes = diff.diffLines(str1, str2);

    for (const part of changes) {
        const color = part.added ? AnsiCodes.green : part.removed ? AnsiCodes.red : null,
            prefix = part.added ? "+ " : part.removed ? "- " : "  ",
            lines = part.value.split("\n");

        if (lines.length > 0 && lines[lines.length - 1] === "") {
            lines.pop();
        }

        for (const line of lines) {
            log(`${prefix}${line}`, null, color);
        }
    }
}

function parseArgs() {
    const argv = yargs(hideBin(process.argv))
        .usage("Usage: node checkutils.cjs [options] <mainFile> <otherFiles...>")
        .options({
            reverse: {
                alias: "r",
                type: "boolean",
                default: false,
                describe: "Swap mainFile and the first otherFile"
            },
            bidirectional: {
                alias: "b",
                type: "boolean",
                default: false,
                describe: "Also check for functions in main missing in other files"
            },
            output: {
                alias: "o",
                type: "string",
                describe: "Output file path to save check results and diffs"
            }
        })
        .demandCommand(2, "You must provide a main file and at least one other file to check.")
        .alias("help", "h")
        .help("help")
        .version(false)
        .parseSync();

    let files = argv._.map(f => path.resolve(String(f))),
        mainPath = files[0],
        otherPaths = files.slice(1);

    if (argv.reverse) {
        const temp = mainPath;
        mainPath = otherPaths[0];
        otherPaths = [temp, ...otherPaths.slice(1)];
    }

    return {
        mainPath,
        otherPaths,
        bidirectional: argv.bidirectional,
        outputPath: argv.output ? path.resolve(argv.output) : null
    };
}

function main() {
    const args = parseArgs();

    const outputLines = [];

    const log = (msg = "", symbol = null, color = null) => {
        const { text, coloredText } = formatLog(msg, symbol, color);
        console.log(coloredText);

        if (args.outputPath) {
            outputLines.push(text);
        }
    };

    const mainFile = readFile(args.mainPath),
        otherFiles = args.otherPaths.map(readFile);

    const main = parseMainUtils(mainFile);

    if (main.name === null) {
        console.error(`ERROR: No utils object ending found in file: ${args.mainPath}`);
        process.exit(1);
    }

    log(`Main utils object: ${main.name}`);

    const otherFunctions = new Set();

    for (const [i, text] of otherFiles.entries()) {
        const otherPath = args.otherPaths[i],
            other = parseUtilFuncs(text);

        if (other.name === null) {
            console.error(`\nERROR: No utils object found in file: ${otherPath}`);
            continue;
        }

        log(`\nChecking object: ${other.name} in file: ${otherPath}`);

        const targetMain =
            main.objects.get(other.name) ??
            (other.name === "Util" ? main.objects.get("LoaderUtils") : null) ??
            (other.name === "LoaderUtils" ? main.objects.get("Util") : null);

        other.functions.forEach((funcText, funcName) => {
            otherFunctions.add(funcName);

            const mainText = targetMain?.get(funcName) ?? main.functions.get(funcName);

            if (!mainText) {
                log(`${funcName} (missing in main)`, SymbolChars.x);
                return;
            }

            if (mainText === funcText) {
                log(funcName, SymbolChars.check);
            } else {
                log(`${funcName} (different)`, SymbolChars.x);

                log("--- diff ---");
                printDiff(funcText, mainText, log);
            }
        });

        if (args.bidirectional) {
            const checkSource = targetMain ?? main.functions,
                missingInOther = Array.from(checkSource.keys()).filter(fn => !other.functions.has(fn));

            if (missingInOther.length > 0) {
                const targetName = targetMain ? (other.name === "Util" ? "LoaderUtils" : other.name) : main.name;
                log(`\nFunctions in main (${targetName}) missing in ${other.name}:`);
                missingInOther.forEach(fn => log(fn, SymbolChars.star));
            }
        }
    }

    const extraInMain = Array.from(main.functions.keys()).filter(func => !otherFunctions.has(func));

    if (extraInMain.length > 0) {
        log(`\nFunctions in main (${main.name}) not found in any other files:`);
        extraInMain.forEach(fn => log(fn, SymbolChars.star));
    }

    if (args.outputPath) {
        fs.mkdirSync(path.dirname(args.outputPath), { recursive: true });
        fs.writeFileSync(args.outputPath, outputLines.join("\n") + "\n", "utf8");
        log(`\nOutput written to: ${args.outputPath}`);
    }
}

main();
