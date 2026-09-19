When writing code, make sure to respect the repo code style: reduce duplication (refactor out methods were necessary, dont force duplication of error throws), formatting (use prettier), declaration style (consts and lets are comma grouped where it makes sense semantically with different blocks for different functionalities, we put empty lines between different declaration blocks; prefer consts over lets), ordering:
classes also have an order
there are 2 sections. public and private
public always comes above private
in each section, static comes first, then instance functions
in the private section, functions are ordered in the order theyre used
and this
dont forget functions are C ordered. if we have \_c that uses \_a and \_b, \_a and \_b come above not below it. THEY SHOULD BE IMMEDIATELY NEARBY NOT FAR AWAY
and spacing: put newlines between logical blocks. Import odering is as follows:
node: prefixed node native libraries
newline
other external libraries
newline
the class/classes we depend on/inherit/compose with or are part of the core functionality, you may block this more if there are other logical orderings
newline
struct classes
newline
enum classes
newline
client imports
newline
util imports (NORMAL UTIL.JS ALWAYS COMES FIRST HERE)
newline
error imports
Avoid writing sloppy fragile logic when simpler logic makes more sense. Finally, if you're unsure of how to write something, look at files in the codebase and write it in the existing style. We do not ever cache objects unnecessarily. Make the code clean, streamlined and put empty lines between logical blocks in functions. no obfuscation. dont try to make the code obfuscated. Hard coding is prohibited, try to work things into a proper architecture. make it easy to read and clean.

Write abstract code but not overly abstract. Avoid writing very long and explicit variable names. Look at the style of variable names in the repo: short and descriptive. A prime example: Do not write "index" instead of "i" or stuff like that. Write "i" in loops and idx anywhere else. You can pick up on more of these examples by looking in the codebase.
Do not stick files together in inappropiate places. Look at the structure of the repo and put files in their proper places.
Do not write dead methods or variables that just alias short expressions. This is VERY important: do not try to keep compatibility or legacy code for any reason. We do not write legacy in this repo. When you need to change something in the API, change it as much as you need. Do not feel any restraint in breaking the api and refactoring callers. In fact, this is very encouraged. You should not keep old functions, variables or parameters if they become dead code or simple aliases. They should be instantly removed or refactored out if that happens. Again I repeat: do not maintain compatibility with the old API or write legacy code.
Enum classes should be frozen with object.freeze but do not freeze stuff past the first level. Object options should be guarded with options = ObjectUtil.guaranteeObject(options); We do not use generic error in this repo. Look at the existing error class usage for example UtilError in utils so on or make a new one if needed. Use switches when dealing with enums for maintainability instead of scattered ifs. When you want a functionality, check src/util for it first before going for a reimplementation (typetester, objectutil, arrayutil, discordutil, util.empty util.nonemptystring etc instead of raw checks, many other util methods instead of manual rewrites).
We dont raw dog options into checks or usages if we have resonable defaults. we always alias if we have a default (const variable, comma separated) and use ?? for the default. This pattern is in hundreds of places in the code. Dont use != or == null checks when we know that the thing is either null or undefined specifically, and can use a strict check for one of them, only use it for general checks that include both. Dont check === undefined use typeof. Lose == null checks arent BANNED theyre just not to be overused when we have a stricter check that expresses the same condition in that case. When we can check typeof === "undefined" or === null and have the same end result as a == null check, prefer the stricter check. Same thing for === null || === undefined checks, use == null there or its != variant. === "" or !== "" checks are illegal, we use util.empty. length === 0 or !== 0 > 0 < 1 etc checks are illegal, we use util.empty. When writing the code, look at code that is a possible candidate to use instead of [0] we use util.first:
we only access [0], no [1] or [2] access nearby
its a single [0] access not 2 in a row
its in places where we clearly only mean the first element. we follow this rule

Write tests for everything to cover as many edge cases as possible. Mock as little as possible, most of the logic should go through the full code path. Only do full test runs in extreme cases, because they take hours, otherwise only do localized test runs to test your work.
When altering config options, make sure to also update the schema.
Hard coding and ad hoc patches are strictly prohibited. We try to maintain a purposeful architecture, we don't just slap code where its convenient. We don't duplicate code. We don't slap stateless functions that really carry state. We try to design a purposeful, logical architecture. This is not a dumping ground, you need to respect the code and write any patches properly.
You are banned from using any git commands that might desturctively affect staged or unstaged changes.
The code should be heavily OOP using many classes for compartmentalization and code cleanliness. Never ever ever mix domain specific logic with abstract, general logic. Avoid reimplemeting large areas of code for a specific implementation. Always prefer layering domain specific logic on top of generalized abstract logic, instead of having many disperate domain specific implementations of the same logic or helpers.
No multiple classes in the same file unless they're truly tiny throwaway classes. Stop ad hoc fixes. if you do something, do it all the way. rewrite and rearchitect. ad hoc fixes will get you in real trouble now. I will reject all ad hoc fixes instantly, so better to just not write them.

VERY IMPORTANT INSTRUCTIONS:
Don't test after every little change. Only test after a major change set. Understood?

