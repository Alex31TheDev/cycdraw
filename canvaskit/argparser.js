// canvaskit argparser
const { ArrayUtil, ObjectUtil, TypeTester, DiscordUtil, CustomError, ExitError, LoaderUtils } = globalThis;

class ArgParserError extends CustomError {
    constructor(message, issues = [], session = null) {
        super(message);
        this.name = "ArgParserError";
        this.issues = issues;
        this.session = session;
    }

    replyAndExit(usage) {
        const errorData = DiscordUtil.formatErrorEmbed("Invalid Arguments", this.message);
        globalThis.msg?.reply?.(errorData.content, errorData);
        globalThis.exit?.();
    }
}

class ArgLexerError extends CustomError {
    constructor(message, index = 0) {
        super(message);
        this.name = "ArgLexerError";
        this.index = index;
    }
}

// structs
class CommandToken {
    constructor(type, value, raw, index) {
        this.type = type;
        this.value = value;
        this.raw = raw;
        this.index = index;
    }
}

class CommandQuotedValue {
    constructor(value, quote) {
        this.value = value;
        this.quote = quote;
    }

    toString() {
        return this.value;
    }
}

class CommandValidationIssue {
    constructor(code, message, details = {}) {
        this.code = code;
        this.message = message;
        this.details = details;
    }

    withName(name) {
        return new CommandValidationIssue(this.code, this.message, {
            ...this.details,
            name: this.details.name ?? name
        });
    }
}

class CommandResult {
    constructor(name, raw, value, issues = [], argument = null) {
        this.name = name;
        this.raw = raw;
        this.value = value;
        this.issues = ArrayUtil.guaranteeArray(issues);
        this.argument = argument;
        this.valid = LoaderUtils.empty(this.issues);
    }

    get hasIssues() {
        return !this.valid;
    }
}

// session
class CommandParseSession {
    constructor(options = {}) {
        this.raw = String(options.raw ?? options.argsText ?? "");
        this.argsText = this.raw;
        this.remainingText = this.raw;
        this.argsIndex = 0;
        this.parser = options.parser ?? null;
        this.results = new Map();
        this.issues = [];
    }

    get valid() {
        if (!LoaderUtils.empty(this.issues)) return false;
        for (const result of this.results.values()) {
            if (!result.valid) return false;
        }
        return true;
    }

    get hasIssues() {
        return !this.valid;
    }

    get values() {
        const out = {},
            allowedNames = this.parser?.argumentNames;

        for (const [name, result] of this.results.entries()) {
            if (!allowedNames || allowedNames.has(name)) {
                out[name] = result.value;
            }
        }

        return out;
    }

    removeArgsRanges(ranges) {
        let text = this.remainingText;
        const sorted = [...ranges].sort((a, b) => b[0] - a[0]);

        for (const [start, end] of sorted) {
            text = text.slice(0, start) + text.slice(end);
        }

        this.remainingText = text;
    }

    getSourceText(from = "args") {
        if (from === "args") {
            return this.remainingText.trim();
        }

        if (this.results.has(from)) {
            return String(this.results.get(from).value ?? "");
        }

        return String(globalThis[from] ?? "");
    }

    value(name) {
        return this.results.get(name)?.value;
    }

    get(name) {
        return this.results.get(name);
    }

    addResult(result) {
        this.results.set(result.name, result);
    }

    addIssue(issue) {
        this.issues.push(issue);
    }

    addIssues(issues) {
        if (!LoaderUtils.empty(issues)) {
            this.issues.push(...issues);
        }
    }

    applyNamedIssues() {
        for (const result of this.results.values()) {
            if (result.hasIssues) {
                const named = result.issues.map(i => i.withName(result.name));
                this.addIssues(named);
            }
        }
    }
}

// lexer
const defaultSeparators = [" ", "\n"];

class CommandTextLexer {
    static lex(str, separators = defaultSeparators) {
        str = String(str ?? "");

        const tokens = [];
        let idx = 0;

        while (idx < str.length) {
            idx = this._skipSeparators(str, separators, idx);

            if (idx >= str.length) break;

            const token = this._readToken(str, separators, idx);
            tokens.push(token.value);
            idx = token.nextIndex;
        }

        return tokens;
    }

