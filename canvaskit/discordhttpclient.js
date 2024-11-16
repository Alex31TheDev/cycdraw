"use strict";

class ClientError extends CustomError {}
class DiscordRequestError extends CustomError {}

const discordDefaults = {
    api: "https://discord.com/api/v9",
    cdn: "https://cdn.discordapp.com"
};

const DiscordConstants = {
    allowedExtensions: ["webp", "png", "jpg", "jpeg", "gif"],
    allowedSizes: [16, 32, 64, 128, 256, 512, 1024, 2048, 4096]
};

const DiscordUtil = {
    getImageOpts: options => {
        let ext = options.ext ?? DiscordConstants.allowedExtensions[1],
            size = options.size ?? DiscordConstants.allowedSizes[3];

        if (!DiscordConstants.allowedExtensions.includes(ext)) {
            throw new ClientError("Invalid extension provided: " + ext);
        }

        if (typeof size === "string") {
            size = parseInt(size, 10);

            if (isNaN(size)) {
                throw new ClientError("Invalid size provided: " + size);
            }
        }

        if (!DiscordConstants.allowedSizes.includes(size)) {
            throw new ClientError("Invalid size provided: " + size);
        }

        size = size.toString(10);
        return { size, ext };
    }
};

class DiscordHttpClient {
    static DiscordConstants = DiscordConstants;

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
        let reqFunc;

        function req(tries) {
            try {
                const { url, returnType } = options;
                delete options.url;
                delete options.returnType;

                return ModuleLoader._fetchFromUrl(url, returnType, {
                    requestOptions: options,
                    parseError: false,
                    returnResponse: true
                });
            } catch (err) {
                return this.handleError(err, tries, reqFunc);
            }
        }

        reqFunc = req.bind(this);
        return reqFunc(0);
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
        const reqUrl = LoaderUtils.HttpUtil.joinUrl(this.api, route);

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

        const t1 = Date.now(),
            res = this.reqBase({
                url: reqUrl,
                method,
                headers,
                ...options
            });

        if (this.verbose) {
            this.logger?.log(
                `${LoaderUtils.capitalize(method)} request: ${reqUrl} returned\nStatus: ${res.status}\nResponse: `
            );
            this.logger?.log(res.data);
            this.logger?.log(`${LoaderUtils.capitalize(method)} took: ${Date.now() - t1}ms`);
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
        const reqUrl = LoaderUtils.HttpUtil.joinUrl(this.cdn, route);

        if (this.verbose) {
            this.logger?.log(`CDN get: ${reqUrl}`);
        }

        const t1 = Date.now(),
            res = this.reqBase({
                url: reqUrl,
                method: "get",
                returnType: FileDataTypes.binary,
                ...options
            });

        if (this.verbose) {
            this.logger?.log(`CDN get: ${reqUrl} returned\nStatus: ${res.status}`);
            this.logger?.log(`Get took: ${Date.now() - t1}ms`);
        }

        return res.data;
    }

    getAsset(route, options = {}) {
        const { size, ext } = DiscordUtil.getImageOpts(options);
        route = LoaderUtils.HttpUtil.joinUrl(`${route}.${ext}`, LoaderUtils.HttpUtil.getQueryString({ size }));

        return this.cdnGet(route);
    }
}

module.exports = DiscordHttpClient;
