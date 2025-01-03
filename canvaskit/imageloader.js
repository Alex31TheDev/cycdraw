"use strict";

// config
const defaultHelpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "-u"];

const defaultHelp = "No help text configured.",
    defaultUsage = `See \`%t ${tag.name} help\` for usage.`;

const config = {
    help: typeof help === "undefined" ? defaultHelp : help,
    usage: typeof usage === "undefined" ? defaultUsage : usage,
    helpOptions: typeof helpOptions === "undefined" ? [] : helpOptions,

    options: typeof options === "undefined" ? {} : options,
    requireText: typeof requireText === "undefined" ? false : requireText,
    requireImage: typeof requireImage === "undefined" ? false : requireImage,
    textName: typeof textName === "undefined" ? "" : textName,

    loadGifEncoder: typeof loadGifEncoder === "undefined" ? () => {} : loadGifEncoder
};

const _requireText = config.requireText || Boolean(config.textName),
    _textName = config.textName ? config.textName + " " : config.textName,
    _helpOptions = config.helpOptions.length > 0 ? config.helpOptions : defaultHelpOptions;

// sources
const urls = {};

const tags = {
    TenorHttpClient: "ck_tenorhttpclient"
};

// globals

// input
let targetMsg, input, text;

// image
let image, width, height, isGif;

// parse input & attachment
const tenorRegex = /^(?:(https?:)\/\/)?tenor\.com\/view\/(?<vk>(?<name>\S+?)(?:-gif)?-(?<id>\d+))$/;

function parseTenorUrl(url) {
    const match = url.match(tenorRegex);

    if (!match) {
        return;
    }

    const groups = match.groups;

    return {
        protocol: match[1] ?? "",

        viewKey: groups.vk,
        name: groups.name,
        id: groups.id
    };
}

function parseArgs() {
    [targetMsg, input] = (() => {
        const oldContent = msg.content;
        msg.content = tag.args ?? "";

        let targetMsg = msg;

        if (msg.reference) {
            const msgs = util.fetchMessages();
            targetMsg = msgs.findLast(x => x.id === msg.reference.messageId);

            if (typeof targetMsg === "undefined") {
                const out = ":warning: Reply message not found.";
                throw new ExitError(out);
            }
        }

        if (targetMsg.attachments.length > 0) {
            const attach = targetMsg.attachments[0];

            targetMsg.file = attach;
            targetMsg.fileUrl = attach.url;
        } else {
            const urlMatch = targetMsg.content.match(LoaderUtils.urlRegex);

            if (urlMatch) {
                const fileUrl = urlMatch[0];

                let attachInfo, tenorInfo;

                if ((attachInfo = LoaderUtils.parseAttachmentUrl(fileUrl))) {
                    const embed = targetMsg.embeds.find(embed => {
                        const thumbnail = embed.thumbnail ?? embed.data?.thumbnail;
                        return thumbnail && thumbnail.url.startsWith(attachInfo.prefix);
                    });

                    if (typeof embed === "undefined") {
                        const out = ":warning: Attachment embed not found. (it's needed because discord is dumb)";
                        throw new ExitError(out);
                    }

                    const thumbnail = embed.thumbnail ?? embed.data.thumbnail;
                    targetMsg.fileUrl = thumbnail.url;
                } else if ((tenorInfo = parseTenorUrl(fileUrl))) {
                    delete tenorInfo.protocol;
                    targetMsg.tenorGif = tenorInfo;
                    targetMsg.fileUrl = "placeholder";
                } else {
                    targetMsg.fileUrl = fileUrl;
                }

                targetMsg.content = LoaderUtils.removeStringRange(
                    targetMsg.content,
                    urlMatch.index,
                    fileUrl.length
                ).trim();
            }
        }

        const args = msg.content;
        msg.content = oldContent;

        return [targetMsg, args];
    })();

    text = (() => {
        let text = input;

        const split = text.split(" "),
            option = split[0];

        checkArgs: if (split.length > 0) {
            if (_helpOptions.includes(option)) {
                const out = `:information_source: ${config.help}`;
                throw new ExitError(out);
            }

            const func = config.options[option];

            if (typeof func !== "function") {
                break checkArgs;
            }

            const removed = func(split, option, text) ?? 1;

            for (let i = 0; i < removed; i++) split.shift();
            text = split.join(" ");
        }

        if (_requireText && text.length < 1) {
            const out = `:warning: No ${_textName}text provided.\n${config.usage}`;
            throw new ExitError(out);
        }

        if (config.requireImage && typeof targetMsg.fileUrl === "undefined") {
            const out = `:warning: Message doesn't have any attachments.\n${config.usage}`;
            throw new ExitError(out);
        }

        return text;
    })();

    return { targetMsg, input, text };
}

// load libraries
function loadTenorClient() {
    if (typeof globalThis.TenorHttpClient !== "undefined") {
        return;
    }

    Benchmark.restartTiming("load_libraries");

    Benchmark.startTiming("load_tenor_client");
    const TenorHttpClient = ModuleLoader.loadModuleFromTag(tags.TenorHttpClient);
    Benchmark.stopTiming("load_tenor_client");

    Patches.patchGlobalContext({
        TenorHttpClient,
        TenorConstants: TenorHttpClient.Constants
    });

    Benchmark.stopTiming("load_libraries");
}

// load image
function downloadImage(msg) {
    Benchmark.startTiming("download_image");
    const { data } = LoaderUtils.fetchAttachment(msg, FileDataTypes.binary);
    Benchmark.stopTiming("download_image");

    Benchmark.startTiming("decode_image");
    const image = CanvasKitUtil.makeImageOrGifFromEncoded(data);
    Benchmark.stopTiming("decode_image");

    const isGif = image instanceof CanvasKit.AnimatedImage,
        width = image.width(),
        height = image.height();

    return [image, width, height, isGif];
}

function loadImage() {
    if (typeof targetMsg.fileUrl === "undefined")
        if (typeof targetMsg.tenorGif === "object") {
            loadTenorClient();
            const client = new TenorHttpClient(TENOR_API);

            targetMsg.fileUrl = client.getGifUrl(targetMsg.tenorGif.id);
            delete targetMsg.tenorGif;
        }

    Benchmark.startTiming("load_image");

    [image, width, height, isGif] = (() => {
        let image;

        try {
            image = downloadImage(targetMsg);
        } catch (err) {
            if (["UtilError", "CanvasUtilError"].includes(err.name)) {
                const out = `:warning: ${err.message}.\n${config.usage}`;
                throw new ExitError(out);
            }

            throw err;
        }

        return image;
    })();

    Benchmark.stopTiming("load_image");

    if (isGif) {
        config.loadGifEncoder();
    }

    return { image, width, height, isGif };
}

// exports
module.exports = { parseArgs, loadImage };
