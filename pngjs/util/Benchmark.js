const CustomError = require("../errors/CustomError.js");

const Benchmark = {
    data: Object.create(null),
    timepoints: new Map(),

    useVmTime: typeof vm !== "undefined",
    ns_per_ms: 10n ** 6n,

    getCurrentTime: _ => {
        return Benchmark.useVmTime ? vm.getWallTime() : Date.now();
    },

    startTiming: key => {
        key = Benchmark._formatKey(key);

        const t1 = Benchmark.getCurrentTime();
        Benchmark.timepoints.set(key, t1);
    },

    stopTiming: key => {
        key = Benchmark._formatKey(key);
        const t1 = Benchmark.timepoints.get(key);

        if (typeof t1 === "undefined") {
            return;
        }

        Benchmark.timepoints.delete(key);

        let t2 = Benchmark.getCurrentTime(),
            dt;

        if (Benchmark.useVmTime) {
            dt = Number((t2 - t1) / Benchmark.ns_per_ms);
        } else {
            dt = t2 - t1;
        }

        Benchmark.data[key] = dt;
    },

    getTime: key => {
        key = Benchmark._formatKey(key);
        const time = Benchmark.data[key];

        if (typeof time === "undefined") {
            return "Key not found";
        }

        return Benchmark._formatTime(key, time);
    },

    deleteTime: key => {
        key = Benchmark._formatKey(key);
        Benchmark.timepoints.delete(key);

        if (key in Benchmark.data) {
            delete Benchmark.data[key];
            return true;
        }

        return false;
    },

    clear: _ => {
        Benchmark.timepoints.clear();

        for (const key of Object.keys(Benchmark.data)) {
            delete Benchmark.data[key];
        }
    },

    clearExcept: (...keys) => {
        const clearKeys = Object.keys(Benchmark.data).filter(key => !keys.includes(key));

        for (const key of clearKeys) {
            delete Benchmark.data[key];
        }

        Benchmark.timepoints.clear();
    },

    clearExceptLast: (n = 1) => {
        const clearKeys = Object.keys(Benchmark.data).slice(0, -n);

        for (const key of clearKeys) {
            delete Benchmark.data[key];
        }

        Benchmark.timepoints.clear();
    },

    getSum: (...keys) => {
        let sumTimes;

        if (keys.length > 0) {
            sumTimes = keys.map(key => Benchmark.data[key]).filter(time => typeof time !== "undefined");
        } else {
            sumTimes = Object.values(Benchmark.data);
        }

        return sumTimes.reduce((a, b) => a + b, 0);
    },

    getAll: (...includeSum) => {
        const times = Object.keys(Benchmark.data).map(key => Benchmark.getTime(key));

        if (includeSum[0]) {
            const keys = includeSum[0] === true ? [] : includeSum,
                sum = Benchmark.getSum(...keys);

            times.push(Benchmark._formatTime("sum", sum));
        }

        return times.join(",\n");
    },

    getTable: (style = "doubleVertical", extraSpaces = 1) => {
        const keys = Object.keys(Benchmark.data),
            times = Object.values(Benchmark.data);

        const columns = {
                name: "Name:",
                time: "Time (ms):"
            },
            rows = {
                name: keys,
                time: times
            };

        return Table.drawTable(columns, rows, style, extraSpaces);
    },

    _formatTime: (key, time) => {
        return `${key}: ${time.toLocaleString()}ms`;
    },

    _formatKey: key => {
        switch (typeof key) {
            case "number":
                return key.toString();
            case "string":
                return key;
            default:
                throw new CustomError("Time keys must be strings");
        }
    }
};

module.exports = Benchmark;
