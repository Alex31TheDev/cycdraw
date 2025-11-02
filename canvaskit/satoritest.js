"use strict";

util.loadLibrary = "lodepng";

if (util.env) {
    eval(util.fetchTag("canvaskitloader").body);
} else {
    util.executeTag("canvaskitloader");
}

// main
const main = (() => {})();

try {
    // run main
    main();
} catch (err) {
    // output
    if (err instanceof ExitError) err.message;
    else throw err;
}
