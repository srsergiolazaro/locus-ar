/**
 * @fileoverview Compilador Offline Optimizado - Sin TensorFlow para máxima velocidad
 * 
 * Este módulo implementa un compilador de imágenes AR ultrarrápido
 * que NO depende de TensorFlow, eliminando todos los problemas de
 * inicialización, bloqueos y compatibilidad.
 */

import { buildTrackingImageList, buildImageList } from "./image-list.js";
import { extractTrackingFeatures } from "./tracker/extract-utils.js";
import { DetectorLite } from "./detector/detector-lite.js";
import { build as hierarchicalClusteringBuild } from "./matching/hierarchical-clustering.js";
import * as msgpack from "@msgpack/msgpack";
import { WorkerPool } from "./utils/worker-pool.js";

// Detect environment
const isNode = typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;

const CURRENT_VERSION = 7; // Protocol v7: Moonshot - 4-bit Packed Tracking Data

export class OfflineCompiler {
    data: any = null;
    workerPool: WorkerPool | null = null;

    constructor() {
        // Workers only in Node.js
        if (!isNode) {
            console.log("🌐 OfflineCompiler: Browser mode (no workers)");
        }
    }

    async _initNodeWorkers() {
        try {
            const pathModule = "path";
            const urlModule = "url";
            const osModule = "os";
            const workerThreadsModule = "node:worker_threads";

            const [path, url, os, { Worker }] = await Promise.all([
                import(pathModule),
                import(urlModule),
                import(osModule),
                import(workerThreadsModule)
            ]);

            const __filename = url.fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const workerPath = path.join(__dirname, "node-worker.js");

            // Limit workers to avoid freezing system
            const numWorkers = Math.min(os.cpus().length, 4);

            this.workerPool = new WorkerPool(workerPath, numWorkers, Worker);
        } catch (e) {
            console.log("⚡ OfflineCompiler: Running without workers (initialization failed)", e);
        }
    }

    async compileImageTargets(images: any[], progressCallback: (p: number) => void) {
        console.time("⏱️ Compilación total");

        const targetImages: any[] = [];

        // Preparar imágenes
        for (let i = 0; i < images.length; i++) {
            const img = images[i];

            if (!img || !img.width || !img.height || !img.data) {
                throw new Error(
                    `Imagen inválida en posición ${i}. Debe tener propiedades width, height y data.`
                );
            }

            const greyImageData = new Uint8Array(img.width * img.height);

            if (img.data.length === img.width * img.height) {
                greyImageData.set(img.data);
            } else if (img.data.length === img.width * img.height * 4) {
                for (let j = 0; j < greyImageData.length; j++) {
                    const offset = j * 4;
                    greyImageData[j] = Math.floor(
                        (img.data[offset] + img.data[offset + 1] + img.data[offset + 2]) / 3
                    );
                }
            } else {
                throw new Error(`Formato de datos de imagen no soportado en posición ${i}`);
            }

            targetImages.push({
                data: greyImageData,
                width: img.width,
                height: img.height,
            });
        }

        const results: any[] = await this._compileTarget(targetImages, progressCallback);

        this.data = targetImages.map((img, i) => ({
            targetImage: img,
            matchingData: results[i].matchingData,
            trackingData: results[i].trackingData,
        }));

        console.timeEnd("⏱️ Compilación total");
        return this.data;
    }

    async _compileTarget(targetImages: any[], progressCallback: (p: number) => void) {
        if (isNode) await this._initNodeWorkers();

        if (this.workerPool) {
            const progressMap = new Float32Array(targetImages.length);
            const wrappedPromises = targetImages.map((targetImage: any, index: number) => {
                return this.workerPool!.runTask({
                    type: 'compile-all', // 🚀 MOONSHOT: Combined task
                    targetImage,
                    onProgress: (p: number) => {
                        progressMap[index] = p;
                        const sum = progressMap.reduce((a, b) => a + b, 0);
                        progressCallback(sum / targetImages.length);
                    }
                });
            });
            return Promise.all(wrappedPromises);
        }

        // Fallback or non-worker implementation: run match and track sequentially
        const matchingResults = await this._compileMatch(targetImages, (p) => progressCallback(p * 0.5));
        const trackingResults = await this._compileTrack(targetImages, (p) => progressCallback(50 + p * 0.5));

        return targetImages.map((_, i) => ({
            matchingData: matchingResults[i],
            trackingData: trackingResults[i]
        }));
    }

