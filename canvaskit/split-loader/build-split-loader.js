const fs = require("fs");
const path = require("path");

const templateFilename = "split-loader.template.js",
    templatePath = path.resolve(__dirname, templateFilename);

const sourceUrl = "https://github.com/Alex31TheDev/cycdraw/blob/main/canvaskit/canvaskitloader.js";

function templateReplace(template, strings) {
    return template.replace(/(?<!\\){{(.*?)}}(?!\\)/g, (match, key) => {
        key = key.trim();
        return strings[key] ?? match;
    });
}

function getScriptFiles(dirPath) {
    let files;

    try {
        files = fs.readdirSync(dirPath);
    } catch (err) {
        console.error("Error occured while reading the input directory:", err);
        return;
    }

    const jsFiles = files.filter(file => path.extname(file) === ".js");

    if (jsFiles.length < 1) {
        console.error("No files found.");
        return;
    }

    return jsFiles.map(file => path.resolve(dirPath, file));
}

const numRegex = /_part(\d+).js$/;

function getTagName(num) {
    return `ck_loader_${num}`;
}

const args = process.argv.slice(2);

let inPath = args[0],
    scriptOutPath = args[1],
    tagsOutPath = args[2];

if (typeof inPath === "undefined") {
    console.error("No output path provided.");
    process.exit(1);
}

if (typeof scriptOutPath === "undefined") {
    console.error("No output path provided.");
    process.exit(1);
}

inPath = path.resolve(inPath);
scriptOutPath = path.resolve(scriptOutPath);

if (typeof tagsOutPath === "undefined") {
    const outDir = path.dirname(scriptOutPath);
    tagsOutPath = path.join(outDir, "tags.json");
} else {
    tagsOutPath = path.resolve(tagsOutPath);
}

const files = getScriptFiles(inPath);

if (!Array.isArray(files)) {
    process.exit(1);
}

const nums = files
    .map(file => [file.match(numRegex), file])
    .filter(([match]) => match)
    .map(([match, file]) => [match[1], file]);

nums.sort(([a], [b]) => a - b);

console.log("Found part files:");
console.log(nums.map(([, file]) => file).join("\n"), "\n");

const tags = Object.fromEntries(nums.map(([num, file]) => [getTagName(num), file]));

let template;

try {
    template = fs.readFileSync(templatePath, "utf8");
} catch (err) {
    console.error("Error occured while reading the template file:");
    console.error(err);

    process.exit(1);
}

const tagList = '"' + Object.keys(tags).join('", "') + '"';

const loaderCode = templateReplace(template, {
    tags: tagList,
    source_url: sourceUrl
}).trim();

try {
    fs.writeFileSync(scriptOutPath, loaderCode, "utf8");
    console.log("Wrote output file to:", scriptOutPath);
} catch (err) {
    console.error("Error occured while writing the script file:");
    console.error(err);

    process.exit(1);
}

tags["canvaskitloader"] = scriptOutPath;
const tagsJson = JSON.stringify(tags, undefined, 4);

try {
    fs.writeFileSync(tagsOutPath, tagsJson, "utf8");
    console.log("Wrote output file to:", tagsOutPath);
} catch (err) {
    console.error("Error occured while writing the tags file:");
    console.error(err);

    process.exit(1);
}
