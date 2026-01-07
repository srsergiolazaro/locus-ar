import * as msgpack from "@msgpack/msgpack";

export const CURRENT_VERSION = 7;

/**
 * Morton Order calculation for spatial sorting
 */
export function getMorton(x: number, y: number): number {
    let x_int = x | 0;
    let y_int = y | 0;

    x_int = (x_int | (x_int << 8)) & 0x00FF00FF;
    x_int = (x_int | (x_int << 4)) & 0x0F0F0F0F;
    x_int = (x_int | (x_int << 2)) & 0x33333333;
    x_int = (x_int | (x_int << 1)) & 0x55555555;

    y_int = (y_int | (y_int << 8)) & 0x00FF00FF;
    y_int = (y_int | (y_int << 4)) & 0x0F0F0F0F;
    y_int = (y_int | (y_int << 2)) & 0x33333333;
    y_int = (y_int | (y_int << 1)) & 0x55555555;

    return x_int | (y_int << 1);
}

/**
 * Packs 8-bit image data into 4-bit packed data
 */
export function pack4Bit(data: Uint8Array): Uint8Array {
    const length = data.length;
    if (length % 2 !== 0) return data;

    const packed = new Uint8Array(length / 2);
    for (let i = 0; i < length; i += 2) {
        const p1 = (data[i] & 0xF0) >> 4;
        const p2 = (data[i + 1] & 0xF0) >> 4;
        packed[i / 2] = (p1 << 4) | p2;
    }
    return packed;
}

/**
 * Unpacks 4-bit data back to 8-bit image data
 */
export function unpack4Bit(packed: Uint8Array, width: number, height: number): Uint8Array {
    const length = width * height;
    const data = new Uint8Array(length);

    for (let i = 0; i < packed.length; i++) {
        const byte = packed[i];
        const p1 = (byte & 0xF0);
        const p2 = (byte & 0x0F) << 4;

        data[i * 2] = p1;
        data[i * 2 + 1] = p2;
    }
    return data;
}

/**
 * Columnarizes point data for efficient storage and transfer
 */
export function columnarize(points: any[], tree: any, width: number, height: number) {
    const count = points.length;
    const x = new Uint16Array(count);
    const y = new Uint16Array(count);
    const angle = new Int16Array(count);
    const scale = new Uint8Array(count);
    const descriptors = new Uint32Array(count * 2);

    for (let i = 0; i < count; i++) {
        x[i] = Math.round((points[i].x / width) * 65535);
        y[i] = Math.round((points[i].y / height) * 65535);
        angle[i] = Math.round((points[i].angle / Math.PI) * 32767);
        scale[i] = Math.round(Math.log2(points[i].scale || 1));

        if (points[i].descriptors && points[i].descriptors.length >= 2) {
            descriptors[i * 2] = points[i].descriptors[0];
            descriptors[(i * 2) + 1] = points[i].descriptors[1];
        }
    }

    return {
        x,
        y,
        a: angle,
        s: scale,
        d: descriptors,
        t: compactTree(tree.rootNode),
    };
}

/**
 * Compacts hierarchical clustering tree into a minimal array structure
 */
export function compactTree(node: any): any {
    if (node.leaf) {
        return [1, node.centerPointIndex || 0, node.pointIndexes];
    }
    return [0, node.centerPointIndex || 0, node.children.map((c: any) => compactTree(c))];
}

/**
 * Expands a compacted tree back into an object structure
 */
export function expandTree(node: any): any {
    const isLeaf = node[0] === 1;
    if (isLeaf) {
        return {
            leaf: true,
            centerPointIndex: node[1],
            pointIndexes: node[2],
        };
    }
    return {
        leaf: false,
        centerPointIndex: node[1],
        children: node[2].map((c: any) => expandTree(c)),
    };
}

/**
 * Deserializes and normalizes .taar data from a buffer
 */
export function decodeTaar(buffer: ArrayBuffer | Uint8Array) {
    const content: any = msgpack.decode(new Uint8Array(buffer));
    const version = content.v || 0;

    // Support Protocol V5/V6/V7
    if (version < 5 || version > CURRENT_VERSION) {
        console.warn(`Potential incompatible .taar version: ${version}. Standard is ${CURRENT_VERSION}.`);
    }

    const dataList = content.dataList;
    for (let i = 0; i < dataList.length; i++) {
        const item = dataList[i];

        // 1. Process Tracking Data
        for (const td of item.trackingData) {
            // Helper to ensure we have the right TypedArray if it was decoded as Uint8Array by msgpack
            const normalizeBuffer = (arr: any, Type: any) => {
                if (arr instanceof Uint8Array && Type !== Uint8Array) {
                    return new Type(arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength));
                }
                return arr;
            };

            td.px = normalizeBuffer(td.px, Float32Array);
            td.py = normalizeBuffer(td.py, Float32Array);

            // Backwards compatibility for fields named 'd' vs 'data'
            const rawData = td.data || td.d;
            const w = td.width || td.w;
            const h = td.height || td.h;

            if (rawData && rawData.length === (w * h) / 2) {
                const unpacked = unpack4Bit(rawData, w, h);
                if (td.data) td.data = unpacked;
                if (td.d) td.d = unpacked;
            }
        }

        // 2. Process Matching Data
        for (const kf of item.matchingData) {
            for (const col of [kf.max, kf.min]) {
                if (!col) continue;

                let xRaw = col.x;
                let yRaw = col.y;

                if (xRaw instanceof Uint8Array) {
                    xRaw = new Uint16Array(xRaw.buffer.slice(xRaw.byteOffset, xRaw.byteOffset + xRaw.byteLength));
                }
                if (yRaw instanceof Uint8Array) {
                    yRaw = new Uint16Array(yRaw.buffer.slice(yRaw.byteOffset, yRaw.byteOffset + yRaw.byteLength));
                }

                const count = xRaw.length;
                const x = new Float32Array(count);
                const y = new Float32Array(count);
                for (let k = 0; k < count; k++) {
                    x[k] = (xRaw[k] / 65535) * kf.w;
                    y[k] = (yRaw[k] / 65535) * kf.h;
                }
                col.x = x;
                col.y = y;

                if (col.a instanceof Uint8Array) {
                    const aRaw = new Int16Array(col.a.buffer.slice(col.a.byteOffset, col.a.byteOffset + col.a.byteLength));
                    const a = new Float32Array(count);
                    for (let k = 0; k < count; k++) {
                        a[k] = (aRaw[k] / 32767) * Math.PI;
                    }
                    col.a = a;
                }

                if (col.s instanceof Uint8Array) {
                    const sRaw = col.s;
                    const s = new Float32Array(count);
                    for (let k = 0; k < count; k++) {
                        s[k] = Math.pow(2, sRaw[k]);
                    }
                    col.s = s;
                }

                if (col.d instanceof Uint8Array) {
                    col.d = new Uint32Array(col.d.buffer.slice(col.d.byteOffset, col.d.byteOffset + col.d.byteLength));
                }
            }
        }
    }

    return { version, dataList };
}

/**
 * Serializes target data into a .taar binary buffer
 */
export function encodeTaar(dataList: any[]) {
    return msgpack.encode({
        v: CURRENT_VERSION,
        dataList,
    });
}