    static _skipSeparators(str, separators, idx) {
        let next = idx,
            len = this._getSeparatorLength(str, separators, next);

        while (len > 0 && next < str.length) {
            next += len;
            len = this._getSeparatorLength(str, separators, next);
        }

        return next;
    }

    static _getSeparatorLength(str, separators, idx) {
        for (const sep of separators) {
            if (sep && str.startsWith(sep, idx)) return sep.length;
        }
        return 0;
    }

    static _readToken(str, separators, idx) {
        const state = {
            cooked: "",
            inQuote: false,
            quoteChar: null,
            start: idx
        };

        let next = idx;

        while (next < str.length) {
            if (!state.inQuote && this._getSeparatorLength(str, separators, next) > 0) {
                break;
            }

            next = this._readTokenCharacter(str, state, next);
        }

        if (state.inQuote) {
            throw new ArgLexerError("Unclosed quote", state.start);
        }

        return {
            nextIndex: next,
            value: this._createToken(str, state, next)
        };
    }

    static _readTokenCharacter(str, state, idx) {
        const char = str[idx];

        if (!state.inQuote) {
            if (char === '"' || char === "'") {
                state.inQuote = true;
                state.quoteChar = char;
                return idx + 1;
            }

            state.cooked += char;
            return idx + 1;
        }

        if (char === "\\") {
            const nextChar = str[idx + 1];
            if (nextChar === state.quoteChar || nextChar === "\\") {
                state.cooked += nextChar;
                return idx + 2;
            }

            state.cooked += "\\";
            return idx + 1;
        }

        if (char === state.quoteChar) {
            state.inQuote = false;
            return idx + 1;
        }

        state.cooked += char;
        return idx + 1;
    }

    static _createToken(str, state, end) {
        const raw = str.slice(state.start, end),
            quoted = raw.length >= 2 && (raw.startsWith('"') || raw.startsWith("'")) && raw.endsWith(raw[0]);

        return new CommandToken(
            quoted ? "quoted" : "text",
            quoted ? new CommandQuotedValue(state.cooked, raw[0]) : state.cooked,
            raw,
            state.start
        );
    }
}

// readers
const CommandReaderKinds = Object.freeze({
    positional: "positional",
    rest: "rest",
    list: "list",
    option: "option",
    match: "match",
    group: "group"
});

const OptionSyntaxTypes = Object.freeze({
    dashed: "dashed",
    named: "named",
    both: "both"
});

const booleanLiterals = new Set(["true", "false", "yes", "no", "1", "0", "on", "off", "y", "n", "t", "f"]);

class BaseCommandReader {
    static _unwrapValue(token) {
        if (!token) return null;
        return token.value instanceof CommandQuotedValue ? token.value.value : token.value;
    }

    constructor(options = {}) {
        this.options = ObjectUtil.guaranteeObject(options);
        this.kind = this.options.kind ?? CommandReaderKinds.positional;
        this.name = this.options.name;
    }

    getSourceText(session) {
        return session.getSourceText(this.options.from ?? "args");
    }

    usesArgsSource() {
        return (this.options.from ?? "args") === "args";
    }

    read(session) {
        throw new ArgParserError("Reader must implement read()");
    }
}

class PositionalCommandReader extends BaseCommandReader {
    constructor(options = {}) {
        super(options);
        this.index = this.options.index ?? 0;
        this.attachment = this.options.attachment === true || this.options.media === true;
    }

    read(session) {
        const text = this.getSourceText(session),
            tokens = CommandTextLexer.lex(text);

        if (this.attachment) {
            const token = tokens[this.index];
            const isUrl = typeof token?.value === "string" && /^https?:\/\//i.test(token.value);

            if (isUrl) {
                if (this.usesArgsSource()) session.argsIndex = Math.max(session.argsIndex, this.index + 1);
                return BaseCommandReader._unwrapValue(token);
            }

            const attachUrl = this._resolveAttachment();
            if (LoaderUtils.nonemptyString(attachUrl)) {
                // Return attachment without consuming tokens
                return attachUrl;
            }
        }

        if (tokens.length <= this.index) {
            return null;
        }

        const token = tokens[this.index];
        if (this.usesArgsSource()) {
            session.argsIndex = Math.max(session.argsIndex, this.index + 1);
        }

        return BaseCommandReader._unwrapValue(token);
    }

