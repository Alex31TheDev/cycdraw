"use strict";
/* global help:readonly, usage:readonly, helpOptions:readonly, options:readonly, requireText:readonly, requireImage:readonly, textName:readonly, useKlipyApi:readonly, klipyClientConfig:readonly, CanvasKitUtil:readonly, KlipyHttpClient:readonly, DiscordHttpClient:readonly, DiscordConstants:readonly, decodeLibrary:readonly, loadDecodeLibrary */

// config
const defaultHelpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "--usage", "-u"];

const defaultHelp = "No help text configured.",
    defaultUsage = `See \`%t ${tag.name} help\` for usage.`;

const defaultKlipyClientConfig = {
    key: EncryptionUtil.caesarCipher("pbtAcTc9RhtQ1cvJsAX7rsOk5Fy3f8hZWYvzM3S3D2qHbRSGHBGThSqEdN7D89Bk", -16, 2)
};

const config = {
    help: typeof help === "undefined" ? defaultHelp : help,
    usage: typeof usage === "undefined" ? defaultUsage : usage,
    helpOptions: typeof helpOptions === "undefined" ? [] : helpOptions,

    options: typeof options === "undefined" ? {} : options,
    requireText: typeof requireText === "undefined" ? false : requireText,
    requireImage: typeof requireImage === "undefined" ? false : requireImage,
    textName: typeof textName === "undefined" ? "" : textName,

    useKlipyApi: typeof useKlipyApi === "undefined" ? true : useKlipyApi,
    klipyClientConfig: typeof klipyClientConfig === "undefined" ? defaultKlipyClientConfig : klipyClientConfig,

    decodeLibrary: typeof decodeLibrary === "undefined" ? "none" : decodeLibrary,
    loadDecodeLibrary: typeof loadDecodeLibrary === "undefined" ? () => {} : loadDecodeLibrary
};

const _helpOptions = !LoaderUtils.empty(config.helpOptions) ? config.helpOptions : defaultHelpOptions,
    _requireText = config.requireText || Boolean(config.textName),
    _textName = config.textName ? config.textName + " " : config.textName;

// sources
const urls = {};

const tags = {
    KlipyHttpClient: "ck_tenorhttpclient",
    DiscordHttpClient: "ck_discordhttpclient"
};

// errors
class LoaderError extends CustomError {}

// globals

// input
let targetMsg, input, text;

// image
let image, width, height, isGif;

// parse input & attachment
const klipyRegex =
    /^(?:(https?:)\/\/)?(?:www\.)?klipy\.com\/(?:(?<type>gifs?|stickers?|memes?|clips?)\/)?(?<slug>[a-zA-Z0-9_-]+)/;

function parseKlipyUrl(url) {
    const match = url.match(klipyRegex);

    if (!match) {
        return;
    }

    const groups = match.groups;

    return {
        protocol: match[1] ?? "",

        type: groups.type ?? "gif",
        slug: groups.slug
    };
}

const discordAttachRegex = /(?:(https?:)\/\/)?(?:cdn|media)\.discordapp\.(?:com|net)\/attachments\/\d+\/\d+\/[^\s]+/i;

function isDiscordAttachmentUrl(url) {
    return discordAttachRegex.test(url);
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
                exit(":warning: Reply message not found.");
            }
        }

        if (!LoaderUtils.empty(targetMsg.attachments)) {
            const attach = LoaderUtils.first(targetMsg.attachments);

            targetMsg.file = attach;
            targetMsg.fileUrl = attach.url;

            if (isDiscordAttachmentUrl(attach.url)) {
                loadDiscordClient();
                targetMsg.fileUrl = DiscordHttpClient.normalizeAttachmentUrl(attach.url);
                targetMsg.attachInfo = DiscordHttpClient.parseAttachmentUrl(targetMsg.fileUrl);
            } else {
                targetMsg.attachInfo = LoaderUtils.parseAttachmentUrl(attach.url);
            }
        } else {
            const discordMatch = targetMsg.content.match(discordAttachRegex),
                urlMatch = discordMatch ?? targetMsg.content.match(LoaderUtils.urlRegex);

            if (urlMatch) {
                const fileUrl = urlMatch[0];

                let klipyInfo;

                if (discordMatch || isDiscordAttachmentUrl(fileUrl)) {
                    loadDiscordClient();

                    let normalizedUrl = DiscordHttpClient.normalizeAttachmentUrl(fileUrl),
                        attachInfo = DiscordHttpClient.parseAttachmentUrl(normalizedUrl);

                    const embed = targetMsg.embeds?.find(embed => {
                        const thumbnail = embed.thumbnail ?? embed.data?.thumbnail;
                        return (
                            thumbnail &&
                            (thumbnail.url.includes(attachInfo.channelId) ||
                                thumbnail.url.startsWith(attachInfo.prefix))
                        );
                    });

                    if (typeof embed !== "undefined") {
                        const thumbnail = embed.thumbnail ?? embed.data?.thumbnail;
                        normalizedUrl = DiscordHttpClient.normalizeAttachmentUrl(thumbnail.url);
                        attachInfo = DiscordHttpClient.parseAttachmentUrl(normalizedUrl);
                    } else if (
                        typeof targetMsg.embeds !== "undefined" &&
                        !LoaderUtils.empty(targetMsg.embeds) &&
                        !attachInfo.ex
                    ) {
                        exit(":warning: Attachment embed not found. (it's needed because discord is dumb)");
                    }

                    targetMsg.fileUrl = normalizedUrl;
                    targetMsg.attachInfo = attachInfo;
                } else if (config.useKlipyApi && (klipyInfo = parseKlipyUrl(fileUrl))) {
                    targetMsg.klipyGif = klipyInfo;

                    targetMsg.fileUrl = "placeholder";
                    targetMsg.attachInfo = { ext: ".gif" };
                } else {
                    targetMsg.fileUrl = fileUrl;
                    targetMsg.attachInfo = { ext: ".unknown" };
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
            option = LoaderUtils.first(split);

        checkArgs: if (!LoaderUtils.empty(split)) {
            if (_helpOptions.includes(option)) {
                exit(`:information_source: ${config.help}`);
            }

            const func = config.options[option];

            if (typeof func !== "function") {
                break checkArgs;
            }

            const removed = func(split, option, text) ?? 1;

            for (let i = 0; i < removed; i++) split.shift();
            text = split.join(" ");
        }

        if (_requireText && LoaderUtils.empty(text)) {
            exit(`:warning: No ${_textName}text provided.\n${config.usage}`);
        }

        if (config.requireImage && typeof targetMsg.fileUrl === "undefined") {
            exit(`:warning: Message doesn't have any attachments.\n${config.usage}`);
        }

        return text;
    })();

    return { targetMsg, input, text };
}

