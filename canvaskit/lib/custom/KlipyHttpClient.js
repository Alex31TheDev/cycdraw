"use strict";

class ClientError extends CustomError {}
class KlipyRequestError extends CustomError {}

const klipyDefaults = Object.freeze({
    api: "https://api.klipy.com/api/v1",
    limit: 10
});

const KlipyConstants = Object.freeze({
    sizes: ["hd", "md", "sm", "xs"],
    formats: ["gif", "webp", "mp4", "webm", "jpg", "png"],
    content_filter: ["off", "low", "medium", "high"]
});

const KlipyUtil = Object.freeze({
    getGifOpts: options => {
        options = LoaderUtils.guaranteeObject(options);

        const rawSize = options.size ?? options.type ?? LoaderUtils.first(KlipyConstants.sizes),
            rawFormat = options.format ?? LoaderUtils.first(KlipyConstants.formats),
            rawFilter = options.filter ?? options.content_filter ?? LoaderUtils.first(KlipyConstants.content_filter);

        const size = LoaderUtils.normalizeEnum(rawSize, KlipyConstants.sizes, "size", ClientError),
            format = LoaderUtils.normalizeEnum(rawFormat, KlipyConstants.formats, "format", ClientError),
            content_filter = LoaderUtils.normalizeEnum(
                rawFilter,
                KlipyConstants.content_filter,
                "content filter level",
                ClientError
            );

        return { size, format, content_filter };
    }
});

const KlipyEndpoints = Object.freeze({
    items: (items, options = {}) => {
        options = LoaderUtils.guaranteeObject(options);
        const { content_filter } = KlipyUtil.getGifOpts(options);

        items = LoaderUtils.guaranteeArray(items);

        if (LoaderUtils.empty(items)) {
            throw new ClientError("No items provided");
        }

        const isIds = typeof options.ids !== "undefined" || items.every(item => /^\d+$/.test(String(item))),
            key = isIds ? "ids" : "slugs";

        const params = {
            [key]: items.join(","),
            content_filter
        };

        if (typeof options.locale !== "undefined") {
            params.locale = options.locale;
        }

        return HttpUtil.joinUrl("gifs/items", HttpUtil.getQueryString(params));
    },

    search: (query, options = {}) => {
        options = LoaderUtils.guaranteeObject(options);

        const { content_filter } = KlipyUtil.getGifOpts(options),
            per_page = options.limit ?? options.per_page ?? klipyDefaults.limit;

        if (!LoaderUtils.nonemptyString(query)) {
            throw new ClientError("No search query provided");
        }

        const params = {
            q: query,
            per_page,
            content_filter
        };

        if (typeof options.page !== "undefined") {
            params.page = options.page;
        }

        if (typeof options.locale !== "undefined") {
            params.locale = options.locale;
        }

        if (typeof options.customer_id !== "undefined") {
            params.customer_id = options.customer_id;
        }

        return HttpUtil.joinUrl("gifs/search", HttpUtil.getQueryString(params));
    },

    trending: (options = {}) => {
        options = LoaderUtils.guaranteeObject(options);

        const { content_filter } = KlipyUtil.getGifOpts(options),
            per_page = options.limit ?? options.per_page ?? klipyDefaults.limit;

        const params = {
            per_page,
            content_filter
        };

        if (typeof options.page !== "undefined") {
            params.page = options.page;
        }

        if (typeof options.locale !== "undefined") {
            params.locale = options.locale;
        }

        return HttpUtil.joinUrl("gifs/trending", HttpUtil.getQueryString(params));
    },

    gifs: (options = {}) => {
        options = LoaderUtils.guaranteeObject(options);

        const slugSearch = typeof options.slugs !== "undefined" || typeof options.ids !== "undefined",
            textSearch = typeof options.search !== "undefined" || typeof options.q !== "undefined";

        if (slugSearch) {
            const items = options.slugs ?? options.ids;
            return KlipyEndpoints.items(items, options);
        } else if (textSearch) {
            const query = options.search ?? options.q;
            return KlipyEndpoints.search(query, options);
        } else if (options.trending === true) {
            return KlipyEndpoints.trending(options);
        } else {
            throw new ClientError("No search type provided");
        }
    }
});

