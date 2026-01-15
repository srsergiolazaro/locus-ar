import { match } from "./matching.js";
class Matcher {
    constructor(queryWidth, queryHeight, debugMode = false) {
        this.queryWidth = queryWidth;
        this.queryHeight = queryHeight;
        this.debugMode = debugMode;
    }
    matchDetection(keyframes, featurePoints, expectedScale) {
        let debugExtra = { frames: [] };
        let bestResult = null;
        // keyframes is actually the matchingData array for a single target
        if (!keyframes || !Array.isArray(keyframes)) {
            return { targetIndex: -1, keyframeIndex: -1, debugExtra };
        }
        for (let j = 0; j < keyframes.length; j++) {
            const { H, matches, debugExtra: frameDebugExtra, } = match({
                keyframe: keyframes[j],
                querypoints: featurePoints,
                querywidth: this.queryWidth,
                queryheight: this.queryHeight,
                debugMode: this.debugMode,
                expectedScale,
            });
            if (frameDebugExtra) {
                frameDebugExtra.keyframeIndex = j;
                debugExtra.frames.push(frameDebugExtra);
            }
            if (H) {
                if (bestResult === null || bestResult.matches.length < matches.length) {
                    bestResult = { keyframeIndex: j, H, matches };
                }
            }
        }
        if (bestResult === null) {
            return { targetIndex: -1, keyframeIndex: -1, debugExtra };
        }
        const screenCoords = [];
        const worldCoords = [];
        const keyframe = keyframes[bestResult.keyframeIndex];
        const kfScale = keyframe.s || keyframe.scale || 1.0;
        for (let i = 0; i < bestResult.matches.length; i++) {
            const querypoint = bestResult.matches[i].querypoint;
            const keypoint = bestResult.matches[i].keypoint;
            // 🚀 NANITE-STYLE: Use per-keypoint scale (octave) for accurate world mapping
            const pointScale = keypoint.scale || kfScale;
            screenCoords.push({
                x: querypoint.x,
                y: querypoint.y,
            });
            worldCoords.push({
                x: (keypoint.x + 0.5) / kfScale,
                y: (keypoint.y + 0.5) / kfScale,
                z: 0,
            });
        }
        return {
            screenCoords,
            worldCoords,
            targetIndex: -1, // Caller knows the targetIndex
            keyframeIndex: bestResult.keyframeIndex,
            H: bestResult.H,
            debugExtra
        };
    }
}
export { Matcher };
