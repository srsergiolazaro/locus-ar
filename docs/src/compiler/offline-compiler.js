/**
 * @fileoverview Compilador Offline Optimizado - Sin TensorFlow para máxima velocidad
 *
 * Este módulo implementa un compilador de imágenes AR ultrarrápido
 * que NO depende de TensorFlow, eliminando todos los problemas de
 * inicialización, bloqueos y compatibilidad.
 */
import { buildTrackingImageList } from "../core/image-list.js";
import { extractTrackingFeatures } from "../core/tracker/extract-utils.js";
import { DetectorLite } from "../core/detector/detector-lite.js";
import { build as hierarchicalClusteringBuild } from "../core/matching/hierarchical-clustering.js";
import * as protocol from "../core/protocol.js";
import { triangulate, getEdges } from "../core/utils/delaunay.js";
import { AR_CONFIG } from "../core/constants.js";
// Detect environment
const isNode = typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;
export class OfflineCompiler {
    data = null;
    constructor() {
        console.log("⚡ OfflineCompiler: Main thread mode (no workers)");
    }
    async compileImageTargets(images, progressCallback) {
        console.time("⏱️ Compilación total");
        const targetImages = [];
        // Preparar imágenes
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (!img || !img.width || !img.height || !img.data) {
                throw new Error(`Imagen inválida en posición ${i}. Debe tener propiedades width, height y data.`);
            }
            const greyImageData = new Uint8Array(img.width * img.height);
            if (img.data.length === img.width * img.height) {
                greyImageData.set(img.data);
            }
            else if (img.data.length === img.width * img.height * 4) {
                for (let j = 0; j < greyImageData.length; j++) {
                    const offset = j * 4;
                    greyImageData[j] = Math.floor((img.data[offset] + img.data[offset + 1] + img.data[offset + 2]) / 3);
                }
            }
            else {
                throw new Error(`Formato de datos de imagen no soportado en posición ${i}`);
            }
            targetImages.push({
                data: greyImageData,
                width: img.width,
                height: img.height,
            });
        }
        const results = await this._compileTarget(targetImages, progressCallback);
        this.data = targetImages.map((img, i) => ({
            targetImage: img,
            matchingData: results[i].matchingData,
            trackingData: results[i].trackingData,
        }));
        console.timeEnd("⏱️ Compilación total");
        return this.data;
    }
    async _compileTarget(targetImages, progressCallback) {
        // Run match and track sequentially to match browser behavior exactly
        const matchingResults = await this._compileMatch(targetImages, (p) => progressCallback(p * 0.5));
        const trackingResults = await this._compileTrack(targetImages, (p) => progressCallback(50 + p * 0.5));
        return targetImages.map((_, i) => ({
            matchingData: matchingResults[i],
            trackingData: trackingResults[i]
        }));
    }
    async _compileMatch(targetImages, progressCallback) {
        const percentPerImage = 100 / targetImages.length;
        let currentPercent = 0;
        const results = [];
        for (let i = 0; i < targetImages.length; i++) {
            const targetImage = targetImages[i];
            // 🚀 NANITE-STYLE: Only process the target at scale 1.0
            // The DetectorLite already builds its own pyramid and finds features at all octaves (virtualized LOD)
            const detector = new DetectorLite(targetImage.width, targetImage.height, {
                useLSH: AR_CONFIG.USE_LSH,
                maxFeaturesPerBucket: AR_CONFIG.MAX_FEATURES_PER_BUCKET
            });
            const { featurePoints: rawPs } = detector.detect(targetImage.data);
            // 🎯 Stratified Sampling: Ensure we have features from ALL scales
            // We take the top N features per octave to guarantee scale coverage (Nanite-style)
            const octaves = [0, 1, 2, 3, 4, 5];
            const ps = [];
            const featuresPerOctave = 300;
            for (const oct of octaves) {
                const octScale = Math.pow(2, oct);
                const octFeatures = rawPs
                    .filter(p => Math.abs(p.scale - octScale) < 0.1)
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, featuresPerOctave);
                ps.push(...octFeatures);
            }
            const maximaPoints = ps.filter((p) => p.maxima);
            const minimaPoints = ps.filter((p) => !p.maxima);
            const maximaPointsCluster = hierarchicalClusteringBuild({ points: maximaPoints });
            const minimaPointsCluster = hierarchicalClusteringBuild({ points: minimaPoints });
            const keyframe = {
                maximaPoints,
                minimaPoints,
                maximaPointsCluster,
                minimaPointsCluster,
                width: targetImage.width,
                height: targetImage.height,
                scale: 1.0,
            };
            // Wrapped in array because the protocol expects matchingData to be an array of keyframes
            // We provide only one keyframe containing features from all octaves
            results.push([keyframe]);
            currentPercent += percentPerImage;
            progressCallback(currentPercent);
        }
        return results;
    }
    async _compileTrack(targetImages, progressCallback) {
        const percentPerImage = 100 / targetImages.length;
        let currentPercent = 0;
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
    async compileTrack({ progressCallback, targetImages, basePercent = 0 }) {
        return this._compileTrack(targetImages, (percent) => {
            progressCallback(basePercent + percent * (100 - basePercent) / 100);
        });
    }
    async compileMatch({ progressCallback, targetImages, basePercent = 0 }) {
        return this._compileMatch(targetImages, (percent) => {
            progressCallback(basePercent + percent * (50 - basePercent) / 100);
        });
    }
    exportData() {
        if (!this.data) {
            throw new Error("No hay datos compilados para exportar");
        }
        const dataList = this.data.map((item) => {
            return {
                targetImage: {
                    width: item.targetImage.width,
                    height: item.targetImage.height,
                },
                trackingData: item.trackingData.map((td) => {
                    const count = td.points.length;
                    const px = new Float32Array(count);
                    const py = new Float32Array(count);
                    for (let i = 0; i < count; i++) {
                        px[i] = td.points[i].x;
                        py[i] = td.points[i].y;
                    }
                    const triangles = triangulate(td.points);
                    const edges = getEdges(triangles);
                    const restLengths = new Float32Array(edges.length);
                    for (let j = 0; j < edges.length; j++) {
                        const p1 = td.points[edges[j][0]];
                        const p2 = td.points[edges[j][1]];
                        restLengths[j] = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
                    }
                    return {
                        w: td.width,
                        h: td.height,
                        s: td.scale,
                        px,
                        py,
                        d: td.data,
                        mesh: {
                            t: new Uint16Array(triangles.flat()),
                            e: new Uint16Array(edges.flat()),
                            rl: restLengths
                        }
                    };
                }),
                matchingData: item.matchingData.map((kf) => {
                    const useCompact = AR_CONFIG.USE_COMPACT_DESCRIPTORS;
                    const columnarizeFn = useCompact ? protocol.columnarizeCompact : protocol.columnarize;
                    return {
                        w: kf.width,
                        h: kf.height,
                        s: kf.scale,
                        hdc: false,
                        max: columnarizeFn(kf.maximaPoints, kf.maximaPointsCluster, kf.width, kf.height),
                        min: columnarizeFn(kf.minimaPoints, kf.minimaPointsCluster, kf.width, kf.height),
                    };
                }),
            };
        });
        return protocol.encodeTaar(dataList);
    }
    importData(buffer) {
        const result = protocol.decodeTaar(buffer);
        this.data = result.dataList;
        return result;
    }
    async destroy() {
        // No workers to destroy
    }
}
