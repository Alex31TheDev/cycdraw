const fs = require("fs");
const path = require("path");

const templateFilename = "split-loader.template.js",
    templatePath = path.resolve(__dirname, templateFilename);

function templateReplace(template, strings) {
    return template.replace(/(?<!\\){{(.*?)}}(?!\\)/g, (match, key) => {
        key = key.trim();
        return strings[key] ?? match;
    });
}

function loadTemplate() {
    let template;

    try {
        template = fs.readFileSync(templatePath, "utf8");
    } catch (err) {
        console.error("ERROR: Occured while reading the template file:");
        console.error(err);

        process.exit(1);
    }

    return template;
}

function getScriptFiles(dirPath) {
    let files;

    try {
        files = fs.readdirSync(dirPath);
    } catch (err) {
        console.error("ERROR: Occured while reading the input directory:", err);
        return;
    }

    const jsFiles = files.filter(file => path.extname(file) === ".js");

    if (jsFiles.length < 1) {
        console.error("ERROR: No script files found.");
        return;
    }

    return jsFiles.map(file => path.resolve(dirPath, file));
}

const numRegex = /_part(\d+).js$/;

function getPartFiles(dirPath) {
    const files = getScriptFiles(dirPath);

    if (!Array.isArray(files)) {
        return;
    }

    let partFiles = files.map(file => [file.match(numRegex), file]).filter(([match]) => match);

    if (partFiles.length < 1) {
        console.error("ERROR: No part files found.");
        return;
    }

    partFiles = partFiles.map(([match, file]) => [match[1], file]);
    partFiles.sort(([a], [b]) => a - b);

    return partFiles;
}

function parseArgs() {
    const args = process.argv.slice(2);

    let inPath = args[0],
        scriptOutPath = args[1],
        tagsOutPath = args[2] ?? "default";

    const prefix = args[3] ?? "loader",
        loaderName = args[4] ?? "none",
        sourceUrl = args[5] ?? "";

    if (typeof inPath === "undefined") {
        console.error("ERROR: No output path provided.");
        process.exit(1);
    }

    if (typeof scriptOutPath === "undefined") {
        console.error("ERROR: No output path provided.");
        process.exit(1);
    }

    inPath = path.resolve(inPath);
    scriptOutPath = path.resolve(scriptOutPath);

    if (tagsOutPath === "default") {
        const outDir = path.dirname(scriptOutPath);
        tagsOutPath = path.join(outDir, "tags.json");
    } else {
        tagsOutPath = path.resolve(tagsOutPath);
    }

    return {
        inPath,
        scriptOutPath,
        tagsOutPath,

        prefix,
        loaderName,
        sourceUrl
    };
}

function getTags(args) {
    function formatTagName(num) {
        return `${args.prefix}_${num}`;
    }

    const files = getPartFiles(args.inPath);

    if (!Array.isArray(files)) {
        process.exit(1);
    }

    console.log("Found part files:");
    console.log(files.map(([, file]) => file).join("\n"), "\n");

    const tags = Object.fromEntries(files.map(([num, file]) => [formatTagName(num), file]));
    return tags;
}

function writeLoaderCode(template, tags, args) {
    const tagList = '"' + Object.keys(tags).join('", "') + '"';

    const loaderCode = templateReplace(template, {
        tags: tagList,
        source_url: args.sourceUrl
    }).trim();

    try {
        fs.writeFileSync(args.scriptOutPath, loaderCode, "utf8");
        console.log("Wrote output file to:", args.scriptOutPath);
    } catch (err) {
        console.error("ERROR: Occured while writing the script file:");
        console.error(err);

        process.exit(1);
    }
}

function writeTagsList(tags, args) {
    if (args.loaderName !== "none") {
        tags[args.loaderName] = args.scriptOutPath;
    }

    const tagsJson = JSON.stringify(tags, undefined, 4);

    try {
        fs.writeFileSync(args.tagsOutPath, tagsJson, "utf8");
        console.log("Wrote output file to:", args.tagsOutPath);
    } catch (err) {
        console.error("ERROR: Occured while writing the tags file:");
        console.error(err);

        process.exit(1);
    }
}

function main() {
    const args = parseArgs();

    const tags = getTags(args),
        template = loadTemplate();

    writeLoaderCode(template, tags, args);
    writeTagsList(tags, args);

    console.log("Finished building split loader.");
}

main();
