if (util.env) {
    eval(util.fetchTag("canvaskitloader").body);
} else {
    util.executeTag("canvaskitloader");
}

const MAX_MS = util.timeLimit ?? 5000;

const ELAPSED_MS = Benchmark.data["load_total"],
    ELAPSED_S = Math.round(ELAPSED_MS / 100) / 10,
    REMAINING_S = Math.floor((MAX_MS - ELAPSED_MS) / 1000);

const PERC = (ELAPSED_MS / MAX_MS) * 100,
    ROUNDED_PERC = Math.round(PERC * 10) / 10;

const all = tag.args === "all";

if (all) {
    Benchmark.getAll();
} else {
    `Load time: ${ELAPSED_S}s (${ROUNDED_PERC}%)
Remaining: ${REMAINING_S}s`;
}