    async _compileMatch(targetImages: any[], progressCallback: (p: number) => void) {
        const percentPerImage = 100 / targetImages.length;
        let currentPercent = 0;

        if (isNode) await this._initNodeWorkers();
        if (this.workerPool) {
            const progressMap = new Float32Array(targetImages.length);

            const wrappedPromises = targetImages.map((targetImage: any, index: number) => {
                return this.workerPool!.runTask({
                    type: 'match',
                    targetImage,
                    percentPerImage,
                    basePercent: 0,
                    onProgress: (p: number) => {
                        progressMap[index] = p;
                        const sum = progressMap.reduce((a, b) => a + b, 0);
                        progressCallback(sum);
                    }
                });
            });

            return Promise.all(wrappedPromises);
        }

        const results = [];
        for (let i = 0; i < targetImages.length; i++) {
            const targetImage = targetImages[i];
            const imageList = buildImageList(targetImage);
            const percentPerImageScale = percentPerImage / imageList.length;

            const keyframes = [];

            for (const image of imageList as any[]) {
                const detector = new DetectorLite(image.width, image.height, { useLSH: true });
                const { featurePoints: ps } = detector.detect(image.data);

                const maximaPoints = ps.filter((p: any) => p.maxima);
                const minimaPoints = ps.filter((p: any) => !p.maxima);
                const maximaPointsCluster = hierarchicalClusteringBuild({ points: maximaPoints });
                const minimaPointsCluster = hierarchicalClusteringBuild({ points: minimaPoints });

                keyframes.push({
                    maximaPoints,
                    minimaPoints,
                    maximaPointsCluster,
                    minimaPointsCluster,
                    width: image.width,
                    height: image.height,
                    scale: image.scale,
                });
                currentPercent += percentPerImageScale;
                progressCallback(currentPercent);
            }

            results.push(keyframes);
        }

        return results;
    }

    async _compileTrack(targetImages: any[], progressCallback: (p: number) => void) {
        const percentPerImage = 100 / targetImages.length;
        let currentPercent = 0;

        if (this.workerPool) {
            const progressMap = new Float32Array(targetImages.length);
            const wrappedPromises = targetImages.map((targetImage: any, index: number) => {
                return this.workerPool!.runTask({
                    type: 'compile',
                    targetImage,
                    percentPerImage,
                    basePercent: 0,
                    onProgress: (p: number) => {
                        progressMap[index] = p;
                        const sum = progressMap.reduce((a, b) => a + b, 0);
                        progressCallback(sum);
                    }
                });
            });
            return Promise.all(wrappedPromises);
        }

        const results = [];
        for (let i = 0; i < targetImages.length; i++) {
            const targetImage = targetImages[i];
            const imageList = buildTrackingImageList(targetImage);
            const percentPerScale = percentPerImage / imageList.length;

            const trackingData = extractTrackingFeatures(imageList, () => {
                currentPercent += percentPerScale;
                progressCallback(currentPercent);
            });

            results.push(trackingData);
        }

        return results;
    }

    async compileTrack({ progressCallback, targetImages, basePercent = 0 }: { progressCallback: (p: number) => void, targetImages: any[], basePercent?: number }) {
        return this._compileTrack(targetImages, (percent) => {
            progressCallback(basePercent + percent * (100 - basePercent) / 100);
        });
    }

    async compileMatch({ progressCallback, targetImages, basePercent = 0 }: { progressCallback: (p: number) => void, targetImages: any[], basePercent?: number }) {
        return this._compileMatch(targetImages, (percent) => {
            progressCallback(basePercent + percent * (50 - basePercent) / 100);
        });
    }

    exportData() {
        if (!this.data) {
            throw new Error("No hay datos compilados para exportar");
        }

        const dataList = this.data.map((item: any) => {
            return {
                targetImage: {
                    width: item.targetImage.width,
                    height: item.targetImage.height,
                },
                trackingData: item.trackingData.map((td: any) => {
                    const count = td.points.length;
                    const px = new Float32Array(count);
                    const py = new Float32Array(count);
                    for (let i = 0; i < count; i++) {
                        px[i] = td.points[i].x;
                        py[i] = td.points[i].y;
                    }
                    return {
                        w: td.width,
                        h: td.height,
                        s: td.scale,
                        px,
                        py,

                        d: this._pack4Bit(td.data),
                    };
                }),
                matchingData: item.matchingData.map((kf: any) => ({
                    w: kf.width,
                    h: kf.height,
                    s: kf.scale,
                    max: this._columnarize(kf.maximaPoints, kf.maximaPointsCluster, kf.width, kf.height),
                    min: this._columnarize(kf.minimaPoints, kf.minimaPointsCluster, kf.width, kf.height),
                })),
            };
        });

        return msgpack.encode({
            v: CURRENT_VERSION,
            dataList,
        });
    }

