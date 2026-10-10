When writing code, make sure to respect the repo code style: reduce duplication (refactor out methods were necessary, dont force duplication of error throws), formatting (use prettier), declaration style: consts and lets are comma grouped ONLY when variables share the exact same semantic purpose / functionality (e.g. coordinates x, y; related options a, b; bounds min, max; preparing options and constructing their config object; parsing an entity and extracting its fields; extracting raw input file properties `contentType, url`; parsing attachment URL info and extracting extension `attachInfo, ext`; evaluating input payload components `body, hasAttachments`; preparing URL input and resolving its message `urlText, urlMsg`). Variables with different purposes or functionalities must NEVER be grouped together in the same declaration block (for example, grouping modifier flags like `isStatic, isPrivate` with source metadata like `line` or type classifiers like `kind` is strictly forbidden; grouping raw input properties `contentType, url` with URL parsing/extension resolution `attachInfo, ext` is strictly forbidden; grouping type flags `isFile, isScript, isBinary` with payload buffer `body` is strictly forbidden; a good split separates orthogonal concerns into distinct blocks separated by newlines, such as parsing stack `let stack = [];`, traversal counters/indices `let contentCount = 0, i = 0;`, and escape state flags `let isEscaped = false;`, whereas splitting tightly-coupled steps like `urlText` and `urlMsg = await resolveMessageFromUrl(urlText)` into separate blocks is a bad split because `urlText` exists solely to resolve `urlMsg`). Each semantic group must be its own declaration block (separate `const` or `let` statement) with an empty line separating different declaration blocks. Look at code on a case-by-case basis: evaluate what variables actually do and their shared objective; never lump variables with fundamentally different roles or concerns into the same declaration block. Prefer consts over lets. A small single-line nested ternary (e.g. `const typeLabel = isBinary ? "Binary tag" : isScript ? "Script" : Util.capitalize(name);`) is fine, and nested ternaries are also allowed when encapsulated in their own dedicated helper function (e.g. `return isBinary ? this.maxTagSize.binary : isScript ? this.maxTagSize.script : this.maxTagSize.text;`); when a nested ternary gets split across multiple lines in the middle of a random function though, that is an issue and strictly prohibited — extract it into its own helper function or use if/else if/else or switch statements instead (when handling mutually exclusive branches, even with returns, use `if / else if / else` rather than sequential independent if statements).
ordering:
classes also have an order:
there are 2 main sections: public and private.
public ALWAYS comes above private.
in each section, static members come first, then instance members.
(Exceptions: in util classes, privates are allowed to be grouped with public methods or variables)
So the top-down section hierarchy is:

1. Public section:
   a. static (properties and methods)
   b. instance (constructor, getters/setters, methods)
   (In util classes, privates are allowed to be grouped with public methods or variables)
2. Private section:
   a. static (properties and methods)
   b. instance (getters/setters, methods)

Order functions by logical flow first, C-style ordering second:
Methods are ordered in the canonical order of their logical flow / the order they execute and are used (e.g. connect executes first, then the handle methods called by or following it).
When logical steps intertwine or when a function uses localized helper subroutines (\_c uses \_a and \_b), apply C-style ordering to those helpers: \_a and \_b come immediately nearby above \_c.
and spacing: put newlines between logical blocks. Import ordering is as follows:
node: prefixed node native libraries
newline
other external libraries
newline
core local dependencies
newline
utility and error dependencies
Avoid writing sloppy fragile logic when simpler logic makes more sense. Finally, if you're unsure of how to write something, look at files in the codebase and write it in the existing style. We do not ever cache objects unnecessarily. Make the code clean, streamlined and put empty lines between logical blocks in functions. no obfuscation. dont try to make the code obfuscated. Hard coding is prohibited, try to work things into a proper architecture. make it easy to read and clean.

Write abstract code but not overly abstract. Avoid writing very long and explicit variable names. Look at the style of variable names in the repo: short and descriptive. A prime example: Do not write "index" instead of "i" or stuff like that. Write "i" in loops and idx anywhere else. You can pick up on more of these examples by looking in the codebase.
Do not stick files together in inappropiate places. Look at the structure of the repo and put files in their proper places.
Reusable logic or repeated calculations must be extracted into dedicated private helper methods rather than being inlined into random functions.
Do not write dead methods or variables that just alias short expressions. This is VERY important: do not try to keep compatibility or legacy code for any reason. We do not write legacy in this repo. When you need to change something in the API, change it as much as you need. Do not feel any restraint in breaking the api and refactoring callers. In fact, this is very encouraged. You should not keep old functions, variables or parameters if they become dead code or simple aliases. They should be instantly removed or refactored out if that happens. Again I repeat: do not maintain compatibility with the old API or write legacy code.
Enum objects should be frozen with Object.freeze but do not freeze stuff past the first level. We do not use generic Error where an existing repo error class applies. Look at CustomError, UtilError, LoaderError, and the other existing error classes before making a new one. Use switches when dealing with enums for maintainability instead of scattered ifs. Before implementing utility behavior, check LoaderUtils and the other existing canvaskit helpers for an appropriate method. Use helpers such as LoaderUtils.empty, LoaderUtils.nonemptyString, LoaderUtils.first, and the type, array, object, and parsing helpers instead of reimplementing them.
We dont raw dog options into checks or usages if we have resonable defaults. we always alias if we have a default (const variable, comma separated) and use ?? for the default. This pattern is in hundreds of places in the code. Object options should be guarded with `options = ObjectUtil.guaranteeObject(options);` before their properties are read. When an options object has several defaults, use `ObjectUtil.setValuesWithDefaults` instead of setting each default manually. Default maps used by member functions should be underscored private members immediately above the function that consumes them; dynamic per-call defaults stay local. Dont use != or == null checks when we know that the thing is either null or undefined specifically, and can use a strict check for one of them, only use it for general checks that include both. Dont check === undefined use typeof. Lose == null checks arent BANNED theyre just not to be overused when we have a stricter check that expresses the same condition in that case. When we can check typeof === "undefined" or === null and have the same end result as a == null check, prefer the stricter check. Same thing for === null || === undefined checks, use == null there or its != variant. === "" or !== "" checks are illegal, we use LoaderUtils.empty. length === 0 or !== 0 > 0 < 1 etc checks are illegal, we use LoaderUtils.empty. When writing the code, look at code that is a possible candidate to use instead of [0] we use LoaderUtils.first:
we only access [0], no [1] or [2] access nearby
its a single [0] access not 2 in a row
its in places where we clearly only mean the first element. we follow this rule

When a relevant test or check exists, cover important edge cases and run the smallest localized check that exercises the changed code. Avoid broad test runs unless the change warrants them.
Hard coding and ad hoc patches are strictly prohibited. We try to maintain a purposeful architecture, we don't just slap code where its convenient. We don't duplicate code. We don't slap stateless functions that really carry state. We try to design a purposeful, logical architecture. This is not a dumping ground, you need to respect the code and write any patches properly.
You are banned from using any git commands that might desturctively affect staged or unstaged changes.
Use classes and utility objects where they improve compartmentalization and code cleanliness. Never mix domain-specific logic with abstract, general logic. Avoid reimplementing large areas of code for a specific implementation. Prefer layering domain-specific logic on top of generalized abstractions instead of creating disparate implementations of the same logic or helpers. The single-file loader may contain multiple classes and utility objects when that structure is required by its deployment format.

VERY IMPORTANT INSTRUCTIONS:
Don't test after every little change. Only test after a major change set. Understood?