    _resolveAttachment() {
        const msg = globalThis.msg;
        if (!msg) return null;

        return (
            msg.fileUrl ??
            msg.file?.url ??
            LoaderUtils.first(msg.attachments)?.url ??
            msg.referencedMessage?.fileUrl ??
            LoaderUtils.first(msg.referencedMessage?.attachments)?.url ??
            null
        );
    }
}

class RestCommandReader extends BaseCommandReader {
    read(session) {
        const text = this.getSourceText(session);

        if (!this.usesArgsSource()) return text;

        const tokens = CommandTextLexer.lex(text);

        if (LoaderUtils.empty(tokens)) {
            session.argsIndex = 0;
            return "";
        }

        if (session.argsIndex <= 0) {
            session.argsIndex = tokens.length;
            return text.trim();
        }

        if (session.argsIndex >= tokens.length) {
            session.argsIndex = tokens.length;
            return "";
        }

        const token = tokens[session.argsIndex];
        session.argsIndex = tokens.length;
        return text.slice(token.index).trim();
    }
}

class ListCommandReader extends BaseCommandReader {
    read(session) {
        const text = this.getSourceText(session);
        const tokens = CommandTextLexer.lex(text);

        if (this.usesArgsSource()) {
            session.argsIndex = tokens.length;
        }

        return tokens.map(t => BaseCommandReader._unwrapValue(t));
    }
}

class OptionCommandReader extends BaseCommandReader {
    constructor(options = {}) {
        super(options);
        this.syntax = this.options.syntax ?? OptionSyntaxTypes.dashed;
        this.isBoolean = this.options.type === "boolean" || this.options.flag === true;
        this.spellings = this._compileSpellings();
    }

    read(session) {
        const text = this.getSourceText(session),
            tokens = CommandTextLexer.lex(text),
            matches = this._readMatches(tokens);

        if (LoaderUtils.empty(matches)) {
            return this.isBoolean ? false : null;
        }

        if (this.usesArgsSource()) {
            session.removeArgsRanges(matches.map(m => m.range));
        }

        return matches.at(-1).value;
    }

    _readMatches(tokens) {
        const matches = [];

        for (let i = 0; i < tokens.length; i++) {
            const match = this._readMatch(tokens, i);
            if (match === null) continue;

            matches.push(match.value);
            i = match.nextIndex;
        }

        return matches;
    }

    _readMatch(tokens, idx) {
        const token = tokens[idx];
        if (token?.type !== "text") return null;

        return this._readPrefixedMatch(tokens, idx, token) ?? this._readExactMatch(tokens, idx, token);
    }

    _readPrefixedMatch(tokens, idx, token) {
        const prefix = this.spellings.prefixes.find(val => token.value.startsWith(val));
        if (typeof prefix !== "string") return null;

        return {
            nextIndex: idx,
            value: {
                value: token.value.slice(prefix.length),
                range: [token.index, token.index + token.raw.length]
            }
        };
    }

    _readExactMatch(tokens, idx, token) {
        if (!this.spellings.exacts.includes(token.value)) return null;

        const eqToken = tokens[idx + 1];
        if (eqToken?.value === "=") {
            return this._readEqualsMatch(tokens, idx, token, eqToken);
        }

        if (this.isBoolean) {
            return this._readBooleanMatch(tokens, idx, token);
        }

        return this._readValueMatch(tokens, idx, token);
    }

    _readEqualsMatch(tokens, idx, token, eqToken) {
        const valToken = tokens[idx + 2],
            rangeEnd = valToken ? valToken.index + valToken.raw.length : eqToken.index + eqToken.raw.length;

        return {
            nextIndex: valToken ? idx + 2 : idx + 1,
            value: {
                value: valToken ? BaseCommandReader._unwrapValue(valToken) : "",
                range: [token.index, rangeEnd]
            }
        };
    }

    _readBooleanMatch(tokens, idx, token) {
        const valToken = tokens[idx + 1];

        if (valToken && booleanLiterals.has(String(valToken.value).toLowerCase())) {
            const raw = String(valToken.value).toLowerCase(),
                boolVal = ["true", "yes", "1", "on", "y", "t"].includes(raw);

            return {
                nextIndex: idx + 1,
                value: {
                    value: boolVal,
                    range: [token.index, valToken.index + valToken.raw.length]
                }
            };
        }

        return {
            nextIndex: idx,
            value: {
                value: true,
                range: [token.index, token.index + token.raw.length]
            }
        };
    }

