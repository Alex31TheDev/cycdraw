"use strict";

// config
const maxWidth = 1000,
    maxHeight = 2048,
    maxHeightDelta = 20;

const enableDebugger = util.inspectorEnabled ?? false;

let showTimes = false;

// sources
const urls = {};

const tags = {
        DiscordHttpClient: "discordhttpclient",
        Table: "ck_table"
    },
    tagOwner = "883072834790916137";

const fonts = {
    futura: {
        url: "https://github.com/kelsanford/portfolio/raw/refs/heads/master/Fonts/futura/Futura%20Extra%20Black%20Condensed%20BT.ttf",
        tag: "ck_font_futura",
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
        buf_size: null
    }
};

// help
const helpOption = ["help", "-help", "--help", "-h", "usage", "-usage", "-u"],
    showTimesOption = "-show_times";

const help = `Usage: \`%t ${tag.name} [-show_time] [url] <caption>\`
Captions the given image (from the message you answered or the URL)`,
    usage = `See \`%t ${tag.name} help\` for usage.`;

// misc
const urlRegex = /(\S*?):\/\/(?:([^\/\.]+)\.)?([^\/\.]+)\.([^\/\s]+)\/?(\S*)?/,
    attachRegex = /^(https:\/\/(?:cdn|media).discordapp.(?:com|net)\/attachments\/\d+?\/\d+?\/[^?]+?)(?:\?|$)/;

const customEmojiRegex = /<:(.+?):(\d+?)>/g,
    customEmojiReplacement = "\ue000";

// errors
class ExitError extends Error {}

// classes
const Endpoints = {
    customEmoji: id => LoaderUtils.HttpUtil.joinUrl("emojis", id)
};

// globals
let targetMsg, args, text;
let image, width, height;
let CanvasKitUtil, DiscordHttpClient, DiscordConstants;
let ranges, customEmojis, hasCustomEmojis;
let surface;

