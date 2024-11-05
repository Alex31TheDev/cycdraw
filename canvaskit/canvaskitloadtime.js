util.executeTag("canvaskitloader");

const MAX_MS = 5000;

const ELAPSED_MS = Benchmark.data["load_total"],
    ELAPSED_S = Math.round(ELAPSED_MS / 100) / 10,
    REMAINING_S = Math.floor((MAX_MS - ELAPSED_MS) / 1000);

const PERC = (ELAPSED_MS / MAX_MS) * 100,
    ROUNDED_PERC = Math.round(PERC * 10) / 10;

const all = tag.args === "all";

all
    ? Benchmark.getAll()
    : `Load time: ${ELAPSED_S}s (${ROUNDED_PERC}%)
Remaining: ${REMAINING_S}s`;
