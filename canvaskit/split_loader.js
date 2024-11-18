// source code: https://github.com/Alex31TheDev/cycdraw/blob/main/canvaskit/canvaskitloader.js

const tags = ["ck_loader_1", "ck_loader_2", "ck_loader_3"],
    slice = body => body.slice(6, -4);

const code = tags
    .map(name => util.fetchTag(name).body)
    .map(slice)
    .join("");

eval(code);
