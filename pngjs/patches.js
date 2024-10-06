setTimeout = f => {
    f();
    return 0;
};

setImmediate = f => {
    f();
    return 0;
};

clearTimeout = _ => {};
clearImmediate = _ => {};