const main = (() => {
    // parse args and attachment
    function parseArgs() {
        [targetMsg, args] = (() => {
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
                    const fileUrl = urlMatch[0],
                        attachMatch = fileUrl.match(attachRegex);

                    if (attachMatch) {
                        const attachPrefix = attachMatch[0],
                            embed = targetMsg.embeds.find(embed => embed.thumbnail.url.startsWith(attachPrefix));

                        if (!embed) {
                            const out = ":warning: Attachment embed not found. (it's needed because discord is dumb)";
                            throw new ExitError(out);
                        }

                        targetMsg.fileUrl = embed.thumbnail.url;
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
            const split = args.split(" "),
                option = split[0];

            checkArgs: if (split.length === 1) {
                if (helpOption.includes(option)) {
                    const out = `:information_source: ${help}`;
                    throw new ExitError(out);
                }
            } else if (split.length > 0) {
                switch (option) {
                    case showTimesOption:
                        showTimes = true;
                        break;
                    default:
                        break checkArgs;
                }

                split.shift();
            }

            const text = split.join(" ");

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

    // load canvaskit
    function loadCanvasKit() {
        if (util.env) {
            eval(util.fetchTag("canvaskitloader").body);
        } else {
            util.executeTag("canvaskitloader");
        }

        ModuleLoader.tagOwner = tagOwner;
        CanvasKitUtil = ModuleLoader.loadModuleFromTag("canvaskitutil");
    }

    // load ranges
    function getRanges(str) {
        return str.split(" ").map(range => {
            const split = range.split("-");

            const first = parseInt(split[0], 16),
                last = split[1] ? parseInt(split[1], 16) : first;

            return [first, last];
        });
    }

    function isInRange(name, codepoint) {
        const range = ranges[name];

        for (const [first, last] of range) {
            if (codepoint >= first && codepoint <= last) return true;
        }

        return false;
    }

    function loadRanges() {
        Benchmark.startTiming("load_ranges");

        ranges = {
            emojis: getRanges(
                "203C 2049 20E3 2122 2139 2194-2199 21A9-21AA 231A-231B 2328 23CF 23E9-23F3 23F8-23FA 24C2 25AA-25AB 25B6 25C0 25FB-25FE 2600-2604 260E 2611 2614-2615 2618 261D 2620 2622-2623 2626 262A 262E-262F 2638-263A 2640 2642 2648-2653 265F-2660 2663 2665-2666 2668 267B 267E-267F 2692-2697 2699 269B-269C 26A0-26A1 26A7 26AA-26AB 26B0-26B1 26BD-26BE 26C4-26C5 26C8 26CE-26CF 26D1 26D3-26D4 26E9-26EA 26F0-26F5 26F7-26FA 26FD 2702 2705 2708-270D 270F 2712 2714 2716 271D 2721 2728 2733-2734 2744 2747 274C 274E 2753-2755 2757 2763-2764 2795-2797 27A1 27B0 27BF 2934-2935 2B05-2B07 2B1B-2B1C 2B50 2B55 3030 303D 3297 3299 1F004 1F0CF 1F170-1F171 1F17E-1F17F 1F18E 1F191-1F19A 1F1E6-1F1FF 1F201-1F202 1F21A 1F22F 1F232-1F23A 1F250-1F251 1F300-1F321 1F324-1F393 1F396-1F397 1F399-1F39B 1F39E-1F3F0 1F3F3-1F3F5 1F3F7-1F4FD 1F4FF-1F53D 1F549-1F54E 1F550-1F567 1F56F-1F570 1F573-1F57A 1F587 1F58A-1F58D 1F590 1F595-1F596 1F5A4-1F5A5 1F5A8 1F5B1-1F5B2 1F5BC 1F5C2-1F5C4 1F5D1-1F5D3 1F5DC-1F5DE 1F5E1 1F5E3 1F5E8 1F5EF 1F5F3 1F5FA-1F64F 1F680-1F6C5 1F6CB-1F6D2 1F6D5-1F6D7 1F6DC-1F6E5 1F6E9 1F6EB-1F6EC 1F6F0 1F6F3-1F6FC 1F7E0-1F7EB 1F7F0 1F90C-1F93A 1F93C-1F945 1F947-1F9FF 1FA70-1FA7C 1FA80-1FA89 1FA8F-1FAC6 1FACE-1FADC 1FADF-1FAE9 1FAF0-1FAF8 E0030-E0039 E0061-E007A E007F FE4E5-FE4EE FE82C FE82E-FE837"
            )
        };

        Benchmark.stopTiming("load_ranges");
    }

    // load misc
    const defaultFonts = ["futura"],
        loadedFonts = {};

    function loadFonts(names = []) {
        Benchmark.restartTiming("load_font");

        for (const name of defaultFonts) {
            if (!names.includes(name)) names.unshift(name);
        }

        const fontData = [];

        for (const name of names) {
            const fontInfo = fonts[name];

            if (typeof fontInfo === "undefined") {
                throw new CustomError(`Font ${name} not found`);
            }

            const url = fontInfo.url ?? null,
                tagName = fontInfo.tag ?? null;

            loadedFonts[name] ??= ModuleLoader.getModuleCode(url, tagName, FileDataTypes.binary, {
                encoded: true,
                buf_size: fontInfo.buf_size,
                cache: false
            });

            fontData.push(loadedFonts[name]);
        }

        const fontMgr = CanvasKit.FontMgr.FromData(...fontData);

        Benchmark.stopTiming("load_font");
        return fontMgr;
    }

    function downloadImage(msg) {
        Benchmark.startTiming("download_image");

        const imgData = LoaderUtils.fetchAttachment(msg, FileDataTypes.binary),
            image = CanvasKitUtil.makeImageFromEncoded(imgData);

        let width = image.width(),
            height = image.height();

        Benchmark.stopTiming("download_image");
        return [image, width, height];
    }

    function loadImage() {
        [image, width, height] = (() => {
            let image;

            try {
                image = downloadImage(targetMsg);
            } catch (err) {
                if (["UtilError", "CanvasUtilError"].includes(err.name)) {
                    const out = `:warning: ${err.message}.\n${usage}`;
                    throw new ExitError(out);
                }

                throw err;
            }

            return image;
        })();
    }

    function loadDiscordHttpClient() {
        DiscordHttpClient = ModuleLoader.loadModuleFromTag(tags.DiscordHttpClient);
        DiscordConstants = DiscordHttpClient.DiscordConstants;
    }

    // calc dimensions
    function calcFontSize(width, height) {
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
        customEmojis = (() => {
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

            hasCustomEmojis = customEmojis.length > 0;
            if (!hasCustomEmojis) return customEmojis;

            loadDiscordHttpClient();
            const client = new DiscordHttpClient({ token: "" });

            Benchmark.startTiming("fetch_custom_emojis");

            const emojiImgs = {};

            for (const emoji of customEmojis) {
                if (!(emoji.id in emojiImgs)) {
                    const imgData = client.getAsset(Endpoints.customEmoji(emoji.id), {
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
            return customEmojis;
        })();
    }

    function getCustomEmojiRects(paragraph, textX, textY) {
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
    }

    // caption
    function getParagraph(text, paraStyle, availableSpace, fontMgr) {
        const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
        builder.addText(text);

        const paragraph = builder.build();
        paragraph.layout(availableSpace);

        return paragraph;
    }

    function captionMain() {
        Benchmark.startTiming("caption_total");

        let fontMgr = loadFonts(hasCustomEmojis ? ["customEmoji"] : []);

        surface = (() => {
            Benchmark.startTiming("draw_image");

            let fontSize, availableSpace, paragraph, headerHeight, totalHeight, textWidth, textHeight;

            const paraStyle = new CanvasKit.ParagraphStyle({
                textStyle: {
                    color: CanvasKit.BLACK,
                    fontFamilies: CanvasKitUtil.getFontFamilies(fontMgr)
                },
                textAlign: CanvasKit.TextAlign.Center
            });

            const makeParagraph = _ => {
                [width, height] = calcClampedSize(width, height, totalHeight, maxHeight);
                [fontSize, availableSpace] = calcFontSize(width, height);
                paraStyle.textStyle.fontSize = fontSize;
                paragraph = getParagraph(text, paraStyle, availableSpace, fontMgr);
                [textWidth, textHeight, headerHeight] = calcHeaderHeight(paragraph, fontSize);
                totalHeight = height + headerHeight;
            };

            do {
                makeParagraph();
            } while (totalHeight - maxHeight > maxHeightDelta);

            const unresolved = paragraph.unresolvedCodepoints();

            if (unresolved.length > 0) {
                const foundRanges = Object.keys(ranges).filter(name =>
                    unresolved.some(codepoint => isInRange(name, codepoint))
                );

                if (foundRanges.length > 0) {
                    Benchmark.stopTiming("draw_image");
                    fontMgr.delete();
                    fontMgr = loadFonts(foundRanges);
                    Benchmark.restartTiming("draw_image");

                    paraStyle.textStyle.fontFamilies = CanvasKitUtil.getFontFamilies(fontMgr);
                    makeParagraph();
                }
            }

            const surface = CanvasKit.MakeSurface(width, totalHeight),
                canvas = surface.getCanvas();

            canvas.clear(CanvasKit.WHITE);

            const textX = (width - textWidth) / 2,
                textY = (headerHeight - textHeight) / 2;

            canvas.drawParagraph(paragraph, textX, textY);

            const blankPaint = new CanvasKit.Paint(),
                whitePaint = new CanvasKit.Paint();
            whitePaint.setColor(CanvasKit.WHITE);

            const drawImageOpts = [CanvasKit.FilterMode.Linear, CanvasKit.MipmapMode.None];

            getCustomEmojiRects(paragraph, textX, textY);
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

            const imgSrcRect = [0, 0, image.width(), image.height()],
                imgDestRect = [0, headerHeight, width, surface.height()];

            canvas.drawImageRectOptions(image, imgSrcRect, imgDestRect, ...drawImageOpts, blankPaint);

            Benchmark.stopTiming("draw_image");

            fontMgr.delete();
            fontMgr = undefined;

            image.delete();
            image = undefined;

            return surface;
        })();

        Benchmark.stopTiming("caption_total");
    }

    function sendOutput() {
        if (surface === null || typeof surface === "undefined") {
            throw new CustomError("No surface");
        }

        Benchmark.startTiming("encode_png");
        const pngBytes = CanvasKitUtil.encodeSurface(surface);
        Benchmark.stopTiming("encode_png");

        surface.delete();
        surface = undefined;

        if (enableDebugger) debugger;

        let out;
        if (showTimes) {
            ModuleLoader.loadModuleFromTag(tags.Table);

            Benchmark.deleteLastCountTime("tag_fetch");
            Benchmark.deleteLastCountTime("module_load");

            const table = Benchmark.getTable("heavy", 1, "load_total", "load_ranges", "caption_total", "encode_png");
            out = LoaderUtils.codeBlock(table);
        }

        msg.reply(out, {
            file: {
                name: "caption.png",
                data: pngBytes
            }
        });

        throw new ExitError();
    }

    return _ => {
        parseArgs();
        loadCanvasKit();
        loadCustomEmojis();
        loadImage();
        loadRanges();

        Benchmark.clearExcept("load_total", "load_ranges");
        captionMain();
        sendOutput();
    };
})();

try {
    if (enableDebugger) debugger;

    // run main
    main();
} catch (err) {
    // output
    if (err instanceof ExitError) {
        const out = err.message;
        msg.reply(out);
    } else {
        throw err;
    }
}
