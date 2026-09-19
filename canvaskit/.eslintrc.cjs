const messages = {
    undefined: "Use typeof checks instead of undefined comparisons.",
    emptyString: "Use LoaderUtils.empty instead of direct empty-string comparisons.",
    emptyLength: "Use LoaderUtils.empty instead of direct length/size emptiness comparisons.",
    singleLength: "Use LoaderUtils.single or LoaderUtils.multiple instead of direct single-item length/size comparisons.",
    rawError: "Use a repo error class instead of raw Error."
};

const canonicalGlobals = {
    tag: "writable",
    msg: "writable",
    util: "writable",
    http: "writable",
    vm: "writable"
};

const loaderGlobals = {
    CustomError: "writable",
    ExitError: "writable",
    Benchmark: "writable",
    LoaderUtils: "writable",
    EncryptionUtil: "writable",
    HttpUtil: "writable",
    UploadUtil: "writable",
    exit: "writable",
    FileDataTypes: "writable",
    ModuleLoader: "writable",
    Patches: "writable",
    loadSource: "writable",
    enableDebugger: "writable",
    XzDecompressor: "writable",
    ZstdDecompressor: "writable",
    decompress: "writable",
    CanvasKit: "writable",
    Resvg: "writable",
    lodepng: "writable",
    gifenc: "writable",
    Color: "writable",
    Point: "writable",
    Grid: "writable",
    Font: "writable",
    Colors: "writable",
    f_1: "writable",
    DigitFont: "writable",
    Image: "writable",
    H264MP4Encoder: "writable",
    loadLibrary: "writable",
    loadBase2nDecoder: "writable",
    loadXzDecompressor: "writable",
    loadZstdDecompressor: "writable"
};

const undefinedSelectors = [
    "BinaryExpression[operator='==='] > Identifier[name='undefined']",
    "BinaryExpression[operator='!=='] > Identifier[name='undefined']"
];

const internalUtilsBinarySelector =
    "VariableDeclarator[id.name=/(?:Utils?|Tester)$/] BinaryExpression";

const excludeInternalUtils = selectors => {
    return selectors.map(selector =>
        selector.replace("BinaryExpression", `BinaryExpression:not(${internalUtilsBinarySelector})`)
    );
};

const emptyStringSelectors = [
    "BinaryExpression[operator='==='][left.value='']",
    "BinaryExpression[operator='==='][right.value='']",
    "BinaryExpression[operator='!=='][left.value='']",
    "BinaryExpression[operator='!=='][right.value='']",
    "BinaryExpression[operator='=='][left.value='']",
    "BinaryExpression[operator='=='][right.value='']",
    "BinaryExpression[operator='!='][left.value='']",
    "BinaryExpression[operator='!='][right.value='']"
];

const emptyLengthSelectors = [
    "BinaryExpression[left.type='MemberExpression'][left.property.name=/^(length|size)$/][operator=/^(===|==|<=)$/][right.value=0]",
    "BinaryExpression[left.type='MemberExpression'][left.property.name=/^(length|size)$/][operator='<'][right.value=1]",
    "BinaryExpression[left.value=0][operator=/^(===|==|>=)$/][right.type='MemberExpression'][right.property.name=/^(length|size)$/]",
    "BinaryExpression[left.value=1][operator='>'][right.type='MemberExpression'][right.property.name=/^(length|size)$/]",
    "BinaryExpression[left.type='MemberExpression'][left.property.name=/^(length|size)$/][operator=/^(!==|!=|>)$/][right.value=0]",
    "BinaryExpression[left.type='MemberExpression'][left.property.name=/^(length|size)$/][operator='>='][right.value=1]",
    "BinaryExpression[left.value=0][operator=/^(!==|!=|<)$/][right.type='MemberExpression'][right.property.name=/^(length|size)$/]",
    "BinaryExpression[left.value=1][operator='<='][right.type='MemberExpression'][right.property.name=/^(length|size)$/]"
];

const singleLengthSelectors = [
    "BinaryExpression[left.type='MemberExpression'][left.property.name=/^(length|size)$/][operator=/^(===|==|!==|!=|>|<|>=|<=)$/][right.value=1]",
    "BinaryExpression[left.value=1][operator=/^(===|==|!==|!=|>|<|>=|<=)$/][right.type='MemberExpression'][right.property.name=/^(length|size)$/]"
];

const rawErrorSelectors = [
    "ThrowStatement > NewExpression[callee.name='Error']",
    "ThrowStatement > CallExpression[callee.name='Error']"
];

const makeRules = (selectors, message) => {
    return selectors.map(selector => ({
        selector,
        message
    }));
};

const makeAppRules = (strings, emptyLengths, singleLengths) => [
    ...makeRules(undefinedSelectors, messages.undefined),
    ...makeRules(strings, messages.emptyString),
    {
        selector: `:matches(${emptyLengths.join(", ")})`,
        message: messages.emptyLength
    },
    {
        selector: `:matches(${singleLengths.join(", ")})`,
        message: messages.singleLength
    },
    ...makeRules(rawErrorSelectors, messages.rawError)
];

const appRules = makeAppRules(emptyStringSelectors, emptyLengthSelectors, singleLengthSelectors),
    loaderAppRules = makeAppRules(
        excludeInternalUtils(emptyStringSelectors),
        excludeInternalUtils(emptyLengthSelectors),
        excludeInternalUtils(singleLengthSelectors)
    );

module.exports = {
    env: {
        node: true,
        es2023: true
    },
    extends: "eslint:recommended",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    globals: {
        ...canonicalGlobals,
        ...loaderGlobals
    },
    rules: {
        "no-unused-vars": "off",
        "no-duplicate-imports": "error",
        "no-ex-assign": "off",
        "no-case-declarations": "off",
        "no-constant-condition": "off",
        "no-debugger": "off",
        "no-empty": "off",
        eqeqeq: ["error", "always", { null: "ignore" }],
        "no-restricted-syntax": ["error", ...appRules],
        "no-template-curly-in-string": "warn",
        "object-shorthand": ["warn", "properties"],
        "require-await": "error"
    },
    overrides: [
        {
            files: ["canvaskitloader.js"],
            rules: {
                "no-restricted-syntax": ["error", ...loaderAppRules]
            }
        }
    ]
};