class KlipyHttpClient {
    static Constants = KlipyConstants;
    static Endpoints = KlipyEndpoints;

    constructor(config = {}) {
        config = LoaderUtils.guaranteeObject(config);

        this.config = config;

        this.key = config.key;

        if (!LoaderUtils.nonemptyString(this.key)) {
            throw new ClientError("No API key was provided");
        }

        this.api = config.api ?? klipyDefaults.api;
        this.baseApi = HttpUtil.joinUrl(this.api, this.key);

        this.logger = typeof config.logger === "undefined" ? console : config.logger;
        this.verbose = config.verbose ?? false;
    }

    reqBase(options) {
        try {
            const url = options.url,
                returnType = options.returnType ?? FileDataTypes.json;

            delete options.url;
            delete options.returnType;

            const res = ModuleLoader._fetchFromUrl(url, returnType, {
                requestOptions: options,
                parseError: false,
                returnResponse: true
            });

            res.data = ModuleLoader._parseModuleCode(res.data, returnType);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    handleError(err) {
        let status = HttpUtil.getHttpErrStatus(err);

        if (status == null || status === -1) {
            status = err.status ?? err.response?.status ?? err.code;
        }

        switch (status) {
            case 401:
            case 403:
                throw new KlipyRequestError("Provided API key was rejected");
            case 404:
                throw new KlipyRequestError("Invalid endpoint or parameters");
            case 429:
                throw new KlipyRequestError("Rate limited");
        }

        throw err;
    }

    apiMethod(route, method, options = {}) {
        const reqUrl = HttpUtil.joinUrl(this.baseApi, route);

        if (this.verbose) {
            this.logger?.log(`${LoaderUtils.capitalize(method)} request: ${reqUrl}`);

            Benchmark.startTiming("klipy_req");
        }

        const res = this.reqBase({
            url: reqUrl,
            method,
            ...options
        });

        if (this.verbose) {
            const ms = Benchmark.stopTiming("klipy_req", false);

            this.logger?.log(`${LoaderUtils.capitalize(method)} request: ${reqUrl} returned\nStatus: ${res.status}`);
            this.logger?.log("Response:", res.data);
            this.logger?.log(`${LoaderUtils.capitalize(method)} took: ${ms}ms`);
        }

        return res.data;
    }

    apiGet(route, options) {
        return this.apiMethod(route, "get", options);
    }

    getGifs(options) {
        const route = KlipyEndpoints.gifs(options),
            res = this.apiGet(route);

        const items = res.data?.data ?? res.data ?? res.results ?? [];

        if (LoaderUtils.empty(items)) {
            throw new ClientError("No results found");
        }

        return items;
    }

    getGifUrl(slug, options = {}) {
        if (typeof options === "string") {
            options = { size: options };
        }

        const idMatch = String(slug).match(/-(\d+)$/),
            isNumeric = /^\d+$/.test(String(slug));

        const opts = {
            limit: 1,
            ...options
        };

        if (isNumeric) {
            opts.ids = [slug];
        } else if (idMatch) {
            opts.ids = [idMatch[1]];
        } else {
            opts.slugs = [slug];
        }

        let items;

        try {
            items = this.getGifs(opts);
        } catch (err) {
            if (idMatch) {
                const baseSlug = String(slug).slice(0, idMatch.index);
                opts.slugs = [baseSlug];
                delete opts.ids;

                items = this.getGifs(opts);
            } else {
                throw err;
            }
        }

        const result = LoaderUtils.first(items),
            size = opts.size ?? "hd",
            format = opts.format ?? "gif";

        const sizeObj =
            result.file?.[size] ??
            result.file?.hd ??
            result.file?.md ??
            result.file?.sm ??
            result.file?.xs ??
            result.file;

        const fileObj =
            sizeObj?.[format] ??
            sizeObj?.gif ??
            (LoaderUtils.isObject(sizeObj) ? LoaderUtils.first(Object.values(sizeObj)) : null);

        const url = fileObj?.url ?? result.url;

        if (!LoaderUtils.nonemptyString(url)) {
            throw new ClientError("No GIF URL found in result", result);
        }

        return url;
    }
}

module.exports = KlipyHttpClient;
