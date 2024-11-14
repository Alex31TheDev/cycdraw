// config
const maxHeight = 2048,
    maxHeightDelta = 20;

// sources
const urls = {
    fonts: {
        futura: "https://github.com/kelsanford/portfolio/raw/refs/heads/master/Fonts/futura/Futura%20Extra%20Black%20Condensed%20BT.ttf",
        emojis: "https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf"
    }
};

const tags = {
        fonts: {
            futura: "ck_font_futura",
            emojis: /^ck_font_emoji\d+$/
        }
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
    attachRegex = /^(https:\/\/cdn.discordapp.com\/attachments\/\d+?\/\d+?\/[^?]+?)(?:\?|$)/;

// errors
class ExitError extends Error {}

try {
    // parse args and attachment
    let showTimes = false;

    const rmsg = (() => {
        let rmsg;

        if (msg.reference) {
            const msgs = util.fetchMessages();
            rmsg = msgs.findLast(x => x.id === msg.reference.messageId);
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
                leftoverStr = leftoverStr.slice(0, urlMatch.index) + leftoverStr.slice(urlMatch.index + fileUrl.length);

                rmsg.content = leftoverStr.trim();
            } else {
                const out = `:warning: Message doesn't have any attachments.\n${usage}`;
                throw new ExitError(out);
            }
        }

        if (msg.reference) {
            rmsg.content = msg.content;
            rmsg.attachments = msg.attachments;
        }

        return rmsg;
    })();

    const text = (() => {
        const split = rmsg.content.split(" ").slice(2);

        let text = (tag.args = split.join(" "));

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

            text = split.slice(1).join(" ");
        }

        if (!text || text.length < 1) {
            const out = `:warning: No caption text provided.\n${usage}`;
            throw new ExitError(out);
        }

        return text;
    })();

    // load canvaskit
    if (util.env) {
        eval(util.fetchTag("canvaskitloader").body);
    } else {
        util.executeTag("canvaskitloader");
    }

    const CanvasKitUtil = ModuleLoader.loadModuleFromTag("canvaskitutil");

    // load ranges
    Benchmark.startTiming("load_ranges");

    function getRanges(str) {
        return str.split(" ").map(range => {
            const split = range.split("-");

            const first = parseInt(split[0], 16),
                last = split[1] ? parseInt(split[1], 16) : first;

            return [first, last];
        });
    }

    const ranges = {
        emojis: getRanges(
            "203C 2049 20E3 2122 2139 2194-2199 21A9-21AA 231A-231B 2328 23CF 23E9-23F3 23F8-23FA 24C2 25AA-25AB 25B6 25C0 25FB-25FE 2600-2604 260E 2611 2614-2615 2618 261D 2620 2622-2623 2626 262A 262E-262F 2638-263A 2640 2642 2648-2653 265F-2660 2663 2665-2666 2668 267B 267E-267F 2692-2697 2699 269B-269C 26A0-26A1 26A7 26AA-26AB 26B0-26B1 26BD-26BE 26C4-26C5 26C8 26CE-26CF 26D1 26D3-26D4 26E9-26EA 26F0-26F5 26F7-26FA 26FD 2702 2705 2708-270D 270F 2712 2714 2716 271D 2721 2728 2733-2734 2744 2747 274C 274E 2753-2755 2757 2763-2764 2795-2797 27A1 27B0 27BF 2934-2935 2B05-2B07 2B1B-2B1C 2B50 2B55 3030 303D 3297 3299 1F004 1F0CF 1F170-1F171 1F17E-1F17F 1F18E 1F191-1F19A 1F1E6-1F1FF 1F201-1F202 1F21A 1F22F 1F232-1F23A 1F250-1F251 1F300-1F321 1F324-1F393 1F396-1F397 1F399-1F39B 1F39E-1F3F0 1F3F3-1F3F5 1F3F7-1F4FD 1F4FF-1F53D 1F549-1F54E 1F550-1F567 1F56F-1F570 1F573-1F57A 1F587 1F58A-1F58D 1F590 1F595-1F596 1F5A4-1F5A5 1F5A8 1F5B1-1F5B2 1F5BC 1F5C2-1F5C4 1F5D1-1F5D3 1F5DC-1F5DE 1F5E1 1F5E3 1F5E8 1F5EF 1F5F3 1F5FA-1F64F 1F680-1F6C5 1F6CB-1F6D2 1F6D5-1F6D7 1F6DC-1F6E5 1F6E9 1F6EB-1F6EC 1F6F0 1F6F3-1F6FC 1F7E0-1F7EB 1F7F0 1F90C-1F93A 1F93C-1F945 1F947-1F9FF 1FA70-1FA7C 1FA80-1FA89 1FA8F-1FAC6 1FACE-1FADC 1FADF-1FAE9 1FAF0-1FAF8 E0030-E0039 E0061-E007A E007F FE4E5-FE4EE FE82C FE82E-FE837"
        )
    };

    function isInRange(name, codepoint) {
        const range = ranges[name];

        for (const [first, last] of range) {
            if (codepoint >= first && codepoint <= last) return true;
        }

        return false;
    }

    Benchmark.stopTiming("load_ranges");

    // load misc
    const defaultFonts = ["futura"],
        loadedFonts = {};

    function loadFonts(names = []) {
        Benchmark.deleteTime("load_font");
        Benchmark.startTiming("load_font");

        for (const name of defaultFonts) {
            if (!names.includes(name)) names.push(name);
        }

        const fontData = [];

        for (const name of names) {
            const url = urls.fonts[name] ?? null,
                tagName = tags.fonts[name] ?? null;

            loadedFonts[name] ??= ModuleLoader.getModuleCode(url, tagName, FileDataTypes.binary, {
                encoded: true,
                owner: tagOwner
            });

            fontData.push(loadedFonts[name]);
        }

        const fontMgr = CanvasKit.FontMgr.FromData(...fontData);

        Benchmark.stopTiming("load_font");
        return fontMgr;
    }

    function loadImage(msg) {
        Benchmark.startTiming("download_image");

        const imgData = LoaderUtils.fetchAttachment(msg, FileDataTypes.binary),
            image = CanvasKitUtil.makeImageFromEncoded(imgData);

        let width = image.width(),
            height = image.height();

        Benchmark.stopTiming("download_image");
        return [image, width, height];
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
        if (totalHeight <= maxHeight) {
            return [width, height];
        }

        const aspect = width / totalHeight,
            heightRatio = maxHeight / totalHeight;

        let newWidth = aspect * maxHeight,
            newHeight = height * heightRatio;

        newWidth = Math.round(newWidth);
        newHeight = Math.round(newHeight);

        return [newWidth, newHeight];
    }

    // caption
    function getParagraph(text, paraStyle, availableSpace, fontMgr) {
        const builder = CanvasKit.ParagraphBuilder.Make(paraStyle, fontMgr);
        builder.addText(text);

        const paragraph = builder.build();
        paragraph.layout(availableSpace);

        return paragraph;
    }

    Benchmark.clearExcept("load_total", "load_ranges");
    Benchmark.startTiming("caption_total");

    let fontMgr = loadFonts();

    let [image, width, height] = (() => {
        let image;

        try {
            image = loadImage(rmsg);
        } catch (err) {
            if (["UtilError", "CanvasUtilError"].includes(err.name)) {
                const out = `:warning: ${err.message}.\n${usage}`;
                throw new ExitError(out);
            }

            throw err;
        }

        return image;
    })();

    const surface = (() => {
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

        const imgSrcRect = [0, 0, image.width(), image.height()],
            imgDestRect = [0, headerHeight, width, surface.height()];

        canvas.drawImageRect(image, imgSrcRect, imgDestRect, new CanvasKit.Paint());

        Benchmark.stopTiming("draw_image");

        image.delete();
        fontMgr.delete();

        return surface;
    })();

    Benchmark.stopTiming("caption_total");

    // output
    if (surface !== null && typeof surface !== "undefined") {
        Benchmark.startTiming("encode_png");
        const pngBytes = CanvasKitUtil.encodeSurface(surface);
        Benchmark.stopTiming("encode_png");
        surface.delete();

        const out = showTimes
            ? Benchmark.getAll("load_total", "load_ranges", "caption_total", "encode_png")
            : undefined;

        msg.reply(out, {
            file: {
                name: "caption.png",
                data: pngBytes
            }
        });
    } else {
        throw new CustomError("No surface");
    }
} catch (err) {
    if (err instanceof ExitError) {
        const out = err.message;
        msg.reply(out);
    } else {
        throw err;
    }
}
