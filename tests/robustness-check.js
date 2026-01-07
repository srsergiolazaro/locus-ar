/**
 * 🎯 Robustness Stress Test Script
 * 
 * Objectives:
 * 1. Fast validation of compiler optimizations.
 * 2. Adaptive sampling: starts small, grows if passing.
 * 3. Fail-fast: stops immediately if too many warnings or any errors.
 * 4. Size monitoring: each compiler change MUST be reflected in target data size.
 * 
 * Run with: node tests/robustness-check.js
 */

import { Controller } from '../src/runtime/controller.js';
import { OfflineCompiler } from '../src/compiler/offline-compiler.js';

import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_DIR = path.join(__dirname, 'assets');
const ROBUSTNESS_DIR = path.join(__dirname, 'robustness-images');
const TEST_IMAGE_PATH = path.join(ASSETS_DIR, 'test-image.png');

const CONFIG = {
    MIN_INLIERS: 15,
    WARNING_THRESHOLD_PERCENT: 10, // Stop if >10% are warnings
    PHASES: [
        { name: 'QUIK_CHECK', sampleRate: 0.1 },
        { name: 'STABILITY_CHECK', sampleRate: 0.4 },
        { name: 'FULL_VALIDATION', sampleRate: 1.0 }
    ]
};

async function runCheck() {
    console.log('\x1b[1m\x1b[35m%s\x1b[0m', '🧪 COMPILER STRESS TEST (Adaptive Sampling)');

    // 0. Load Metadata
    const metadataPath = path.join(ROBUSTNESS_DIR, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
        console.error('❌ Metadata file not found. Run generate-robustness-images.js first.');
        process.exit(1);
    }
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    // 1. Compile Target
    const baseImage = await Jimp.read(TEST_IMAGE_PATH);
    const compiler = new OfflineCompiler();

    console.log('🔨 Compiling...');
    const startBuild = Date.now();
    await compiler.compileImageTargets([{
        width: baseImage.bitmap.width,
        height: baseImage.bitmap.height,
        data: baseImage.bitmap.data
    }], () => { });
    const endBuild = Date.now();

    const taarBuffer = compiler.exportData();
    const markerW = baseImage.bitmap.width;
    const markerH = baseImage.bitmap.height;

    console.log(`\x1b[1m📦 Target Data Size: \x1b[32m${(taarBuffer.byteLength / 1024).toFixed(2)} KB\x1b[0m`);
    console.log(`⏱️  Build Time: ${endBuild - startBuild}ms\n`);


    // 2. Adaptive Loop
    for (const phase of CONFIG.PHASES) {
        console.log(`\x1b[1m\x1b[36m--- PHASE: ${phase.name} (Sample: ${phase.sampleRate * 100}%) ---\x1b[0m`);

        let stats = { passed: 0, warnings: 0, failed: 0, total: 0, totalDetectTime: 0, totalMatchTime: 0 };
        const folders = fs.readdirSync(ROBUSTNESS_DIR).filter(d => {
            const fullPath = path.join(ROBUSTNESS_DIR, d);
            return fs.statSync(fullPath).isDirectory() && d !== 'custom' && d !== 'miniature';
        });

        for (const res of folders) {
            const resPath = path.join(ROBUSTNESS_DIR, res);
            const resMetadata = metadata[res];

            let files = fs.readdirSync(resPath).filter(f => f.endsWith('.png'));

            // Sampling logic
            if (phase.sampleRate < 1.0) {
                files = files.filter(() => Math.random() < phase.sampleRate);
            }
            if (files.length === 0) continue;

            const firstImg = await Jimp.read(path.join(resPath, files[0]));
            const controller = new Controller({
                inputWidth: firstImg.bitmap.width,
                inputHeight: firstImg.bitmap.height,
                debugMode: false
            });
            controller.addImageTargetsFromBuffers([taarBuffer]);

            for (const file of files) {
                stats.total++;
                const img = await Jimp.read(path.join(resPath, file));
                const inputData = new Uint8Array(img.bitmap.width * img.bitmap.height);
                const grey = img.greyscale();
                for (let i = 0; i < inputData.length; i++) inputData[i] = grey.bitmap.data[i * 4];

                const startDetect = Date.now();
                const { featurePoints } = await controller.detect(inputData);
                const endDetect = Date.now();

                const startMatch = Date.now();
                const matchResult = await controller.match(featurePoints, 0);
                const endMatch = Date.now();

                const detectTime = endDetect - startDetect;
                const matchTime = endMatch - startMatch;

                stats.totalDetectTime += detectTime;
                stats.totalMatchTime += matchTime;

                // Validation Logic
                const meta = resMetadata?.testCases?.[file];
                let isWarning = false;
                let failReason = null;
                let errors = [];

                if (matchResult.targetIndex === -1) {
                    failReason = "No match found";
                } else {
                    const inliers = matchResult.screenCoords?.length || 0;
                    if (inliers < CONFIG.MIN_INLIERS) {
                        isWarning = true;
                        errors.push(`Inliers: ${inliers}`);
                    }

                    // Geometric Validation
                    if (meta && matchResult.modelViewTransform) {
                        const P = controller.projectionTransform;
                        const M = matchResult.modelViewTransform;

                        const cx = resMetadata.originalImage.width / 2;
                        const cy = resMetadata.originalImage.height / 2;
                        const z = 0;

                        // 1. Marker to Camera
                        const tx = M[0][0] * cx + M[0][1] * cy + M[0][2] * z + M[0][3];
                        const ty = M[1][0] * cx + M[1][1] * cy + M[1][2] * z + M[1][3];
                        const tz = M[2][0] * cx + M[2][1] * cy + M[2][2] * z + M[2][3];

                        // 2. Camera to Image (Buffer Pixels)
                        const imageX = (P[0][0] * tx / tz) + P[0][2];
                        const imageY = (P[1][1] * ty / tz) + P[1][2];

                        const dist = Math.sqrt(Math.pow(imageX - meta.expectedCenter.x, 2) + Math.pow(imageY - meta.expectedCenter.y, 2));

                        const threshold = Math.min(controller.inputWidth, controller.inputHeight) * 0.15;

                        if (dist > threshold) {
                            isWarning = true;
                            errors.push(`Drift: ${dist.toFixed(1)}px`);
                        }
                    }
                }

                if (failReason) {
                    stats.failed++;
                    console.log(`\x1b[31m   ❌ FAILED: [${res}] ${file} - ${failReason} (Det: ${detectTime}ms, Match: ${matchTime}ms)\x1b[0m`);
                } else if (isWarning) {
                    stats.warnings++;
                    console.log(`\x1b[33m   ⚠️ WARNING: [${res}] ${file} (${errors.join(', ')}, Det: ${detectTime}ms, Match: ${matchTime}ms)\x1b[0m`);
                } else {
                    stats.passed++;
                }
            }
        }

        // Evaluate Phase
        const warnPct = (stats.warnings / stats.total) * 100;
        const avgDetect = (stats.totalDetectTime / stats.total).toFixed(2);
        const avgMatch = (stats.totalMatchTime / stats.total).toFixed(2);
        const avgTotal = ((stats.totalDetectTime + stats.totalMatchTime) / stats.total).toFixed(2);

        console.log(`   Results: ✅ ${stats.passed} | ⚠️ ${stats.warnings} | ❌ ${stats.failed}`);
        console.log(`   ⏱️  Avg Times: Detect: ${avgDetect}ms | Match: ${avgMatch}ms | Total: ${avgTotal}ms / frame`);

        if (stats.failed > 0) {
            console.log('\n\x1b[1m\x1b[31m🛑 STRESS TEST FAILED: Compilation is too aggressive (Target missed). Reduce optimization.\x1b[0m');
            process.exit(1);
        }
        if (warnPct > CONFIG.WARNING_THRESHOLD_PERCENT) {
            console.log(`\n\x1b[1m\x1b[31m🛑 STRESS TEST FAILED: Over ${CONFIG.WARNING_THRESHOLD_PERCENT}% warnings (${warnPct.toFixed(1)}%). Tracking quality degraded.\x1b[0m`);
            process.exit(1);
        }

        console.log(`\x1b[32m   ✅ Phase ${phase.name} PASSED.\x1b[0m\n`);
    }

    console.log('\x1b[1m\x1b[32m🏆 ALL STRESS TESTS PASSED! This compiler version is ROBUST.\x1b[0m');
}

runCheck().catch(err => {
    console.error('\n❌ CRITICAL ERROR:', err);
    process.exit(1);
});