    _readValueMatch(tokens, idx, token) {
        const valToken = tokens[idx + 1];

        if (!valToken) {
            return {
                nextIndex: idx,
                value: {
                    value: null,
                    range: [token.index, token.index + token.raw.length]
                }
            };
        }

        return {
            nextIndex: idx + 1,
            value: {
                value: BaseCommandReader._unwrapValue(valToken),
                range: [token.index, valToken.index + valToken.raw.length]
            }
        };
    }

    _compileSpellings() {
        const exacts = [],
            prefixes = [];

        for (const spelling of this._getSpellings()) {
            exacts.push(...this._getExactSpellings(spelling));
            prefixes.push(...this._getPrefixSpellings(spelling));
        }

        return { exacts, prefixes };
    }

    _getSpellings() {
        const spellings = [];

        if (typeof this.options.name === "string") {
            spellings.push({ value: this.options.name, shorthand: false });
        }

        const names = ArrayUtil.guaranteeArray(this.options.names ?? this.options.aliases);
        for (const name of names) {
            if (typeof name === "string" && name !== this.options.name) {
                spellings.push({ value: name, shorthand: name.length === 1 });
            }
        }

        if (typeof this.options.shorthand === "string") {
            spellings.push({ value: this.options.shorthand, shorthand: true });
        }

        return spellings.filter(s => LoaderUtils.nonemptyString(s.value));
    }

    _getExactSpellings(spelling) {
        const exacts = [];

        if (this.syntax === OptionSyntaxTypes.dashed || this.syntax === OptionSyntaxTypes.both) {
            exacts.push(`${spelling.shorthand ? "-" : "--"}${spelling.value}`);
        }

        if (this.syntax === OptionSyntaxTypes.named || this.syntax === OptionSyntaxTypes.both) {
            exacts.push(spelling.value);
        }

        return exacts;
    }

    _getPrefixSpellings(spelling) {
        return this._getExactSpellings(spelling).flatMap(val => [`${val}=`, `${val}:`]);
    }
}

class MatchCommandReader extends BaseCommandReader {
    constructor(options = {}) {
        super(options);
        this.pattern = options.pattern instanceof RegExp ? options.pattern : new RegExp(options.pattern ?? ".*");
    }

    read(session) {
        const text = this.getSourceText(session),
            match = text.match(this.pattern);

        if (!match || match.index !== 0) return null;

        if (this.usesArgsSource()) {
            session.removeArgsRanges([[0, match[0].length]]);
        }

        return match[0];
    }
}

class GroupCommandReader extends BaseCommandReader {
    constructor(options = {}) {
        super(options);
        this.properties = ObjectUtil.guaranteeObject(options.properties);
    }

    read(session) {
        const out = {};

        for (const [key, prop] of Object.entries(this.properties)) {
            out[key] = session.results.get(prop.name)?.value ?? null;
        }

        return out;
    }
}

const CommandReaderClasses = Object.freeze({
    positional: PositionalCommandReader,
    rest: RestCommandReader,
    list: ListCommandReader,
    option: OptionCommandReader,
    match: MatchCommandReader,
    group: GroupCommandReader
});

// types
const CommandTypeNames = Object.freeze({
    any: "any",
    string: "string",
    integer: "integer",
    number: "number",
    boolean: "boolean",
    enum: "enum",
    regex: "regex",
    group: "group"
});

class BaseCommandType {
    constructor(config = {}) {
        this.config = ObjectUtil.guaranteeObject(config);
    }

    cast(raw, session, arg) {
        return raw;
    }

    validate(value, raw, session, arg) {
        return [];
    }
}

class AnyCommandType extends BaseCommandType {}

class StringCommandType extends BaseCommandType {
    cast(raw, session, arg) {
        if (raw == null) return null;
        const str = String(raw);
        return arg?.lowercase === true ? str.toLowerCase() : str;
    }
}

class IntegerCommandType extends BaseCommandType {
    cast(raw) {
        if (raw == null) return null;
        const str = String(raw).trim();
        return LoaderUtils.parseInt(str, 10, NaN);
    }

    validate(value, raw) {
        if (raw != null && (Number.isNaN(value) || !Number.isInteger(value))) {
            return [new CommandValidationIssue("type", `Expected integer, received "${raw}".`)];
        }

        return [];
    }
}

