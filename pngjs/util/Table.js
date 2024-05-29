const Table = {
    charSets: {
        light: {
            corner: {
                topLeft: "┌",
                topRight: "┐",
                bottomLeft: "└",
                bottomRight: "┘"
            },
            horizontal: {
                line: "─",
                crossDown: "┬",
                crossUp: "┴"
            },
            vertical: {
                line: "│",
                crossRight: "├",
                crossLeft: "┤"
            },
            middle: {
                cross: "┼"
            }
        },

        heavy: {
            corner: {
                topLeft: "┏",
                topRight: "┓",
                bottomLeft: "┗",
                bottomRight: "┛"
            },
            horizontal: {
                line: "━",
                crossDown: "┳",
                crossUp: "┻"
            },
            vertical: {
                line: "┃",
                crossRight: "┣",
                crossLeft: "┫"
            },
            middle: {
                cross: "╋"
            }
        },

        doubleHorizontal: {
            corner: {
                topLeft: "╒",
                topRight: "╕",
                bottomLeft: "╘",
                bottomRight: "╛"
            },
            horizontal: {
                line: "═",
                crossDown: "╥",
                crossUp: "╧"
            },
            vertical: {
                line: "│",
                crossRight: "╞",
                crossLeft: "╡"
            },
            middle: {
                cross: "╪"
            }
        },

        doubleVertical: {
            corner: {
                topLeft: "╓",
                topRight: "╖",
                bottomLeft: "╙",
                bottomRight: "╜"
            },
            horizontal: {
                line: "─",
                crossDown: "╥",
                crossUp: "╨"
            },
            vertical: {
                line: "║",
                crossRight: "╟",
                crossLeft: "╢"
            },
            middle: {
                cross: "╫"
            }
        },

        double: {
            corner: {
                topLeft: "╔",
                topRight: "╗",
                bottomLeft: "╚",
                bottomRight: "╝"
            },
            horizontal: {
                line: "═",
                crossDown: "╦",
                crossUp: "╩"
            },
            vertical: {
                line: "║",
                crossRight: "╠",
                crossLeft: "╣"
            },
            middle: {
                cross: "╬"
            }
        }
    },

    Util: {
        clamp: (x, a, b) => {
            return Math.max(Math.min(x, b), a);
        },

        length: val => {
            if (typeof val === "undefined") {
                return 0;
            }

            return ("" + val).length;
        },

        arrayLength: arr => {
            if (typeof arr === "undefined") {
                return 0;
            }

            return arr.length;
        },

        concat: (a, ...args) => {
            const concatenated = [].concat(a, ...args);

            if (Array.isArray(a)) {
                return concatenated;
            }

            return concatenated.join("");
        },

        columnWidth: (heading, rows, minWidth = 0, maxWidth = Infinity) => {
            if (typeof rows === "undefined") {
                rows = [];
            }

            const lineLengths = rows.map(Table.Util.length),
                lineMax = Math.max(...lineLengths);

            const width = Math.max(Table.Util.length(heading), lineMax);

            return Table.Util.clamp(width, minWidth, maxWidth);
        }
    },

    Lines: {
        line: (horizontalChar, leftChar, rightChar, crossChar) => widths => {
            const segment = widths.map(w => horizontalChar.repeat(w)).join(crossChar);

            return Table.Util.concat(leftChar, segment, rightChar);
        },

        topSeparatorLine: charSet =>
            Table.Lines.line(
                charSet.horizontal.line,
                charSet.corner.topLeft,
                charSet.corner.topRight,
                charSet.horizontal.crossDown
            ),

        bottomSeparatorLine: charSet =>
            Table.Lines.line(
                charSet.horizontal.line,
                charSet.corner.bottomLeft,
                charSet.corner.bottomRight,
                charSet.horizontal.crossUp
            ),

        middleSeparatorLine: charSet =>
            Table.Lines.line(
                charSet.horizontal.line,
                charSet.vertical.crossRight,
                charSet.vertical.crossLeft,
                charSet.middle.cross
            ),

        insertSeparator: charSet => line => {
            const separator = charSet.vertical.line;
            return separator + line.join(separator) + separator;
        }
    },

    columnWidths: (columns, rows) => {
        const colIds = Object.keys(columns);

        if (colIds.length === 0) {
            return [0];
        }

        const maxWidths = colIds.map(id => {
            const colName = columns[id],
                colRows = rows[id];

            return Table.Util.columnWidth(colName, colRows);
        });

        return maxWidths;
    },

    maxRowHeight: (columns, rows) => {
        const colIds = Object.keys(columns);

        if (colIds.length === 0) {
            return 0;
        }

        const rowHeights = colIds.map(id => {
            const row = rows[id];
            return Table.Util.arrayLength(row);
        });

        return Math.max(...rowHeights);
    },

    padLine: (line, padding) => {
        const padded = line.map((x, i) => {
            const pad = padding[i] ?? 0,
                str = x?.toString() ?? "";

            return str.padEnd(pad);
        });

        return padded;
    },

    getLines: (columns, rows) => {
        const height = Table.maxRowHeight(columns, rows);

        const colIds = Object.keys(columns),
            colNames = Object.values(columns);

        const lines = Array(height + 1);

        if (colIds.length === 0) {
            lines[0] = [""];
        } else {
            lines[0] = colNames;
        }

        for (let i = 0; i < height; i++) {
            const line = [];

            for (const id of colIds) {
                const row = rows[id],
                    str = row[i]?.toString() ?? "";

                line.push(str);
            }

            lines[i + 1] = line;
        }

        return lines;
    },

    drawTable: (columns, rows, style = "light", extraSpacing = 0) => {
        columns = columns ?? {};
        rows = rows ?? {};

        const charSet = Table.charSets[style];

        if (typeof charSet === "undefined") {
            throw new Error("Invalid style: " + style);
        }

        for (const id in rows) {
            const row = rows[id];

            if (!Array.isArray(row)) {
                rows[id] = [row];
            }
        }

        const widths = Table.columnWidths(columns, rows);

        if (extraSpacing > 0) {
            for (let i = 0; i < widths.length; i++) {
                widths[i] += extraSpacing;
            }
        }

        const separate = Table.Lines.insertSeparator(charSet),
            topSeparatorLine = Table.Lines.topSeparatorLine(charSet),
            bottomSeparatorLine = Table.Lines.bottomSeparatorLine(charSet),
            middleSeparatorLine = Table.Lines.middleSeparatorLine(charSet);

        const lines = Table.getLines(columns, rows),
            paddedLines = lines.map(line => Table.padLine(line, widths)),
            separatedLines = paddedLines.map(separate);

        const headingLine = separatedLines[0],
            contentLines = separatedLines.slice(1).join("\n");

        const formattedTable = [topSeparatorLine(widths), headingLine];

        if (contentLines.length > 0) {
            formattedTable.push(middleSeparatorLine(widths));
            formattedTable.push(contentLines);
        }

        formattedTable.push(bottomSeparatorLine(widths));

        return formattedTable.join("\n");
    }
};

module.exports = Table;
