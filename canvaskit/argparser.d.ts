/**
 * TypeScript declaration file for `ArgParser` (`ck_argparser`).
 * Declarative argument parsing engine ported from `el-levert` command parser stack.
 *
 * Designed to execute inside the `canvaskitloader` runtime environment with direct integration
 * into Discord tag arguments (`tag.args`), attachments (`msg.attachments`), and embed reporting (`msg.reply`).
 */

export type ReaderKind = "positional" | "rest" | "list" | "option" | "match" | "group";

export type OptionSyntax = "dashed" | "named" | "both";

export type TypeName =
    | "any"
    | "string"
    | "integer"
    | "int"
    | "number"
    | "boolean"
    | "bool"
    | "script"
    | "enum"
    | "array"
    | "object"
    | "group";

export interface ValidationRules {
    /** Whether this argument is required to be present. */
    required?: boolean;
    /** If `false`, rejects empty strings, empty arrays, or empty script bodies. Defaults to `false`. */
    allowEmpty?: boolean;
    /** Minimum allowed numeric value for `integer` and `number` types. */
    min?: number;
    /** Maximum allowed numeric value for `integer` and `number` types. */
    max?: number;
}

export interface ReaderConfig {
    /** Extraction strategy. */
    kind: ReaderKind;
    /** Token index for positional readers or capture group index for regex match readers. */
    index?: number;
    /** Long aliases for option readers (e.g. `["user", "usr"]`). */
    names?: string[];
    /** Single option name. */
    name?: string;
    /** Automatically lowercases the extracted raw string before type coercion. */
    lowercase?: boolean;
    /** Regular expression pattern for `match` readers. */
    pattern?: RegExp;
    /** Option format syntax: `"dashed"` (`--flag`, `-f`), `"named"` (`flag=val`), or `"both"`. Defaults to `"dashed"`. */
    syntax?: OptionSyntax;
    /** If `true`, treats this option as a boolean flag that defaults to `false` and becomes `true` when passed without a value. */
    flag?: boolean;
}

export interface TypeConfig {
    /** Allowed enum values when `type: "enum"`. */
    values?: readonly (string | number | boolean)[];
    /** Minimum numeric value for `integer` or `number`. */
    min?: number;
    /** Maximum numeric value for `integer` or `number`. */
    max?: number;
    [key: string]: any;
}

export interface ArgumentSchema {
    /** Output property name under which the parsed value will be stored in `session.values`. */
    name: string;
    /**
     * Source string to extract from. Defaults to `"args"`.
     * If set to `"attachment"`, extracts the URL directly from Discord message attachments (`msg.fileUrl` or `msg.attachments`).
     */
    from?: "args" | "attachment" | string;
    /** Target data type for coercion. Defaults to `"string"`. */
    type?: TypeName;
    /** Reader extraction strategy. Shorthand for `reader.kind`. */
    kind?: ReaderKind;
    /** Detailed reader configuration. */
    reader?: ReaderConfig;
    /** Type-specific configuration parameters. */
    typeConfig?: TypeConfig;
    /** Validation constraints. */
    valid?: ValidationRules;
    /** Nested child argument definitions when `kind` is `"group"`. */
    properties?: Record<string, ArgumentSchema>;
    /**
     * If `true`, automatically falls back to checking `msg.attachments` or replied message attachments
     * if the user did not provide a URL or argument value in the command invocation.
     */
    attachment?: boolean;
    /** Alias for `attachment`. */
    media?: boolean;

    // --- Shorthands (Automatically mapped into `reader`, `typeConfig`, or `valid`) ---
    required?: boolean;
    allowEmpty?: boolean;
    min?: number;
    max?: number;
    values?: readonly (string | number | boolean)[];
}

export interface ArgParserConfig {
    /** Array of argument definitions. */
    arguments?: ArgumentSchema[];
    /** Shorthand for `arguments`. */
    args?: ArgumentSchema[];
    /** Parser options. */
    config?: {
        requireArgs?: boolean;
    };
    info?: {
        parser?: {
            requireArgs?: boolean;
        };
    };
}

export interface ScriptResult {
    /** Cleaned script body without wrapping markdown ticks. */
    body: string;
    /** Codeblock language identifier (e.g. `"js"`), or empty string if unformatted. */
    lang: string;
    /** Whether the input was wrapped in a markdown codeblock. */
    isScript: boolean;
}

