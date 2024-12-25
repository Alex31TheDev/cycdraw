// Source code: {{source_url}}

const tags = [{{tags}}],
    slice = body => body.slice(6, -4);

const code = tags
    .map(name => util.fetchTag(name).body)
    .map(slice)
    .join("");

eval(code);