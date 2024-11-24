const Codegen = {
    indentation: 4,
    statementExp: /[\s\S]*[\w\d$_)\]]$/,

    getSpacing: _ => {
        return " ".repeat(Codegen.indentation);
    },

    indent: (code, times = 1) => {
        const spaces = Codegen.getSpacing().repeat(times);

        if (typeof code === "undefined" || code.length < 1) {
            return spaces;
        }

        code = code.trim();

        let lines = code.split("\n");
        lines = lines.map(line => spaces + line);

        return lines.join("\n");
    },

    statement: code => {
        if (typeof code === "undefined" || code.length < 1) {
            return ";";
        }

        code = code.trim();

        let replaced;
        const last_nl = code.lastIndexOf("\n");

        if (last_nl === -1) {
            replaced = code.replaceAll(" ", "");
        } else {
            replaced = code.slice(last_nl);
        }

        if (Codegen.statementExp.test(replaced)) {
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

    block: body => {
        const header = "{\n",
            footer = "\n}";

        body = Codegen.indent(Codegen.statement(body));
        return header + body + footer;
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

        const tryHeader = "try ",
            catchHeader = `catch (${errName}) `;

        const tryBlock = tryHeader + Codegen.block(tryBody),
            catchBlock = catchHeader + Codegen.block(catchBody);

        return `${tryBlock} ${catchBlock}`;
    },

    closure: body => {
        const header = "(function() ",
            footer = Codegen.statement(")()");

        const block = Codegen.block(body);
        return header + block + footer;
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