    _getMorton(x: number, y: number) {
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

    // Keyframe packing is now minimal, most work moved to Workers

    _columnarize(points: any[], tree: any, width: number, height: number) {
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
            t: this._compactTree(tree.rootNode),
        };
    }

    _compactTree(node: any): any {
        if (node.leaf) {
            return [1, node.centerPointIndex || 0, node.pointIndexes];
        }
        return [0, node.centerPointIndex || 0, node.children.map((c: any) => this._compactTree(c))];
    }

    importData(buffer: ArrayBuffer | Uint8Array) {
        const content: any = msgpack.decode(new Uint8Array(buffer));

        const version = content.v || 0;
        if (version !== CURRENT_VERSION && version !== 5) {
            console.error(`Incompatible .taar version: ${version}. This engine only supports Protocol V5/V6.`);
            return { version, dataList: [] };
        }

        const dataList = content.dataList;
        for (let i = 0; i < dataList.length; i++) {
            const item = dataList[i];

            for (const td of item.trackingData) {
                let px = td.px;
                let py = td.py;

                if (px instanceof Uint8Array) {
                    px = new Float32Array(px.buffer.slice(px.byteOffset, px.byteOffset + px.byteLength));
                }
                if (py instanceof Uint8Array) {
                    py = new Float32Array(py.buffer.slice(py.byteOffset, py.byteOffset + py.byteLength));
                }
                td.px = px;
                td.py = py;

                // 🚀 MOONSHOT: Unpack 4-bit tracking data if detected
                if (td.data && td.data.length === (td.width * td.height) / 2) {
                    td.data = this._unpack4Bit(td.data, td.width, td.height);
                }
                // Also handle 'd' property if it exists (msgpack mapping)
                if (td.d && td.d.length === (td.w * td.h) / 2) {
                    td.d = this._unpack4Bit(td.d, td.w, td.h);
                }
            }

            for (const kf of item.matchingData) {
                for (const col of [kf.max, kf.min]) {
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

        this.data = dataList;
        return { version, dataList };
    }

    _unpackKeyframe(kf: any) {
        return {
            width: kf.w,
            height: kf.h,
            scale: kf.s,
            maximaPoints: this._decolumnarize(kf.max, kf.w, kf.h),
            minimaPoints: this._decolumnarize(kf.min, kf.w, kf.h),
            maximaPointsCluster: { rootNode: this._expandTree(kf.max.t) },
            minimaPointsCluster: { rootNode: this._expandTree(kf.min.t) },
        };
    }

    _decolumnarize(col: any, width: number, height: number) {
        const points = [];
        const count = col.x.length;
        const descSize = col.d.length / count;

        for (let i = 0; i < count; i++) {
            points.push({
                x: (col.x[i] / 65535) * width,
                y: (col.y[i] / 65535) * height,
                angle: col.a[i],
                scale: col.s ? col.s[i] : 1.0,
                descriptors: col.d.slice(i * descSize, (i + 1) * descSize),
            });
        }
        return points;
    }

    _expandTree(node: any): any {
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
            children: node[2].map((c: any) => this._expandTree(c)),
        };
    }

    async destroy() {
        if (this.workerPool) {
            await this.workerPool.destroy();
        }
    }


    _pack4Bit(data: Uint8Array) {
        const length = data.length;
        if (length % 2 !== 0) return data; // Only pack even lengths

        const packed = new Uint8Array(length / 2);
        for (let i = 0; i < length; i += 2) {
            // Take top 4 bits of each byte
            const p1 = (data[i] & 0xF0) >> 4;
            const p2 = (data[i + 1] & 0xF0) >> 4;
            packed[i / 2] = (p1 << 4) | p2;
        }
        return packed;
    }

    _unpack4Bit(packed: Uint8Array, width: number, height: number) {
        const length = width * height;
        const data = new Uint8Array(length);

        for (let i = 0; i < packed.length; i++) {
            const byte = packed[i];
            const p1 = (byte & 0xF0);      // First pixel (already in high position)
            const p2 = (byte & 0x0F) << 4; // Second pixel (move to high position)

            data[i * 2] = p1;
            data[i * 2 + 1] = p2;
        }
        return data;
    }
}
