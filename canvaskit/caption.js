"use strict";
/* global CanvasKitUtil:readonly, gifenc:readonly, Image:readonly TenorHttpClient:readonly, DiscordHttpClient:readonly, DiscordConstants:readonly */

// config
const maxWidth = 1000,
    maxHeight = 2048,
    maxHeightDelta = 20;

let showTimes = false;

const TENOR_API = {
    key: "AIzaSyAB6Nyymg7z6WDIOdbsg8t4Hp315TqNiuE",
    client_key: "caption"
};

// sources
const urls = {};

const tags = {
    DiscordHttpClient: "ck_discordhttpclient",
    TenorHttpClient: "ck_tenorhttpclient",

    Table: "ck_table",

    Cycdraw: "ck_cycdraw",
    GifEncoder: "ck_gifenc"
};

const fonts = {
    futura: {
        url: "https://github.com/kelsanford/portfolio/raw/refs/heads/master/Fonts/futura/Futura%20Extra%20Black%20Condensed%20BT.ttf",
        tag: "ck_font_futura",
        buf_size: 38 * 1024
    },

    roboto: {
        url: "https://files.catbox.moe/fmh6l7.ttf",
        tag: /^ck_font_roboto\d+$/,
        buf_size: null
    },

    emojis: {
        url: "https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf",
        tag: /^ck_font_emoji\d+$/,
        buf_size: 10700 * 1024
    },

    customEmoji: {
        url: "https://files.catbox.moe/t4r4rf.ttf",
        tag: "ck_font_customemoji",
        buf_size: 2 * 1024
    }
};

// help
const helpOptions = ["help", "-help", "--help", "-h", "usage", "-usage", "-u"],
    showTimesOption = "--show-times";

const help = `Usage: \`%t ${tag.name} [--show-times] [url] <caption>\`
Captions the given image (from the message you answered or the URL)`,
    usage = `See \`%t ${tag.name} help\` for usage.`;

// errors
globalThis.ExitError = class extends Error {};

// misc
const urlRegex = /(\S*?):\/\/(?:([^/.]+)\.)?([^/.]+)\.([^/\s]+)\/?(\S*)?/,
    attachRegex = /^(https:\/\/(?:cdn|media).discordapp.(?:com|net)\/attachments\/\d+?\/\d+?\/[^?]+?)(?:\?|$)/,
    tenorRegex = /^https:\/\/tenor\.com\/view\/.+-(\d+)$/;

const customEmojiRegex = /<:(.+?):(\d+?)>/g,
    customEmojiReplacement = "\ue000";

// classes
const DiscordEndpoints = {
    customEmoji: id => HttpUtil.joinUrl("emojis", id)
};

// globals

// input
let targetMsg, input, text;

// image
let image, width, height, isGif;
let originalWidth,
    originalHeight,
    imageOversized = false;

// fonts
let fontRanges;
let customEmojis, hasCustomEmojis;

// caption
let drawImageOpts;
let output;