class NumberCommandType extends BaseCommandType {
    cast(raw) {
        if (raw == null) return null;
        const str = String(raw).replace(/,/g, "").trim();
        return Number(str);
    }

    validate(value, raw) {
        if (raw != null && Number.isNaN(value)) {
            return [new CommandValidationIssue("type", `Expected number, received "${raw}".`)];
        }

        return [];
    }
}

class BooleanCommandType extends BaseCommandType {
    cast(raw) {
        if (raw == null) return null;
        if (typeof raw === "boolean") return raw;

        const str = String(raw).toLowerCase().trim();
        if (["true", "yes", "1", "on", "y", "t"].includes(str)) return true;
        if (["false", "no", "0", "off", "n", "f"].includes(str)) return false;

        return null;
    }

    validate(value, raw) {
        if (raw != null && typeof value !== "boolean") {
            return [new CommandValidationIssue("type", `Expected boolean, received "${raw}".`)];
        }
        return [];
    }
}

class EnumCommandType extends BaseCommandType {
    cast(raw, session, arg) {
        if (raw == null) return null;
        const str = String(raw);
        return arg?.lowercase === true ? str.toLowerCase() : str;
    }

    validate(value, raw) {
        const values = ArrayUtil.guaranteeArray(this.config.values);
        if (raw != null && !values.includes(value)) {
            return [
                new CommandValidationIssue(
                    "enum",
                    `Value "${value}" must be one of: ${values.map(v => `"${v}"`).join(", ")}.`
                )
            ];
        }
        return [];
    }
}

class RegexCommandType extends BaseCommandType {
    validate(value, raw) {
        if (raw == null) return [];

        const regex =
            this.config.pattern instanceof RegExp ? this.config.pattern : new RegExp(this.config.pattern ?? ".*");
        if (!regex.test(String(value))) {
            return [new CommandValidationIssue("pattern", `Value "${value}" does not match required pattern.`)];
        }

        return [];
    }
}

class GroupCommandType extends BaseCommandType {}

const CommandTypeClasses = Object.freeze({
    any: AnyCommandType,
    string: StringCommandType,
    integer: IntegerCommandType,
    number: NumberCommandType,
    boolean: BooleanCommandType,
    enum: EnumCommandType,
    regex: RegexCommandType,
    group: GroupCommandType
});

// argument
class CommandArgument {
    constructor(name, from, reader, type, valid, lowercase, typeName, options = {}) {
        this.name = name;
        this.from = from ?? "args";
        this.reader = reader;
        this.type = type;
        this.valid = valid ?? {};
        this.lowercase = lowercase;
        this.typeName = typeName;
        this.options = options;
    }

    parse(session) {
        const raw = this.reader.read(session);
        const value = this.type.cast(raw, session, this);
        const issues = this.validate(value, raw, session);

        return new CommandResult(this.name, raw, value, issues, this);
    }

    validate(value, raw, session) {
        const issues = [];

        if (this.valid.required === true && (raw == null || raw === "")) {
            issues.push(new CommandValidationIssue("required", `Argument "${this.name}" is required.`));
            return issues;
        }

        if (this._isEmptyValue(value)) {
            if (this.valid.allowEmpty === false && raw != null && raw !== "") {
                issues.push(new CommandValidationIssue("empty", `Argument "${this.name}" cannot be empty.`));
            }
            return issues;
        }

        if (typeof value === "number") {
            if (typeof this.valid.min === "number" && value < this.valid.min) {
                issues.push(new CommandValidationIssue("min", `Value must be at least ${this.valid.min}.`));
            }

            if (typeof this.valid.max === "number" && value > this.valid.max) {
                issues.push(new CommandValidationIssue("max", `Value must be at most ${this.valid.max}.`));
            }
        }

        const typeIssues = this.type.validate(value, raw, session, this);
        if (!LoaderUtils.empty(typeIssues)) {
            issues.push(...typeIssues);
        }

        return issues;
    }

    _isEmptyValue(value) {
        if (typeof value === "string") return LoaderUtils.empty(value);
        return false;
    }
}

// schema normalizer
class CommandArgumentSchema {
    static compile(args) {
        if (!Array.isArray(args)) {
            throw new ArgParserError("Arguments definition must be an array");
        }

        return args.map(arg => this.normalize(arg));
    }

