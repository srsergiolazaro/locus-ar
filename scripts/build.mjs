import { execSync } from 'child_process';
import esbuild from 'esbuild';
import { readdirSync, statSync, unlinkSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, resolve } from 'path';

const DIST_DIR = './dist';

async function build() {
    console.log('🏗️  Starting Locus AR Ultra-Optimized Build...');

    // 1. Run TSC to generate type definitions
    console.log('📊 Generating type definitions (tsc)...');
    execSync('npx tsc', { stdio: 'inherit' });

    // 2. Define external dependencies
    const externals = [
        '@msgpack/msgpack', 'ml-matrix', 'tinyqueue', 'react', 'react-dom', 'three', 'aframe'
    ];

    // 3. Bundle with code splitting
    console.log('🚀 Bundling with code splitting (esbuild)...');
    await esbuild.build({
        entryPoints: ['src/index.ts', 'src/client/index.ts', 'src/compiler/offline-compiler.ts'],
        bundle: true,
        minify: true,
        splitting: true,
        format: 'esm',
        platform: 'browser',
        external: externals,
        outdir: DIST_DIR,
        allowOverwrite: true,
    });

    // 4. Aggressive Resource Cleanup
    console.log('🧹 Cleaning up redundant resources...');

    function getFiles(dir) {
        let results = [];
        const list = readdirSync(dir);
        for (const file of list) {
            const fullPath = resolve(dir, file);
            if (statSync(fullPath).isDirectory()) {
                results = results.concat(getFiles(fullPath));
            } else {
                results.push(fullPath);
            }
        }
        return results;
    }

    const allFiles = getFiles(DIST_DIR);
    let removedJs = 0;
    let minifiedDts = 0;

    const criticalJs = new Set([
        resolve(DIST_DIR, 'index.js'),
        resolve(DIST_DIR, 'client/index.js'),
        resolve(DIST_DIR, 'compiler/offline-compiler.js'),
    ]);

    for (const file of allFiles) {
        const ext = extname(file);

        if (ext === '.js') {
            const isEntry = criticalJs.has(file);
            const isChunk = file.includes('chunk-');
            const isHashedWorker = /worker-.*\.js$/.test(file);

            // Only keep entries, chunks, and hashed workers
            if (!isEntry && !isChunk && !isHashedWorker) {
                unlinkSync(file);
                removedJs++;
            }
        } else if (ext === '.d.ts') {
            // Minify .d.ts files by removing comments to save space
            const content = readFileSync(file, 'utf8');
            const minified = content
                .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*/g, '$1') // Remove comments but keep URL schemes
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n');
            writeFileSync(file, minified);
            minifiedDts++;
        } else if (ext === '.map') {
            unlinkSync(file);
        }
    }

    console.log(`   ✨ Removed ${removedJs} redundant JS files.`);
    console.log(`   ✨ Minified ${minifiedDts} type definition files.`);

    const finalSize = execSync(`du -sh ${DIST_DIR}`).toString().trim();
    console.log(`\n✅ Build complete! Final size: ${finalSize}`);
}

build().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
