"use strict";
/* global help:readonly, usage:readonly, helpOptions:readonly, options:readonly, requireText:readonly, requireImage:readonly, textName:readonly, useTenorApi:readonly, tenorClientConfig:readonly, CanvasKitUtil:readonly, TenorHttpClient:readonly, decodeLibrary:readonly, loadDecodeLibrary */

// config
const defaultHelpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "-u"];

const defaultHelp = "No help text configured.",
    defaultUsage = `See \`%t ${tag.name} help\` for usage.`;

const defaultTenorClientConfig = {
    key: LoaderUtils.caesarCipher("QYFqiEQRMdEE2wNFMmTYetr8wO9KX5JHLj6dyAU", -16, 2),
    client_key: "caption"
};

const config = {
    help: typeof help === "undefined" ? defaultHelp : help,
    usage: typeof usage === "undefined" ? defaultUsage : usage,
    helpOptions: typeof helpOptions === "undefined" ? [] : helpOptions,

    options: typeof options === "undefined" ? {} : options,
    requireText: typeof requireText === "undefined" ? false : requireText,
    requireImage: typeof requireImage === "undefined" ? false : requireImage,
    textName: typeof textName === "undefined" ? "" : textName,

    useTenorApi: typeof useTenorApi === "undefined" ? true : useTenorApi,
    tenorClientConfig: typeof tenorClientConfig === "undefined" ? defaultTenorClientConfig : tenorClientConfig,

    decodeLibrary: typeof decodeLibrary === "undefined" ? "none" : decodeLibrary,
    loadDecodeLibrary: typeof loadDecodeLibrary === "undefined" ? () => {} : loadDecodeLibrary
};

const _helpOptions = config.helpOptions.length > 0 ? config.helpOptions : defaultHelpOptions,
    _requireText = config.requireText || Boolean(config.textName),
    _textName = config.textName ? config.textName + " " : config.textName;

// sources
const urls = {};

const tags = {
    TenorHttpClient: "ck_tenorhttpclient"
};

// errors
class LoaderError extends CustomError {}

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
                } else if (config.useTenorApi && (tenorInfo = parseTenorUrl(fileUrl))) {
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
function decodeImage(data) {
    let image, width, height, isGif;

    switch (config.decodeLibrary) {
        case "none":
            image = data;
            isGif = LoaderUtils.bufferIsGif(data);

            break;
        case "canvaskit":
            config.loadDecodeLibrary(config.decodeLibrary);

            Benchmark.startTiming("decode_image");
            image = CanvasKitUtil.makeImageOrGifFromEncoded(data);
            Benchmark.stopTiming("decode_image");

            width = image.width();
            height = image.height();
            isGif = image instanceof CanvasKit.AnimatedImage;

            break;
        case "lodepng":
            isGif = LoaderUtils.bufferIsGif(data);

            if (isGif) {
                config.loadDecodeLibrary("canvaskit");

                if (typeof globalThis.CanvasKit === "undefined") {
                    throw new LoaderError("Can't decode GIFs with lodepng");
                }

                Benchmark.startTiming("decode_image");
                image = CanvasKitUtil.makeGifFromEncoded(data);
                Benchmark.stopTiming("decode_image");

                width = image.width();
                height = image.height();
            } else {
                config.loadDecodeLibrary(config.decodeLibrary);

                Benchmark.startTiming("decode_image");
                image = lodepng.decode(data);
                Benchmark.stopTiming("decode_image");

                ({ width, height } = image);
            }

            break;
        default:
            throw new LoaderError("Unknown library: " + config.decodeLibrary);
    }

    return [image, width, height, isGif];
}

function downloadImage(msg) {
    Benchmark.startTiming("download_image");
    const { data } = LoaderUtils.fetchAttachment(msg, FileDataTypes.binary);
    Benchmark.stopTiming("download_image");

    return decodeImage(data);
}

function loadImage() {
    if (typeof targetMsg.tenorGif === "object") {
        loadTenorClient();
        const client = new TenorHttpClient(config.tenorClientConfig);

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
    return { image, width, height, isGif };
}

// exports
module.exports = { parseArgs, loadImage };
