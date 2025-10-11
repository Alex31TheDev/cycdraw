const path = require("path");
const fs = require("fs");

const utilNameRegex = /\b(\w*Utils?|TypeTester)\b/g;

const objStartRegex = /^(?:let|const)\s+(\w*Utils?|TypeTester)\s*=\s*(?:Object\.freeze\()?{/m,
    objEndRegex = /^\}\)?;/m;

const funcStartRegex = /^\s{4}([^\W_]\w*):\s*(\([^)]*\)\s*=>\s*\{)/gm,
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

function parseUtilFuncs(text) {
    let objName, objContent;

    {
        const startMatch = text.match(objStartRegex);
        if (!startMatch) return { name: null, functions: new Set() };

        objName = startMatch[1];
        const startIdx = startMatch.index;

        const endMatch = text.slice(startIdx).match(objEndRegex);
        if (!endMatch) return { name: objName, functions: new Set() };
        const endIdx = startIdx + endMatch.index + 2;

        objContent = text.slice(startIdx, endIdx);
    }

    const functions = new Map();

    for (const startMatch of objContent.matchAll(funcStartRegex)) {
        const [funcName, header] = startMatch.slice(1),
            startIdx = startMatch.index + startMatch[0].indexOf(header);

        const endMatch = objContent.slice(startIdx).match(funcEndRegex);
        if (!endMatch) continue;

        const endIdx = startIdx + endMatch.index + endMatch[0].length;

        let funcBody = " ".repeat(4) + objContent.slice(startIdx, endIdx);
        funcBody = funcBody.replace(utilNameRegex, "MAIN_UTIL");
        funcBody = funcBody.endsWith(",") ? funcBody.slice(0, -1) : funcBody;

        functions.set(funcName, funcBody);
    }

    return { name: objName, functions };
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

const usage = "Usage: node checkutils.cjs mainFile.js other1.js other2.js [...]",
    helpArgs = ["-h", "--help"];

function parseArgs() {
    const args = process.argv.slice(2);

    if (args.length < 1 || helpArgs.some(help => args.includes(help))) {
        console.log(usage);
        process.exit(0);
    }

    if (args.length < 2) {
        console.log(usage);
        process.exit(1);
    }

    const mainPath = path.resolve(args[0]),
        otherPaths = args.slice(1).map(p => path.resolve(p));

    return {
        mainPath,
        otherPaths
    };
}

function main() {
    const args = parseArgs();

    const mainFile = readFile(args.mainPath),
        otherFiles = args.otherPaths.map(readFile);

    const main = parseUtilFuncs(mainFile);

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
                console.log(`${AnsiCodes.red}${SymbolChars.x} ${funcName} (missing)${AnsiCodes.reset}`);
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
    }

    const extraInMain = Array.from(main.functions.keys()).filter(func => !otherFunctions.has(func));

    if (extraInMain.length > 0) {
        console.log(`\nFunctions in main (${main.name}) not found in any other files:`);
        extraInMain.forEach(fn => console.log(`${AnsiCodes.yellow}${SymbolChars.star} ${fn}${AnsiCodes.reset}`));
    }
}

main();