// load libraries
function loadKlipyClient() {
    if (typeof globalThis.KlipyHttpClient !== "undefined") {
        return;
    }

    Benchmark.restartTiming("load_libraries");

    Benchmark.startTiming("load_klipy_client");
    const KlipyHttpClient = ModuleLoader.loadModuleFromTag(tags.KlipyHttpClient);
    Benchmark.stopTiming("load_klipy_client");

    Patches.patchGlobalContext({
        KlipyHttpClient,
        KlipyConstants: KlipyHttpClient.Constants
    });

    Benchmark.stopTiming("load_libraries");
}

function loadDiscordClient() {
    if (typeof globalThis.DiscordHttpClient !== "undefined") {
        return;
    }

    Benchmark.restartTiming("load_libraries");

    Benchmark.startTiming("load_discord_client");
    const DiscordHttpClient = ModuleLoader.loadModuleFromTag(tags.DiscordHttpClient);
    Benchmark.stopTiming("load_discord_client");

    Patches.patchGlobalContext({
        DiscordHttpClient,
        DiscordConstants: DiscordHttpClient.Constants
    });

    Benchmark.stopTiming("load_libraries");
}

// load image
function decodeImage(data) {
    let image, width, height, isGif;

    const ext = targetMsg.attachInfo.ext;

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
            } else if (ext !== ".png") {
                config.loadDecodeLibrary("canvaskit");

                if (typeof globalThis.CanvasKit === "undefined") {
                    const imgName = ext.slice(1).toUpperCase();
                    throw new LoaderError(`Can't decode ${imgName}s with lodepng`);
                }

                Benchmark.startTiming("decode_image");
                image = CanvasKitUtil.makeImageFromEncoded(data);
                Benchmark.stopTiming("decode_image");
            } else {
                config.loadDecodeLibrary(config.decodeLibrary);

                Benchmark.startTiming("decode_image");
                image = lodepng.decode(data);
                Benchmark.stopTiming("decode_image");
            }

            break;
        default:
            throw new LoaderError("Unknown library: " + config.decodeLibrary);
    }

    width = typeof image.width === "function" ? image.width() : image.width;
    height = typeof image.height === "function" ? image.height() : image.height;

    return { image, width, height, isGif };
}

function downloadImage(msg) {
    Benchmark.startTiming("download_image");
    const { body } = LoaderUtils.fetchAttachment(msg, FileDataTypes.binary);
    Benchmark.stopTiming("download_image");

    return decodeImage(body);
}

function loadImage() {
    if (typeof targetMsg.klipyGif === "object") {
        loadKlipyClient();
        const client = new KlipyHttpClient(config.klipyClientConfig);

        targetMsg.fileUrl = client.getGifUrl(targetMsg.klipyGif.slug);
        delete targetMsg.klipyGif;
    }

    Benchmark.startTiming("load_image");

    const imgInfo = (() => {
        let image;

        try {
            image = downloadImage(targetMsg);
        } catch (err) {
            if (["UtilError", "CanvasUtilError"].includes(err.name)) {
                exit(`:warning: ${err.message}.\n${config.usage}`);
            }

            throw err;
        }

        return image;
    })();

    Benchmark.stopTiming("load_image");
    return imgInfo;
}

// exports
module.exports = { parseArgs, loadImage };
