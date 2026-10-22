/* Portable prepared geometry: JSON metadata plus aligned typed-array blocks. */
(function (root) {
    'use strict';
    const magic = 0x48534d50, version = 1;
    const types = { Float32Array, Uint32Array, Uint16Array, Uint8Array };
    function utf8(text) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text) : Buffer.from(text, 'utf8'); }
    function string(bytes) { return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : Buffer.from(bytes).toString('utf8'); }
    function encode(value) {
        const data = Object.assign({}, value.data), blocks = [];
        ['positions', 'normals', 'uvs'].forEach(key => { if (data[key]) data[key] = new Float32Array(data[key]); });
        if (data.indices) data.indices = new Uint32Array(data.indices);
        if (data.textures) data.textures = data.textures.map(texture => Object.assign({}, texture, { data: new Uint8Array(texture.data) }));
        const metadata = utf8(JSON.stringify(Object.assign({}, value, { data }), (_key, item) => {
            if (!ArrayBuffer.isView(item)) return item;
            const type = item.constructor.name;
            if (!Object.prototype.hasOwnProperty.call(types, type)) throw new Error('Unsupported prepared array: ' + type);
            const index = blocks.length; blocks.push(item);
            return { preparedArray: index, type, length: item.length };
        }));
        const align = size => Math.ceil(size / 4) * 4;
        const start = align(16 + metadata.length), length = blocks.reduce((size, block) => size + align(block.byteLength), start);
        const bytes = new Uint8Array(length), header = new DataView(bytes.buffer);
        header.setUint32(0, magic, true); header.setUint32(4, version, true);
        header.setUint32(8, metadata.length, true); header.setUint32(12, length, true);
        bytes.set(metadata, 16);
        let offset = start;
        blocks.forEach(block => { bytes.set(new Uint8Array(block.buffer, block.byteOffset, block.byteLength), offset); offset += align(block.byteLength); });
        return bytes;
    }
    function decode(input) {
        let bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        if (bytes.byteOffset % 4) bytes = bytes.slice();
        if (bytes.length < 16) throw new Error('Incomplete prepared model.');
        const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (header.getUint32(0, true) !== magic || header.getUint32(4, true) !== version || header.getUint32(12, true) !== bytes.length) throw new Error('Invalid prepared model version or size.');
        const metadataLength = header.getUint32(8, true);
        if (metadataLength > bytes.length - 16) throw new Error('Invalid prepared model metadata.');
        let offset = Math.ceil((16 + metadataLength) / 4) * 4, next = 0;
        const value = JSON.parse(string(bytes.subarray(16, 16 + metadataLength)), (_key, item) => {
            if (!item || typeof item !== 'object' || item.preparedArray === undefined) return item;
            const Type = Object.prototype.hasOwnProperty.call(types, item.type) && types[item.type];
            if (!Type || item.preparedArray !== next++ || !Number.isSafeInteger(item.length) || item.length < 0) throw new Error('Invalid prepared array.');
            const size = item.length * Type.BYTES_PER_ELEMENT;
            if (size > bytes.length - offset) throw new Error('Incomplete prepared array.');
            const array = new Type(bytes.buffer, bytes.byteOffset + offset, item.length); offset += Math.ceil(size / 4) * 4;
            return array;
        });
        if (offset !== bytes.length || !value.data || !value.data.positions || !value.data.indices || !Array.isArray(value.data.faces)) throw new Error('Invalid prepared geometry.');
        return value;
    }
    const api = { encode, decode, version };
    root.PreparedModel = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