// main
const main = (() => {
    // parse args and attachment
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
                const urlMatch = targetMsg.content.match(urlRegex);

                if (urlMatch) {
                    const fileUrl = urlMatch[0];

                    let attachMatch, tenorMatch;

                    if ((attachMatch = fileUrl.match(attachRegex))) {
                        const attachPrefix = attachMatch[1],
                            embed = targetMsg.embeds.find(embed => {
                                const thumbnail = embed.thumbnail ?? embed.data?.thumbnail;
                                return thumbnail && thumbnail.url.startsWith(attachPrefix);
                            });

                        if (typeof embed === "undefined") {
                            const out = ":warning: Attachment embed not found. (it's needed because discord is dumb)";
                            throw new ExitError(out);
                        }

                        const thumbnail = embed.thumbnail ?? embed.data.thumbnail;
                        targetMsg.fileUrl = thumbnail.url;
                    } else if ((tenorMatch = fileUrl.match(tenorRegex))) {
                        targetMsg.tenorGif = {
                            id: tenorMatch[1]
                        };

                        targetMsg.fileUrl = "placeholder";
                    } else {
                        targetMsg.fileUrl = fileUrl;
                    }

                    let leftoverStr = targetMsg.content;
                    leftoverStr =
                        leftoverStr.slice(0, urlMatch.index) + leftoverStr.slice(urlMatch.index + fileUrl.length);

                    targetMsg.content = leftoverStr.trim();
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
                if (helpOptions.includes(option)) {
                    const out = `:information_source: ${help}`;
                    throw new ExitError(out);
                }

                let removed = 1;

                switch (option) {
                    case showTimesOption:
                        showTimes = true;
                        break;
                    default:
                        break checkArgs;
                }

                for (let i = 0; i < removed; i++) split.shift();
                text = split.join(" ");
            }

            if (text.length < 1) {
                const out = `:warning: No caption text provided.\n${usage}`;
                throw new ExitError(out);
            }

            if (typeof targetMsg.fileUrl === "undefined") {
                const out = `:warning: Message doesn't have any attachments.\n${usage}`;
                throw new ExitError(out);
            }

            return text;
        })();
    }

    // load libraries
    function loadCanvasKit() {
        delete globalThis.ExitError;

        if (util.env) {
            eval(util.fetchTag("canvaskitloader").body);
        } else {
            util.executeTag("canvaskitloader");
        }

        ModuleLoader.useDefault("tagOwner");
        ModuleLoader.enableCache = false;

        const CanvasKitUtil = ModuleLoader.loadModuleFromTag("canvaskitutil");
        Patches.patchGlobalContext({ CanvasKitUtil });

        drawImageOpts = [CanvasKit.FilterMode.Linear, CanvasKit.MipmapMode.None];
    }

    function loadGifEncoder() {
        if (typeof globalThis.gifenc !== "undefined") {
            return;
        }

        const gifenc = ModuleLoader.loadModuleFromTag(tags.GifEncoder),
            cycdraw = ModuleLoader.loadModuleFromTag(tags.Cycdraw);

        Patches.patchGlobalContext({ ...cycdraw, gifenc });
    }

    function loadDiscordClient() {
        const DiscordHttpClient = ModuleLoader.loadModuleFromTag(tags.DiscordHttpClient);

        Patches.patchGlobalContext({
            DiscordHttpClient,
            DiscordConstants: DiscordHttpClient.Constants
        });
    }

    function loadTenorClient() {
        const TenorHttpClient = ModuleLoader.loadModuleFromTag(tags.TenorHttpClient);

        Patches.patchGlobalContext({
            TenorHttpClient,
            TenorConstants: TenorHttpClient.Constants
        });
    }

    function loadTableGen() {
        ModuleLoader.loadModuleFromTag(tags.Table);

        Benchmark.deleteLastCountTime("tag_fetch");
        Benchmark.deleteLastCountTime("module_load");
    }

    // load ranges
    function loadRanges() {
        Benchmark.startTiming("load_font_ranges");

        fontRanges = {
            emojis: LoaderUtils.parseRanges(
                "203C 2049 20E3 2122 2139 2194-2199 21A9-21AA 231A-231B 2328 23CF 23E9-23F3 23F8-23FA 24C2 25AA-25AB 25B6 25C0 25FB-25FE 2600-2604 260E 2611 2614-2615 2618 261D 2620 2622-2623 2626 262A 262E-262F 2638-263A 2640 2642 2648-2653 265F-2660 2663 2665-2666 2668 267B 267E-267F 2692-2697 2699 269B-269C 26A0-26A1 26A7 26AA-26AB 26B0-26B1 26BD-26BE 26C4-26C5 26C8 26CE-26CF 26D1 26D3-26D4 26E9-26EA 26F0-26F5 26F7-26FA 26FD 2702 2705 2708-270D 270F 2712 2714 2716 271D 2721 2728 2733-2734 2744 2747 274C 274E 2753-2755 2757 2763-2764 2795-2797 27A1 27B0 27BF 2934-2935 2B05-2B07 2B1B-2B1C 2B50 2B55 3030 303D 3297 3299 1F004 1F0CF 1F170-1F171 1F17E-1F17F 1F18E 1F191-1F19A 1F1E6-1F1FF 1F201-1F202 1F21A 1F22F 1F232-1F23A 1F250-1F251 1F300-1F321 1F324-1F393 1F396-1F397 1F399-1F39B 1F39E-1F3F0 1F3F3-1F3F5 1F3F7-1F4FD 1F4FF-1F53D 1F549-1F54E 1F550-1F567 1F56F-1F570 1F573-1F57A 1F587 1F58A-1F58D 1F590 1F595-1F596 1F5A4-1F5A5 1F5A8 1F5B1-1F5B2 1F5BC 1F5C2-1F5C4 1F5D1-1F5D3 1F5DC-1F5DE 1F5E1 1F5E3 1F5E8 1F5EF 1F5F3 1F5FA-1F64F 1F680-1F6C5 1F6CB-1F6D2 1F6D5-1F6D7 1F6DC-1F6E5 1F6E9 1F6EB-1F6EC 1F6F0 1F6F3-1F6FC 1F7E0-1F7EB 1F7F0 1F90C-1F93A 1F93C-1F945 1F947-1F9FF 1FA70-1FA7C 1FA80-1FA89 1FA8F-1FAC6 1FACE-1FADC 1FADF-1FAE9 1FAF0-1FAF8 E0030-E0039 E0061-E007A E007F FE4E5-FE4EE FE82C FE82E-FE837"
            )
        };

        Benchmark.stopTiming("load_font_ranges");
    }

    // load misc
    const defaultFonts = ["futura"],
        loadedFonts = {};

    function loadFonts(names = []) {
        Benchmark.restartTiming("load_font");
        names = Array.from(new Set(defaultFonts.concat(names)));

        const fontData = [];

        for (const name of names) {
            if (name === null || typeof name === "undefined") {
                continue;
            }

            const fontInfo = fonts[name];

            if (typeof fontInfo === "undefined") {
                throw new CustomError(`Font ${name} not found`);
            }

            const url = fontInfo.url ?? null,
                tagName = fontInfo.tag ?? null;

            loadedFonts[name] ??= ModuleLoader.getModuleCode(url, tagName, FileDataTypes.binary, {
                encoded: true,
                buf_size: fontInfo.buf_size
            });

            fontData.push(loadedFonts[name]);
        }

        const fontMgr = CanvasKit.FontMgr.FromData(...fontData);

        Benchmark.stopTiming("load_font");
        return fontMgr;
    }

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
        if (typeof targetMsg.tenorGif === "object") {
            loadTenorClient();
            const client = new TenorHttpClient(TENOR_API);

            targetMsg.fileUrl = client.getGifUrl(targetMsg.tenorGif.id);
            delete targetMsg.tenorGif;
        }

        [image, width, height, isGif] = (() => {
            let image;
            Benchmark.startTiming("load_image");

            try {
                image = downloadImage(targetMsg);
            } catch (err) {
                if (["UtilError", "CanvasUtilError"].includes(err.name)) {
                    const out = `:warning: ${err.message}.\n${usage}`;
                    throw new ExitError(out);
                }

                throw err;
            }

            Benchmark.stopTiming("load_image");
            return image;
        })();

        originalWidth = width;
        originalHeight = height;

        if (isGif) {
            loadGifEncoder();
        }
    }

    // calc dimensions
    function calcFontSize(width) {
        let fontSize = width / 10;

        let margin = width / 25,
            availableSpace = width - 2 * margin;

        availableSpace = Math.round(availableSpace);

        return [fontSize, availableSpace];
    }

    function calcHeaderHeight(paragraph, fontSize) {
        const textWidth = paragraph.getMaxWidth(),
            textHeight = paragraph.getHeight();

        let headerHeight = fontSize + textHeight;
        headerHeight = Math.floor(headerHeight);

        return [textWidth, textHeight, headerHeight];
    }

    function calcClampedSize(width, height, totalHeight = 0, maxHeight) {
        let newWidth = width,
            newHeight = height;

        if (totalHeight > maxHeight) {
            const aspect = width / totalHeight,
                heightRatio = maxHeight / totalHeight;

            newWidth = Math.round(aspect * maxHeight);
            newHeight = Math.round(height * heightRatio);
        }

        if (width > maxWidth) {
            const aspect = height / width;

            newWidth = maxWidth;
            newHeight = Math.round(aspect * maxWidth);
        }

        return [newWidth, newHeight];
    }

    // custom emoji
    function loadCustomEmojis() {
        Benchmark.startTiming("load_custom_emojis");

        [customEmojis, hasCustomEmojis] = (() => {
            const customEmojis = [];

            let match;
            while ((match = customEmojiRegex.exec(text)) !== null) {
                const [name, id] = match.slice(1),
                    ind = match.index;

                customEmojis.push({ name, id, ind });

                text = LoaderUtils.replaceRangeStr(text, customEmojiReplacement, ind, match[0].length);
                customEmojiRegex.lastIndex = ind + 1;
            }

            customEmojiRegex.lastIndex = 0;
            text = text.trim();

            const hasCustomEmojis = customEmojis.length > 0;
            if (!hasCustomEmojis) return [customEmojis, hasCustomEmojis];

            loadDiscordClient();
            const client = new DiscordHttpClient({ token: "" });

            Benchmark.startTiming("fetch_custom_emojis");

            const emojiImgs = {};

            for (const emoji of customEmojis) {
                if (!(emoji.id in emojiImgs)) {
                    const imgData = client.getAsset(DiscordEndpoints.customEmoji(emoji.id), {
                            size: DiscordConstants.allowedSizes[3]
                        }),
                        image = CanvasKitUtil.makeImageFromEncoded(imgData);

                    emojiImgs[emoji.id] = {
                        image,
                        img_w: image.width(),
                        img_h: image.height()
                    };
                }

                Object.assign(emoji, emojiImgs[emoji.id]);

                emoji.srcRect = [0, 0, emoji.img_w, emoji.img_h];
                emoji.square = Math.abs(emoji.img_w - emoji.img_h) <= 2;
            }

            Benchmark.stopTiming("fetch_custom_emojis");

            text = text.replace(customEmojiRegex, customEmojiReplacement);
            return [customEmojis, hasCustomEmojis];
        })();

        Benchmark.stopTiming("load_custom_emojis");
    }

    function getCustomEmojiRects(paragraph, textX, textY) {
        Benchmark.restartTiming("load_custom_emojis");

        for (const emoji of customEmojis) {
            const ind = emoji.ind;

            let rect = paragraph.getRectsForRange(
                ind,
                ind + 1,
                CanvasKit.RectHeightStyle.Tight,
                CanvasKit.RectWidthStyle.Tight
            )[0].rect;

            rect = rect.map((x, i) => (i % 2 === 0 ? textX + x : textY + x));
            emoji.fullRect = rect.map((x, i) => (i < 2 ? x - 1 : x + 1));

            const rect_w = rect[2] - rect[0];
            rect[1] = rect[3] - rect_w;

            rect[1] -= rect_w / 8;
            rect[3] -= rect_w / 8;

            emoji.destRect = new Float32Array(rect);
            emoji.rectWidth = rect_w;

            if (!emoji.square) {
                const ratio = emoji.img_h / emoji.img_w,
                    newHeight = ratio * rect_w;

                const mid_y = (rect[1] + rect[3]) / 2;
                rect[1] = mid_y - newHeight / 2;
                rect[3] = mid_y + newHeight / 2;

                emoji.centerRect = new Float32Array(rect);
            }
        }

        Benchmark.stopTiming("load_custom_emojis");
    }

    // caption
    function getParaStyle() {
        return new CanvasKit.ParagraphStyle({
            textStyle: {
                color: CanvasKit.BLACK
            },
            textAlign: CanvasKit.TextAlign.Center
        });
    }

    function getParagraph(text, availableSpace, paraStyle, fontMgr) {
        const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
        builder.addText(text);

        const paragraph = builder.build();
        paragraph.layout(availableSpace);

        return paragraph;
    }

    function layoutParagraph(text, paraStyle, fontMgr) {
        let fontSize, availableSpace, paragraph, headerHeight, totalHeight, textWidth, textHeight;

        const makeParagraph = _ => {
            [width, height] = calcClampedSize(width, height, totalHeight, maxHeight);

            [fontSize, availableSpace] = calcFontSize(width);
            paraStyle.textStyle.fontSize = fontSize;

            paragraph?.delete();
            paragraph = getParagraph(text, availableSpace, paraStyle, fontMgr);

            [textWidth, textHeight, headerHeight] = calcHeaderHeight(paragraph, fontSize);
            totalHeight = height + headerHeight;
        };

        paraStyle.textStyle.fontFamilies = CanvasKitUtil.getFontFamilies(fontMgr);

        do {
            makeParagraph();
        } while (totalHeight - maxHeight > maxHeightDelta);

        if (width < originalWidth || height < originalHeight) {
            imageOversized = true;
        }

        const textX = (width - textWidth) / 2,
            textY = (headerHeight - textHeight) / 2;

        return [paragraph, headerHeight, totalHeight, textX, textY];
    }

    function loadUnresolvedFonts(paragraph, existing = {}, pre, post) {
        const unresolved = paragraph.unresolvedCodepoints();

        if (unresolved.length === 0) {
            return;
        }

        let foundRanges = Object.keys(fontRanges).filter(name =>
            unresolved.some(codepoint => LoaderUtils.isInRange(fontRanges[name], codepoint))
        );

        if (foundRanges.length === 0) {
            return;
        }

        if (Array.isArray(existing.fonts)) {
            foundRanges = Array.from(new Set(existing.fonts.concat(foundRanges)));
        }

        if (typeof pre === "function") pre(existing.fontMgr, foundRanges);

        existing.fontMgr?.delete();
        const fontMgr = loadFonts(foundRanges);

        if (typeof post === "function") post(fontMgr, foundRanges);
        return fontMgr;
    }

    function prepareCaption() {
        const existingFonts = [hasCustomEmojis ? "customEmoji" : undefined];
        let fontMgr = loadFonts(existingFonts);

        Benchmark.startTiming("prepare_caption");

        const paraStyle = getParaStyle();
        let paragraph, headerHeight, totalHeight, textX, textY;

        const layout = _ => {
            [paragraph, headerHeight, totalHeight, textX, textY] = layoutParagraph(text, paraStyle, fontMgr);
        };

        layout();

        loadUnresolvedFonts(
            paragraph,
            {
                fonts: existingFonts,
                fontMgr
            },

            _ => {
                Benchmark.stopTiming("prepare_caption");
            },
            mgr => {
                Benchmark.restartTiming("prepare_caption");

                fontMgr = mgr;
                layout();
            }
        );

        getCustomEmojiRects(paragraph, textX, textY);
        Benchmark.stopTiming("prepare_caption");

        return [fontMgr, paragraph, headerHeight, totalHeight, textX, textY];
    }

    function drawCaption(canvas, paragraph, textX, textY) {
        canvas.clear(CanvasKit.WHITE);

        canvas.drawParagraph(paragraph, textX, textY);

        const blankPaint = new CanvasKit.Paint(),
            whitePaint = new CanvasKit.Paint();
        whitePaint.setColor(CanvasKit.WHITE);

        for (const emoji of customEmojis) {
            canvas.drawRect(emoji.fullRect, whitePaint);
            canvas.drawImageRectOptions(
                emoji.image,

                emoji.srcRect,
                emoji.square ? emoji.destRect : emoji.centerRect,

                ...drawImageOpts,
                blankPaint
            );
        }

        blankPaint.delete();
        whitePaint.delete();
    }

    function drawImageCanvas(canvas, headerHeight, totalHeight) {
        const blankPaint = new CanvasKit.Paint();

        const imgSrcRect = [0, 0, originalWidth, originalHeight],
            imgDestRect = [0, headerHeight, width, totalHeight];

        canvas.drawImageRectOptions(image, imgSrcRect, imgDestRect, ...drawImageOpts, blankPaint);

        blankPaint.delete();
    }

    function drawImageGif(gif, outImage, headerHeight, totalHeight, options = {}) {
        const frameInd = options.frame ?? 0;

        let delay = image.currentFrameDuration(),
            frame = image.makeImageAtCurrentFrame();

        let framePixels = CanvasKitUtil.readImagePixels(frame);
        frame.delete();
        frame = Image.fromPixels(framePixels, originalWidth, originalHeight);
        framePixels = undefined;

        if (imageOversized) {
            frame.scale(width, height);
        }

        outImage.blit(0, headerHeight, frame);

        const palette = gifenc.quantize(outImage.pixels, 256),
            index = gifenc.applyPalette(outImage.pixels, palette);

        gif.writeFrame(index, width, totalHeight, {
            palette,
            delay
        });
    }

    function captionMain() {
        Benchmark.startTiming("caption_total");

        output = (() => {
            const [fontMgr, paragraph, headerHeight, totalHeight, textX, textY] = prepareCaption();

            Benchmark.startTiming("draw_image");
            let output;

            if (isGif) {
                let surface = CanvasKit.MakeSurface(width, headerHeight),
                    canvas = surface.getCanvas();

                drawCaption(canvas, paragraph, textX, textY);

                let headerPixels = CanvasKitUtil.readSurfacePixels(surface, CanvasKit.AlphaType.Opaque);
                surface.delete();
                const header = Image.fromPixels(headerPixels, width, headerHeight);
                surface = canvas = headerPixels = undefined;

                const outImage = new Image(width, totalHeight);
                outImage.blit(0, 0, header);

                const gif = gifenc.GIFEncoder(),
                    frameCount = image.getFrameCount();

                for (let frame = 0; frame < frameCount; frame++) {
                    drawImageGif(gif, outImage, headerHeight, totalHeight, {
                        frame
                    });

                    image.decodeNextFrame();
                }

                gif.finish();
                output = gif;
            } else {
                const surface = CanvasKit.MakeSurface(width, totalHeight),
                    canvas = surface.getCanvas();

                drawCaption(canvas, paragraph, textX, textY);
                drawImageCanvas(canvas, headerHeight, totalHeight);

                output = surface;
            }

            Benchmark.stopTiming("draw_image");

            if (!isGif) image.delete();
            image = undefined;

            paragraph.delete();
            fontMgr.delete();

            for (const emoji of customEmojis) {
                emoji.image.delete();
            }

            return output;
        })();

        Benchmark.stopTiming("caption_total");
    }

    function sendOutput() {
        let imgBytes;

        if (isGif) {
            const gif = output;

            Benchmark.startTiming("encode_image");
            imgBytes = gif.bytes();
            Benchmark.stopTiming("encode_image");
        } else {
            const surface = output;

            if (surface === null || typeof surface === "undefined") {
                throw new CustomError("No surface");
            }

            Benchmark.startTiming("encode_image");
            imgBytes = CanvasKitUtil.encodeSurface(surface);
            Benchmark.stopTiming("encode_image");

            surface.delete();
        }

        output = undefined;

        if (enableDebugger) debugger;

        let out;
        if (showTimes) {
            loadTableGen();

            const table = Benchmark.getTable("heavy", 1, "load_total", "load_image", "caption_total", "encode_image");
            out = LoaderUtils.codeBlock(table);
        }

        msg.reply(out, {
            file: {
                name: `caption.${isGif ? "gif" : "png"}`,
                data: imgBytes
            }
        });

        throw new ExitError();
    }

    return _ => {
        parseArgs();

        loadCanvasKit();

        if (enableDebugger) debugger;

        loadImage();

        loadRanges();
        loadCustomEmojis();

        //Benchmark.clearExcept("load_total", "load_image", "load_custom_emojis");
        captionMain();
        sendOutput();
    };
})();

try {
    // run main
    main();
} catch (err) {
    // output
    if (err instanceof ExitError) {
        const out = err.message;
        out;
    } else {
        throw err;
    }
}
