"use strict";

// config
const maxWidth = 1000,
    maxHeight = 2048,
    maxHeightDelta = 20;

const enableDebugger = util.inspectorEnabled ?? false;

let showTimes = false;

// sources
const urls = {
    fonts: {
        futura: "https://github.com/kelsanford/portfolio/raw/refs/heads/master/Fonts/futura/Futura%20Extra%20Black%20Condensed%20BT.ttf",
        emojis: "https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf",
        customEmoji: "https://files.catbox.moe/t4r4rf.ttf"
    }
};

const tags = {
        fonts: {
            futura: "ck_font_futura",
            emojis: /^ck_font_emoji\d+$/,
            customEmoji: "ck_font_customemoji"
        },
        DiscordHttpClient: "discordhttpclient",
        Table: "ck_table"
    },
    tagOwner = "883072834790916137";

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
let rmsg, content, text;
let image, width, height;
let CanvasKitUtil, DiscordHttpClient, DiscordConstants;
let ranges, customEmojis, hasCustomEmojis;
let surface;

const main = (() => {
    // parse args and attachment
    function parseArgs() {
        [rmsg, content] = (() => {
            let rmsg;
            msg.content = `%t ${tag.name}${tag.args ? " " + tag.args : ""}`;

            if (msg.reference) {
                const msgs = util.fetchMessages();
                rmsg = msgs.findLast(x => x.id === msg.reference.messageId);

                if (typeof rmsg === "undefined") {
                    const out = ":warning: Reply message not found.";
                    throw new ExitError(out);
                }
            } else {
                rmsg = msg;
            }

            if (rmsg.attachments.length > 0) {
                rmsg.file = rmsg.attachments[0];
            } else {
                const urlMatch = rmsg.content.match(urlRegex);

                if (urlMatch) {
                    const fileUrl = urlMatch[0],
                        attachMatch = fileUrl.match(attachRegex);

                    if (attachMatch) {
                        const attachPrefix = attachMatch[0],
                            embed = rmsg.embeds.find(embed => embed.thumbnail.url.startsWith(attachPrefix));

                        if (!embed) {
                            const out = ":warning: Attachment embed not found. (it's needed because discord is dumb)";
                            throw new ExitError(out);
                        }

                        rmsg.fileUrl = embed.thumbnail.url;
                    } else {
                        rmsg.fileUrl = fileUrl;
                    }

                    let leftoverStr = rmsg.content;
                    leftoverStr =
                        leftoverStr.slice(0, urlMatch.index) + leftoverStr.slice(urlMatch.index + fileUrl.length);

                    rmsg.content = leftoverStr.trim();
                } else {
                    const out = `:warning: Message doesn't have any attachments.\n${usage}`;
                    throw new ExitError(out);
                }
            }

            return [rmsg, msg.content];
        })();

        text = (() => {
            const split = content.split(" ").slice(2);

            checkArgs: if (split.length > 0) {
                const option = split[0];

                if (helpOption.includes(option)) {
                    const out = `:information_source: ${help}`;
                    throw new ExitError(out);
                }

                switch (option) {
                    case showTimesOption:
                        showTimes = true;
                        break;
                    default:
                        break checkArgs;
                }

                split.shift();
            }

            let text = (tag.args = split.join(" "));
            text = text.trim();

            if (text.length < 1) {
                const out = `:warning: No caption text provided.\n${usage}`;
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
        Benchmark.deleteTime("load_font");
        Benchmark.startTiming("load_font");

        for (const name of defaultFonts) {
            if (!names.includes(name)) names.unshift(name);
        }

        const fontData = [];

        for (const name of names) {
            const url = urls.fonts[name] ?? null,
                tagName = tags.fonts[name] ?? null;

            loadedFonts[name] ??= ModuleLoader.getModuleCode(url, tagName, FileDataTypes.binary, {
                encoded: true,
                buf_size: 10700 * 1024
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
                image = downloadImage(rmsg);
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

            {
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
            }

            if (customEmojis.length === 0) {
                return customEmojis;
            }

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

                    emojiImgs[emoji.id] = image;
                }

                emoji.image = emojiImgs[emoji.id];
                emoji.srcRect = [0, 0, emoji.image.width(), emoji.image.height()];
            }

            Benchmark.stopTiming("fetch_custom_emojis");

            text = text.replace(customEmojiRegex, customEmojiReplacement);
            return customEmojis;
        })();

        hasCustomEmojis = customEmojis.length > 0;
    }

    function getCustomEmojiRects(paragraph, textX, textY) {
        for (const emoji of customEmojis) {
            const ind = emoji.ind,
                rect = paragraph.getRectsForRange(
                    ind,
                    ind + 1,
                    CanvasKit.RectHeightStyle.Tight,
                    CanvasKit.RectWidthStyle.Tight
                )[0].rect;

            emoji.destRect = rect.map((x, i) => (i % 2 === 0 ? textX + x : textY + x));
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
                    fontMgr.delete();
                    fontMgr = loadFonts(foundRanges);

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
                canvas.drawRect(
                    emoji.destRect.map((x, i) => (i < 2 ? x - 1 : x + 1)),
                    whitePaint
                );

                canvas.drawImageRectOptions(emoji.image, emoji.srcRect, emoji.destRect, ...drawImageOpts, blankPaint);
            }

            const imgSrcRect = [0, 0, image.width(), image.height()],
                imgDestRect = [0, headerHeight, width, surface.height()];

            canvas.drawImageRectOptions(image, imgSrcRect, imgDestRect, ...drawImageOpts, blankPaint);

            Benchmark.stopTiming("draw_image");

            image.delete();
            image = undefined;
            fontMgr.delete();

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

            out = Benchmark.getTable("heavy", 1, "load_total", "load_ranges", "caption_total", "encode_png");
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