    static normalize(rawArg) {
        const arg = { ...ObjectUtil.guaranteeObject(rawArg) };

        let type = arg.type ?? (arg.flag === true || arg.reader?.flag === true ? "boolean" : "string"),
            kind = arg.kind ?? arg.reader?.kind ?? "positional";

        if (type === "int") type = "integer";
        else if (type === "bool") type = "boolean";

        const valid = { ...ObjectUtil.guaranteeObject(arg.valid) };
        if (arg.required === true) valid.required = true;
        if (arg.allowEmpty === false) valid.allowEmpty = false;
        if (arg.min != null) valid.min = arg.min;
        if (arg.max != null) valid.max = arg.max;
        if (arg.minLength != null) valid.minLength = arg.minLength;
        if (arg.maxLength != null) valid.maxLength = arg.maxLength;
        if (arg.regex != null) valid.regex = arg.regex;

        const readerConfig = {
            kind,
            name: arg.name,
            names: arg.names ?? arg.reader?.names ?? (arg.name ? [arg.name] : []),
            aliases: arg.aliases ?? arg.reader?.aliases,
            shorthand: arg.shorthand ?? arg.reader?.shorthand,
            flag: arg.flag === true || arg.reader?.flag === true,
            syntax: arg.syntax ?? arg.reader?.syntax ?? OptionSyntaxTypes.dashed,
            separator: arg.separator ?? arg.reader?.separator,
            pattern: arg.pattern ?? arg.reader?.pattern,
            index: arg.index ?? arg.reader?.index ?? null,
            attachment: arg.attachment === true || arg.media === true || arg.from === "attachment",
            from: arg.from ?? "args",
            type,
            ...ObjectUtil.guaranteeObject(arg.reader)
        };

        const typeConfig = {
            ...ObjectUtil.guaranteeObject(arg.typeConfig)
        };
        if (arg.values) typeConfig.values = arg.values;
        if (arg.min != null) typeConfig.min = arg.min;
        if (arg.max != null) typeConfig.max = arg.max;
        if (arg.pattern != null) typeConfig.pattern = arg.pattern;

        let properties = null;
        if (kind === "group" || arg.properties) {
            kind = "group";
            properties = {};
            for (const [key, child] of Object.entries(ObjectUtil.guaranteeObject(arg.properties))) {
                properties[key] = this.normalize({
                    ...ObjectUtil.guaranteeObject(child),
                    name: key
                });
            }
        }

        return {
            name: arg.name,
            from: arg.from ?? "args",
            type,
            kind,
            reader: readerConfig,
            typeConfig,
            valid,
            properties,
            lowercase: arg.lowercase ?? arg.reader?.lowercase ?? false
        };
    }
}

// parser
class CommandParser {
    constructor(commandOrArgs = []) {
        let args = commandOrArgs;

        if (TypeTester.isObject(commandOrArgs) && !Array.isArray(commandOrArgs)) {
            args = commandOrArgs.arguments ?? commandOrArgs.args ?? [];
            this.config = ObjectUtil.guaranteeObject(commandOrArgs.config ?? commandOrArgs.info?.parser);
        } else {
            this.config = {};
        }

        this.arguments = [];
        this.argumentNames = new Set();
        this._compileArguments(args);
    }

    _compileArguments(rawArgs) {
        const compiledArgs = CommandArgumentSchema.compile(rawArgs),
            compiled = [];

        let positionalIndex = 0;

        for (const arg of compiledArgs) {
            this.argumentNames.add(arg.name);
            if (arg.kind === "positional") {
                if (arg.reader.index == null) {
                    arg.reader.index = positionalIndex++;
                } else {
                    positionalIndex = Math.max(positionalIndex, arg.reader.index + 1);
                }
            }
            this._compileArgument(arg, compiled);
        }

        this.arguments = compiled;
    }

    _compileArgument(arg, compiled) {
        if (arg.kind === "group") {
            this._compileGroupArgument(arg, compiled);
            return;
        }

        compiled.push(this._createArgument(arg));
    }

