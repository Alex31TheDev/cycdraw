"use strict";

class ClientError extends CustomError {}
class DiscordRequestError extends CustomError {}

const discordDefaults = Object.freeze({
    api: "https://discord.com/api/v9",
    cdn: "https://cdn.discordapp.com"
});

const DiscordConstants = Object.freeze({
    allowedExtensions: ["webp", "png", "jpg", "jpeg", "gif"],
    allowedSizes: [16, 32, 64, 128, 256, 512, 1024, 2048, 4096]
});

const DiscordUtil = Object.freeze({
    getImageOpts: options => {
        let ext = options.ext ?? DiscordConstants.allowedExtensions[1],
            size = options.size ?? DiscordConstants.allowedSizes[3];

        if (!DiscordConstants.allowedExtensions.includes(ext)) {
            throw new ClientError("Invalid extension provided: " + ext);
        }

        if (typeof size === "string") {
            size = LoaderUtils.parseInt(size);

            if (Number.isNaN(size)) {
                throw new ClientError("Invalid size provided: " + size);
            }
        }

        if (!DiscordConstants.allowedSizes.includes(size)) {
            throw new ClientError("Invalid size provided: " + size);
        }

        size = size.toString(10);
        return { size, ext };
    }
});

const DiscordEndpoints = Object.freeze({});

class DiscordHttpClient {
    static Constants = DiscordConstants;
    static Endpoints = DiscordEndpoints;

    constructor(config = {}) {
        this.config = config;

        this.token = config.token;
        this.bot = config.bot ?? false;

        if (typeof this.token === "undefined") {
            throw new ClientError("No token was provided");
        }

        this.api = config.api ?? discordDefaults.api;
        this.cdn = config.cdn ?? discordDefaults.cdn;

        this.logger = typeof config.logger === "undefined" ? console : config.logger;
        this.verbose = config.verbose ?? false;

        this.headers = this.getHeaders();
    }

    getHeaders() {
        const token = (this.bot ? "Bot " : "") + this.token;

        const auth = {
            authorization: token
        };

        const get = {};

        const post = {};

        return { auth, get, post };
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
        const status = LoaderUtils.getReqErrStatus(err);

        switch (status) {
            case 401:
                throw new DiscordRequestError("Provided token was rejected");
            case 404:
                throw new DiscordRequestError("Invalid endpoint or parameters");
            case 429:
                throw new DiscordRequestError("Rate limited");
        }

        throw err;
    }

    apiMethod(route, method, options = {}) {
        const reqUrl = HttpUtil.joinUrl(this.api, route);

        if (this.verbose) {
            this.logger?.log(`${LoaderUtils.capitalize(method)} request: ${reqUrl}`);
        }

        let headers;

        switch (method) {
            case "get":
                headers = {
                    ...this.headers.auth,
                    ...this.headers.get
                };

                break;
            case "post":
            case "put":
            case "patch":
                headers = {
                    ...this.headers.auth,
                    ...this.headers.post
                };

                break;
            default:
                headers = this.headers.auth;
                break;
        }

        if (this.verbose) {
            Benchmark.startTiming("discord_req");
        }

        const res = this.reqBase({
            url: reqUrl,
            method,
            headers,
            ...options
        });

        if (this.verbose) {
            const ms = Benchmark.stopTiming("discord_req", false);

            this.logger?.log(`${LoaderUtils.capitalize(method)} request: ${reqUrl} returned\nStatus: ${res.status}`);
            this.logger?.log("Response:", res.data);
            this.logger?.log(`${LoaderUtils.capitalize(method)} took: ${ms}ms`);
        }

        return res.data;
    }

    apiGet(route) {
        return this.apiMethod(route, "get");
    }

    apiPost(route, data) {
        return this.apiMethod(route, "post", {
            data
        });
    }

    cdnGet(route, options) {
        const reqUrl = HttpUtil.joinUrl(this.cdn, route);

        if (this.verbose) {
            this.logger?.log(`CDN get: ${reqUrl}`);
        }

        const t1 = Benchmark.getCurrentTime(),
            res = this.reqBase({
                url: reqUrl,
                method: "get",
                returnType: FileDataTypes.binary,
                ...options
            });

        if (this.verbose) {
            this.logger?.log(`CDN get: ${reqUrl} returned\nStatus: ${res.status}`);
            this.logger?.log(`Get took: ${Benchmark.getCurrentTime() - t1}ms`);
        }

        return res.data;
    }

    getAsset(route, options = {}) {
        const { size, ext } = DiscordUtil.getImageOpts(options);
        route = HttpUtil.joinUrl(`${route}.${ext}`, HttpUtil.getQueryString({ size }));

        return this.cdnGet(route);
    }
}

module.exports = DiscordHttpClient;
