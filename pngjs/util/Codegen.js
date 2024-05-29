const Codegen = {
    indentation: 4,

    getSpacing: _ => {
        return " ".repeat(Codegen.indentation);
    },

    indent: (code, times = 1) => {
        const spaces = Codegen.getSpacing();
        code = code.trim();

        let lines = code.split("\n");
        lines = lines.map(line => spaces.repeat(times) + line);

        return lines.join("\n");
    },

    statement: code => {
        if (typeof code === "undefined" || code.length < 1) {
            return ";";
        }

        code = code.trim();
        const replaced = code.replace(/\s|\n/g, "");

        if (/[\s\S]+[\w\d$_)\]]$/.test(replaced)) {
            return code + ";";
        }

        return code;
    },

    declaration: (name, value, isConst = false) => {
        const type = isConst ? "const" : "let";

        name = name.trim();
        value = value.toString().trim();

        if (value === null || typeof value === "undefined") {
            return Codegen.statement(`${type} ${name}`);
        }

        return Codegen.statement(`${type} ${name} = ${value}`);
    },

    return: value => {
        const name = "return";

        if (typeof value === "undefined" || value.length < 1) {
            return Codegen.statement(name);
        }

        if (Array.isArray(value)) {
            const values = value.map(x => x.trim()).join(", ");
            return Codegen.statement(`${name} [${values}]`);
        }

        value = value.toString().trim();
        return Codegen.statement(`${name} ${value}`);
    },

    tryCatch: (tryBody, catchBody, errName = "err") => {
        errName = errName.trim();

        const tryHeader = "try {\n",
            catchHeader = `catch (${errName}) {\n`,
            footer = "\n}";

        tryBody = Codegen.indent(Codegen.statement(tryBody));
        catchBody = Codegen.indent(Codegen.statement(catchBody));

        const tryBlock = tryHeader + tryBody + footer,
            catchBlock = catchHeader + catchBody + footer;

        return `${tryBlock} ${catchBlock}`;
    },

    closure: body => {
        const header = "(function() {\n",
            footer = Codegen.statement("})()");

        body = Codegen.indent(Codegen.statement(body));
        return header + body + "\n" + footer;
    },

    wrapCode: code => {
        const inputName = "img",
            outName = "output";

        const execCode = Codegen.closure(Codegen.tryCatch(code, Codegen.return("err"))),
            returnCode = Codegen.return([inputName, outName]);

        const wrapped = Codegen.declaration(outName, execCode) + "\n\n" + returnCode;
        return Codegen.indent(wrapped);
    }
};

module.exports = Codegen;
