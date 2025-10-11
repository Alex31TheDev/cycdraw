"use strict";

class Base2nError extends CustomError {}

const Util = {
    allocStrBuf_: (Module, length) => {
        const strSize = (length + 1) * 2,
            ptr = Module._malloc(strSize);

        return ptr;
    },

    writeUtf16_: (heap, str, ptr) => {
        const ptr2 = ptr / 2,
            ptrmax = ptr2 + str.length;

        let i1 = ptr2,
            i2 = 0;

        for (; i1 < ptrmax; i1++, i2++) {
            heap[i1] = str.charCodeAt(i2);
        }
    }
};

class Base2nWasmDec {
    static #Decoder;

    static init(DecoderInit, wasm) {
        if (typeof this.#Decoder !== "undefined") {
            throw new Base2nError("Decoder is already loaded");
        }

        DecoderInit({
            wasmBinary: wasm
        })
            .then(dec => (this.#Decoder = dec))
            .catch(err => console.error(err));
    }

    static decodeBase2n(str, buf_size) {
        if (typeof this.#Decoder === "undefined") {
            throw new Base2nError("Can't decode, decoder isn't loaded");
        } else if (typeof buf_size === "undefined") {
            throw new Base2nError("No buffer size provided");
        }

        const in_ptr = Util.allocStrBuf_(this.#Decoder, str.length);
        Util.writeUtf16_(this.#Decoder.HEAPU16, str, in_ptr);

        const out_ptr = this.#Decoder._malloc(buf_size);

        try {
            const dec_len = this.#Decoder._decode(in_ptr, str.length, out_ptr, buf_size),
                decoded = this.#Decoder.HEAPU8.slice(out_ptr, out_ptr + dec_len);

            return decoded;
        } finally {
            this.#Decoder._free(out_ptr);
            this.#Decoder._free(in_ptr);
        }
    }
}

module.exports = Base2nWasmDec;
