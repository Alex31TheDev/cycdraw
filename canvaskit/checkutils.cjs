const fs = require("fs");
const path = require("path");

const utilNameRegex = /\b(\w*Utils?|TypeTester)\b/g;

const objStartRegex = /^(?:let|const)\s+(\w*Utils?|TypeTester)\s*=\s*(?:Object\.freeze\()?{/m,
    objEndRegex = /^\}\)?;/m;

const funcStartRegex =
        /^\s{4}(?:async\s+)?([^\W_]\w*)(?::\s*((?:async\s+)?(?:\([^)]*\)|[A-Za-z_$]\w*)\s*=>\s*\{)|((?:async\s*)?\([^)]*\)\s*\{))/gm,
    funcEndRegex = /^\s{4}\},?/m;

function readFile(filePath) {
    let text;

    try {
        text = fs.readFileSync(filePath, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            console.error("ERROR: Couldn't find the file at path: " + filePath);
        } else {
            console.error(`ERROR: Occured while reading file ${filePath}:`);
            console.error(err);
        }

        process.exit(1);
    }

    return text;
}

function parseUtilFuncs(text, targetName) {
    let objName, objContent;

    {
        const startRegex = targetName
                ? new RegExp(`^(?:let|const)\\s+(${targetName})\\s*=\\s*(?:Object\\.freeze\\()?{`, "m")
                : objStartRegex,
            startMatch = text.match(startRegex);

        if (!startMatch) return { name: null, functions: new Map() };

        objName = startMatch[1];
        const startIdx = startMatch.index;

        const endMatch = text.slice(startIdx).match(objEndRegex);
        if (!endMatch) return { name: objName, functions: new Map() };
        const endIdx = startIdx + endMatch.index + 2;

        objContent = text.slice(startIdx, endIdx);
    }

    const functions = new Map();

    funcStartRegex.lastIndex = 0;

    for (const startMatch of objContent.matchAll(funcStartRegex)) {
        const funcName = startMatch[1],
            header = startMatch[2] ?? startMatch[3],
            startIdx = startMatch.index + startMatch[0].indexOf(header);

        const endMatch = objContent.slice(startIdx).match(funcEndRegex);
        if (!endMatch) continue;

        const endIdx = startIdx + endMatch.index + endMatch[0].length;

        utilNameRegex.lastIndex = 0;
        let funcBody = " ".repeat(4) + objContent.slice(startIdx, endIdx);
        funcBody = funcBody.replace(utilNameRegex, "MAIN_UTIL");
        funcBody = funcBody.endsWith(",") ? funcBody.slice(0, -1) : funcBody;

        functions.set(funcName, funcBody);
    }

    return { name: objName, functions };
}

function parseMainUtils(text) {
    const utilNames = [
            "Util",
            "ArrayUtil",
            "ObjectUtil",
            "TypeTester",
            "DiscordUtil",
            "FunctionUtil",
            "RegexUtil",
            "LoaderUtils"
        ],
        functions = new Map();

    let primaryName = null;

    for (const utilName of utilNames) {
        const utilObj = parseUtilFuncs(text, utilName);

        if (utilObj.name === null) continue;
        if (primaryName === null) primaryName = utilObj.name;

        utilObj.functions.forEach((funcText, funcName) => functions.set(funcName, funcText));
    }

    return { name: primaryName, functions };
}

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

function printDiff(str1, str2) {
    const lines1 = str1.split("\n").map(line => line.trimEnd()),
        lines2 = str2.split("\n").map(line => line.trimEnd());

    const maxLength = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLength; i++) {
        const line1 = lines1[i] ?? "",
            line2 = lines2[i] ?? "";

        if (line1 !== line2) {
            console.log(`${AnsiCodes.green}- ${line1}${AnsiCodes.reset}`);
            console.log(`${AnsiCodes.red}+ ${line2}${AnsiCodes.reset}`);
        } else {
            console.log(`  ${line1}`);
        }
    }
}

const usage = "Usage: node checkutils.cjs [-r|--reverse] [-b|--bidirectional] mainFile.js other1.js other2.js [...]",
    helpArgs = ["-h", "--help"];

function parseArgs() {
    let args = process.argv.slice(2);

    if (args.length < 1 || helpArgs.some(help => args.includes(help))) {
        console.log(usage);
        process.exit(0);
    }

    let reverse = false,
        bidirectional = false;

    args = args.filter(arg => {
        if (arg === "-r" || arg === "--reverse") {
            reverse = true;
            return false;
        }
        if (arg === "-b" || arg === "--bidirectional") {
            bidirectional = true;
            return false;
        }
        return true;
    });

    if (args.length < 2) {
        console.log(usage);
        process.exit(1);
    }

    let mainPath = path.resolve(args[0]),
        otherPaths = args.slice(1).map(p => path.resolve(p));

    if (reverse) {
        const temp = mainPath;
        mainPath = otherPaths[0];
        otherPaths = [temp, ...otherPaths.slice(1)];
    }

    return {
        mainPath,
        otherPaths,
        bidirectional
    };
}

function main() {
    const args = parseArgs();

    const mainFile = readFile(args.mainPath),
        otherFiles = args.otherPaths.map(readFile);

    const main = parseMainUtils(mainFile);

    if (main.name === null) {
        console.error(`ERROR: No utils object ending found in file: ${args.mainPath}`);
        process.exit(1);
    }

    console.log(`Main utils object: ${main.name}`);

    const otherFunctions = new Set();

    for (const [i, text] of otherFiles.entries()) {
        const otherPath = args.otherPaths[i],
            other = parseUtilFuncs(text);

        if (other.name === null) {
            console.error(`\nERROR: No utils object found in file: ${otherPath}`);
            continue;
        }

        console.log(`\nChecking object: ${other.name} in file: ${otherPath}`);

        other.functions.forEach((funcText, funcName) => {
            otherFunctions.add(funcName);

            if (!main.functions.has(funcName)) {
                console.log(`${AnsiCodes.red}${SymbolChars.x} ${funcName} (missing in main)${AnsiCodes.reset}`);
                return;
            }

            const mainText = main.functions.get(funcName);

            if (mainText === funcText) {
                console.log(`${AnsiCodes.green}${SymbolChars.check} ${funcName}${AnsiCodes.reset}`);
            } else {
                console.log(`${AnsiCodes.red}${SymbolChars.x} ${funcName} (different)${AnsiCodes.reset}`);

                console.log(`--- diff ---`);
                printDiff(funcText, mainText);
            }
        });

        if (args.bidirectional) {
            const missingInOther = Array.from(main.functions.keys()).filter(fn => !other.functions.has(fn));
            if (missingInOther.length > 0) {
                console.log(`\nFunctions in main (${main.name}) missing in ${other.name}:`);
                missingInOther.forEach(fn => console.log(`${AnsiCodes.yellow}${SymbolChars.star} ${fn}${AnsiCodes.reset}`));
            }
        }
    }

    const extraInMain = Array.from(main.functions.keys()).filter(func => !otherFunctions.has(func));

    if (extraInMain.length > 0) {
        console.log(`\nFunctions in main (${main.name}) not found in any other files:`);
        extraInMain.forEach(fn => console.log(`${AnsiCodes.yellow}${SymbolChars.star} ${fn}${AnsiCodes.reset}`));
    }
}

main();
