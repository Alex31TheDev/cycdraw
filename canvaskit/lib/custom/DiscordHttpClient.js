"use strict";

class ClientError extends CustomError {}
class DiscordRequestError extends CustomError {}

const discordDefaults = Object.freeze({
    api: "https://discord.com/api/v9",
    cdn: "https://cdn.discordapp.com"
});

const DiscordConstants = Object.freeze({
    allowedExtensions: ["webp", "png", "jpg", "jpeg", "gif"],
    allowedSizes: [16, 32, 64, 128, 256, 512, 1024, 2048, 4096],
    signatureParams: ["ex", "is", "hm"],
    retainedParams: ["ex", "is", "hm", "format", "animated"],
    defaultProtocol: "https:"
});

const DiscordUtil = Object.freeze({
    attachUrlRegex:
        /(?:(?<protocol>https?:)\/\/)?(?<domain>(?<subdomain>cdn|media)\.discordapp\.(?<tld>com|net))\/attachments\/(?<serverId>\d+)\/(?<channelId>\d+)\/(?<file>[^/?#\s]+)(?<search>\?[^#\s]*)?/iu,
    attachUrlStrictRegex:
        /^(?:(?<protocol>https?:)\/\/)?(?<domain>(?<subdomain>cdn|media)\.discordapp\.(?<tld>com|net))\/attachments\/(?<serverId>\d+)\/(?<channelId>\d+)\/(?<file>[^/?#\s]+)(?<search>\?[^#\s]*)?$/iu,

    isAttachmentUrl: url => {
        if (!LoaderUtils.nonemptyString(url)) {
            return false;
        }

        return DiscordUtil.attachUrlStrictRegex.test(url);
    },

    parseQueryParams: search => {
        if (!LoaderUtils.nonemptyString(search)) {
            return {};
        }

        const queryStr = search.startsWith("?") ? search.slice(1) : search,
            params = {};

        for (const pair of queryStr.split("&")) {
            if (LoaderUtils.empty(pair)) continue;

            const idx = pair.indexOf("="),
                key = idx !== -1 ? pair.slice(0, idx) : pair,
                val = idx !== -1 ? pair.slice(idx + 1) : "";

            params[decodeURIComponent(key)] = decodeURIComponent(val);
        }

        return params;
    },

    parseAttachmentUrl: url => {
        if (!LoaderUtils.nonemptyString(url)) {
            return null;
        }

        const match = url.match(DiscordUtil.attachUrlStrictRegex);
        if (!match) {
            return null;
        }

        const { domain, subdomain, tld, serverId, channelId, file, search } = match.groups,
            protocol = match.groups.protocol ?? DiscordConstants.defaultProtocol;

        const lastDot = file.lastIndexOf("."),
            filename = lastDot !== -1 ? file.slice(0, lastDot) : file,
            ext = lastDot !== -1 ? file.slice(lastDot).toLowerCase() : "";

        const params = DiscordUtil.parseQueryParams(search),
            prefix = `${protocol}//${domain}/attachments/${serverId}/${channelId}/${file}`;

        return {
            prefix,
            protocol,
            domain,
            subdomain,
            tld,

            serverId,
            channelId,

            filename,
            ext,
            file,

            search: search ?? "",
            params,
            ex: params.ex,
            is: params.is,
            hm: params.hm
        };
    },

    stripAttachmentUrl: (url, options = {}) => {
        options = LoaderUtils.guaranteeObject(options);

        const info = DiscordUtil.parseAttachmentUrl(url);
        if (!info) {
            return url;
        }

        const retainKeys = options.retainKeys ?? DiscordConstants.retainedParams,
            params = {};

        for (const key of retainKeys) {
            if (typeof info.params[key] !== "undefined" && !LoaderUtils.empty(info.params[key])) {
                params[key] = info.params[key];
            }
        }

        const queryString = HttpUtil.getQueryString(params);
        return `${info.protocol}//${info.domain}/attachments/${info.serverId}/${info.channelId}/${info.file}${queryString}`;
    },

    normalizeAttachmentUrl: (url, options = {}) => {
        options = LoaderUtils.guaranteeObject(options);

        const info = DiscordUtil.parseAttachmentUrl(url);
        if (!info) {
            return url;
        }

        let ext = info.ext,
            filename = info.filename;

        const params = { ...info.params },
            isGif = ext === ".gif" || params.animated === "true" || params.format === "gif";

        if (isGif) {
            if (params.format === "webp") {
                params.format = "gif";
            }

            if (LoaderUtils.empty(ext)) {
                ext = ".gif";
            }
        }

        const domain = options.domain ?? info.domain,
            protocol =
                options.protocol ?? (info.protocol ? `${info.protocol}//` : `${DiscordConstants.defaultProtocol}//`),
            normProtocol = protocol.endsWith("//") ? protocol : `${protocol}//`;

        const retainKeys = options.retainKeys ?? DiscordConstants.retainedParams,
            cleanParams = {};

        for (const key of retainKeys) {
            if (typeof params[key] !== "undefined" && !LoaderUtils.empty(params[key])) {
                cleanParams[key] = params[key];
            }
        }

        const file = filename + ext,
            queryString = HttpUtil.getQueryString(cleanParams);

        return `${normProtocol}${domain}/attachments/${info.serverId}/${info.channelId}/${file}${queryString}`;
    },

    getImageOpts: options => {
        options = LoaderUtils.guaranteeObject(options);

        let rawExt = options.ext ?? DiscordConstants.allowedExtensions[1],
            rawSize = options.size ?? DiscordConstants.allowedSizes[3];

        if (typeof rawSize === "string") {
            const parsed = LoaderUtils.parseInt(rawSize);
            if (!Number.isNaN(parsed)) rawSize = parsed;
        }

        const ext = LoaderUtils.normalizeEnum(rawExt, DiscordConstants.allowedExtensions, "extension", ClientError, {
            normalize: value => String(value).replace(/^\./, "").toLowerCase()
        });

        const size = String(LoaderUtils.normalizeEnum(rawSize, DiscordConstants.allowedSizes, "size", ClientError));
        return { size, ext };
    }
});

const DiscordEndpoints = Object.freeze({});

class DiscordHttpClient {
    static Constants = DiscordConstants;
    static Endpoints = DiscordEndpoints;
    static Util = DiscordUtil;

    static isAttachmentUrl(url) {
        return DiscordUtil.isAttachmentUrl(url);
    }

    static parseAttachmentUrl(url) {
        return DiscordUtil.parseAttachmentUrl(url);
    }

    static stripAttachmentUrl(url, options) {
        return DiscordUtil.stripAttachmentUrl(url, options);
    }

    static normalizeAttachmentUrl(url, options) {
        return DiscordUtil.normalizeAttachmentUrl(url, options);
    }

    constructor(config = {}) {
        config = LoaderUtils.guaranteeObject(config);

        this.config = config;

        this.token = config.token;
        this.bot = config.bot ?? false;

        if (!LoaderUtils.nonemptyString(this.token)) {
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
        const status = HttpUtil.getHttpErrStatus(err);

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
        const query = HttpUtil.getQueryString({ size });

        return this.cdnGet(`${route}.${ext}${query}`);
    }
}

module.exports = DiscordHttpClient;