export interface ArgValidationIssue {
    code: string;
    message: string;
    details: Record<string, any>;
    withName(name: string): ArgValidationIssue;
}

export interface ArgResult<T = any> {
    name: string;
    raw: any;
    value: T;
    issues: ArgValidationIssue[];
    hasIssues: boolean;
    arg: any;
}

export interface ArgParseSession {
    context: any;
    results: Map<string, ArgResult>;
    issues: ArgValidationIssue[];
    parsedTokens: CommandToken[];
    hasIssues: boolean;
    values: Record<string, any>;
    value(name: string): any;
    get(name: string): ArgResult | undefined;
    addResult(result: ArgResult): void;
    addIssue(issue: ArgValidationIssue): void;
    addIssues(issues: ArgValidationIssue[]): void;
    applyNamedIssues(): void;
}

/**
 * Specialized error class thrown when argument validation fails.
 * Extends `CustomError` provided by `canvaskitloader`.
 */
export class ArgParserError extends Error {
    issues: ArgValidationIssue[];
    session: ArgParseSession | null;
    formatted: string;
    constructor(message?: string, issues?: ArgValidationIssue[], session?: ArgParseSession | null);

    /**
     * Formats an embed error payload using `DiscordUtil.formatErrorEmbed`,
     * sends it to Discord via `msg.reply()`, and immediately terminates tag execution via `exit()`.
     */
    replyAndExit(usage?: string): never;
}

export class ArgLexerError extends ArgParserError {
    index: number;
    constructor(message?: string, idx?: number);
}

export class CommandToken {
    raw: string;
    value: string | CommandQuotedValue;
    index: number;
    type: "word" | "quoted";
    constructor(raw: string, value: string | CommandQuotedValue, idx: number, type: "word" | "quoted");
}

export class CommandQuotedValue {
    value: string;
    quote: string;
    constructor(value: string, quote: string);
}

/**
 * Main argument parser for command line strings and tag arguments.
 *
 * @example
 * ```javascript
 * const ArgParser = ModuleLoader.loadModuleFromTag("ck_argparser");
 *
 * const parser = new ArgParser([
 *     { name: "image", kind: "positional", attachment: true, required: true },
 *     { name: "text", kind: "rest", required: true },
 *     { name: "times", kind: "option", flag: true, names: ["show-times", "times"] }
 * ]);
 *
 * // Automatically parses `tag.args`, falling back to attachments if needed:
 * const { image, text, times } = parser.parseOrExit(tag.args, "%t caption [image] <text> [--show-times]");
 * ```
 */
export class ArgParser {
    static parseInvocation(
        raw: string,
        prefix?: string
    ): { raw: string; content: string; name: string; argsText: string } | null;

    constructor(schemaOrConfig: ArgumentSchema[] | ArgParserConfig);

    /**
     * Parses an input string (or falls back to `tag.args` if omitted) and returns a `session`.
     */
    parse(input?: string | { argsText?: string; content?: string } | null): ArgParseSession;

    /**
     * Parses the input (or falls back to `tag.args` if omitted) and returns `session.values`.
     * If validation fails:
     * - By default, formats a Discord error embed, replies to `msg.reply()`, and calls `exit()`.
     * - If caught, the thrown `ArgParserError` contains `issues`, `formatted`, and `session` for custom handling.
     */
    parseOrExit(input?: string | { argsText?: string; content?: string } | null, usage?: string): Record<string, any>;

    /**
     * Parses the input (or falls back to `tag.args` if omitted) and returns `session.values`.
     * If validation fails, throws `ArgParserError` directly without calling `msg.reply()` or `exit()`.
     */
    parseOrThrow(input?: string | { argsText?: string; content?: string } | null, usage?: string): Record<string, any>;

    formatIssues(issues: ArgValidationIssue[]): string;

    // --- Exported Internal Classes ---
    static Lexer: any;
    static Session: any;
    static Token: typeof CommandToken;
    static QuotedValue: typeof CommandQuotedValue;
    static ValidationIssue: any;
    static Result: any;
    static Argument: any;
    static Schema: any;
    static Error: typeof ArgParserError;
    static LexerError: typeof ArgLexerError;
    static Readers: Record<ReaderKind, any>;
    static Types: Record<string, any>;
    static ReaderKinds: Record<ReaderKind, ReaderKind>;
    static OptionSyntaxTypes: Record<OptionSyntax, OptionSyntax>;
    static TypeNames: Record<string, string>;
}

export default ArgParser;