    _compileGroupArgument(arg, compiled) {
        const properties = {};

        for (const [key, child] of Object.entries(arg.properties ?? {})) {
            const name = `${arg.name}_${key}`,
                childArg = {
                    ...child,
                    name,
                    from: child.from ?? arg.from ?? "args"
                };

            this._compileArgument(childArg, compiled);
            properties[key] = { name };
        }

        compiled.push(
            new CommandArgument(
                arg.name,
                arg.from ?? "args",
                new GroupCommandReader({
                    kind: "group",
                    name: arg.name,
                    properties
                }),
                new GroupCommandType({}),
                arg.valid,
                null,
                "group",
                arg
            )
        );
    }

    _createArgument(arg) {
        const typeName = this._normalizeTypeName(arg.type),
            reader = this._createReader(arg, typeName),
            type = this._createType(arg, typeName),
            lowercase = arg.lowercase ?? null;

        return new CommandArgument(arg.name, arg.from ?? "args", reader, type, arg.valid, lowercase, typeName, arg);
    }

    _normalizeTypeName(typeName) {
        if (!typeName) return CommandTypeNames.string;

        switch (typeName) {
            case "int":
                return CommandTypeNames.integer;
            case "bool":
                return CommandTypeNames.boolean;
            default:
                return typeName in CommandTypeClasses ? typeName : CommandTypeNames.string;
        }
    }

    _createReader(arg, typeName) {
        const readerKind = arg.reader?.kind ?? arg.kind ?? "positional",
            ReaderClass = CommandReaderClasses[readerKind] ?? PositionalCommandReader;

        return new ReaderClass({
            ...arg.reader,
            name: arg.name,
            type: typeName
        });
    }

    _createType(arg, typeName) {
        const TypeClass = CommandTypeClasses[typeName] ?? StringCommandType;
        return new TypeClass(arg.typeConfig);
    }

    parse(input) {
        input ??= globalThis.tag?.args ?? "";

        const text = typeof input === "string" ? input : input?.argsText ?? input?.content ?? "",
            session = new CommandParseSession({
                raw: text,
                parser: this
            });

        try {
            this._parseArguments(session);
        } catch (err) {
            this._handleParseError(session, err);
        }

        session.applyNamedIssues();
        return session;
    }

    _parseArguments(session) {
        for (const arg of this.arguments) {
            session.addResult(arg.parse(session));
        }
    }

    _handleParseError(session, err) {
        if (err instanceof ArgLexerError) {
            session.addIssue(new CommandValidationIssue("unclosed_quote", err.message, { index: err.index }));
            return;
        }

        throw err;
    }

    parseOrThrow(input, usage) {
        const session = this.parse(input);

        if (!session.valid) {
            const msg = this.formatIssues(session.issues, usage);
            throw new ArgParserError(msg, session.issues, session);
        }

        return session.values;
    }

    parseOrExit(input, usage) {
        const session = this.parse(input);

        if (!session.valid) {
            const msg = this.formatIssues(session.issues, usage),
                err = new ArgParserError(msg, session.issues, session);

            err.replyAndExit(usage);
        }

        return session.values;
    }

    formatIssues(issues, usage) {
        if (LoaderUtils.empty(issues)) return "";

        const help = usage ? `Usage: \`${usage}\`\n\n` : "",
            formatted = issues
                .map(issue => {
                    const prefix = issue.details?.name ? `• **${issue.details.name}**: ` : "• ";
                    return `${prefix}${issue.message}`;
                })
                .join("\n");

        return `${help}${formatted}`;
    }
}

// module exports
const ArgParser = CommandParser;
ArgParser.CommandParser = CommandParser;
ArgParser.Lexer = CommandTextLexer;
ArgParser.Session = CommandParseSession;
ArgParser.Token = CommandToken;
ArgParser.QuotedValue = CommandQuotedValue;
ArgParser.ValidationIssue = CommandValidationIssue;
ArgParser.Result = CommandResult;
ArgParser.Argument = CommandArgument;
ArgParser.Schema = CommandArgumentSchema;
ArgParser.Error = ArgParserError;
ArgParser.LexerError = ArgLexerError;
ArgParser.Readers = CommandReaderClasses;
ArgParser.Types = CommandTypeClasses;
ArgParser.ReaderKinds = CommandReaderKinds;
ArgParser.OptionSyntaxTypes = OptionSyntaxTypes;
ArgParser.TypeNames = CommandTypeNames;

if (typeof module !== "undefined" && module.exports) {
    module.exports = ArgParser;
}

return ArgParser;
