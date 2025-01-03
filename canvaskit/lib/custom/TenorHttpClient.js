"use strict";

class ClientError extends CustomError {}

const tenorDefaults = {
    api: "https://tenor.googleapis.com/v2",

    limit: 10
};

const TenorConstants = {
    media_filter: {
        gif: ["gif", "mediumgif", "tinygif"],
        mp4: ["mp4", "loopedmp4", "tinymp4", "nanomp4"],
        webm: ["webm", "tinywebm", "nanowebm"]
    },
    contentfilter: ["off", "low", "medium", "high"]
};

const TenorUtil = {
    getGifOpts: options => {
        const media_filter = options.type ?? TenorConstants.media_filter.gif[0],
            contentfilter = options.filter ?? TenorConstants.contentfilter[0];

        if (!Object.values(TenorConstants.media_filter).some(arr => arr.includes(media_filter))) {
            throw new ClientError("Invalid gif type provided: " + media_filter);
        }

        if (!TenorConstants.contentfilter.includes(contentfilter)) {
            throw new ClientError("Invalid content filter level provided: " + contentfilter);
        }

        return { media_filter, contentfilter };
    }
};

const TenorEndpoints = {
    posts: (options = {}) => {
        const { media_filter, contentfilter } = TenorUtil.getGifOpts(options),
            limit = options.limit ?? tenorDefaults.limit;

        const idSearch = typeof options.ids !== "undefined",
            textSearch = typeof options.search !== "undefined";

        const params = { media_filter, contentfilter, limit };

        if (idSearch) {
            params.ids = options.ids.join(",");
        } else if (textSearch) {
            params.q = options.search;
        } else {
            throw new ClientError("No search type provided");
        }

        return HttpUtil.joinUrl("posts", HttpUtil.getQueryString(params));
    }
};

class TenorHttpClient {
    static Constants = TenorConstants;
    static Endpoints = TenorEndpoints;

    constructor(config = {}) {
        this.config = config;

        this.key = config.key;
        this.client_key = config.client_key;

        if (typeof this.key === "undefined") {
            throw new ClientError("No API key was provided");
        }

        this.api = config.api ?? tenorDefaults.api;

        this.logger = typeof config.logger === "undefined" ? console : config.logger;
        this.verbose = config.verbose ?? false;

        this.params = this.getParams();
    }

    getParams() {
        const key = {
            key: this.key,
            client_key: this.client_key
        };

        const params = { key };

        return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, HttpUtil.getQueryString(value)]));
    }

    reqBase(options) {
        try {
            const url = options.url,
                returnType = options.returnType ?? FileDataTypes.json;

            delete options.url;
            delete options.returnType;

            return ModuleLoader.getModuleCodeFromUrl(url, returnType, {
                cache: false,

                requestOptions: options,
                parseError: false,
                returnResponse: true
            });
        } catch (err) {
            return this.handleError(err);
        }
    }

    handleError(err) {
        throw err;
    }

    apiMethod(route, method, options = {}) {
        const reqUrl = HttpUtil.joinUrl(this.api, route);

        if (this.verbose) {
            this.logger?.log(`${LoaderUtils.capitalize(method)} request: ${reqUrl}`);

            Benchmark.startTiming("tenor_req");
        }

        const res = this.reqBase({
            url: reqUrl,
            method,
            ...options
        });

        if (this.verbose) {
            const ms = Benchmark.stopTiming("tenor_req", false);

            this.logger?.log(`${LoaderUtils.capitalize(method)} request: ${reqUrl} returned\nStatus: ${res.status}`);
            this.logger?.log("Response:", res.data);
            this.logger?.log(`${LoaderUtils.capitalize(method)} took: ${ms}ms`);
        }

        return res.data;
    }

    apiGet(route) {
        route = HttpUtil.joinUrl(route, this.params.key);
        return this.apiMethod(route, "get");
    }

    getPosts(options) {
        const route = TenorEndpoints.posts(options),
            { results } = this.apiGet(route);

        if (results.length < 1) {
            throw new ClientError("No results found");
        }

        return results;
    }

    getGifUrl(id, media_filter) {
        const options = {
            ids: [id],
            media_filter,
            limit: 1
        };

        const result = this.getPosts(options)[0],
            gif = result.media_formats[Object.keys(result.media_formats)[0]];

        return gif.url;
    }
}

module.exports = TenorHttpClient;
