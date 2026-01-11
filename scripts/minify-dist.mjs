#!/usr/bin/env node
/**
 * 🚀 Ultra-Compression Post-Build Script
 * 
 * Minifies all JavaScript files in dist/ to reduce package size.
 * This is run after TypeScript compilation.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { minify } from 'terser';

const DIST_DIR = './dist';
let totalOriginal = 0;
let totalMinified = 0;
let filesProcessed = 0;

function getFilesRecursive(dir) {
    const files = [];
    for (const file of readdirSync(dir)) {
        const path = join(dir, file);
        if (statSync(path).isDirectory()) {
            files.push(...getFilesRecursive(path));
        } else if (file.endsWith('.js') && !file.endsWith('.min.js')) {
            files.push(path);
        }
    }
    return files;
}

async function minifyFile(filePath) {
    const original = readFileSync(filePath, 'utf8');
    const originalSize = Buffer.byteLength(original, 'utf8');

    try {
        const result = await minify(original, {
            module: true,
            compress: {
                dead_code: true,
                drop_console: false, // Keep console for debugging
                drop_debugger: true,
                passes: 2,
            },
            mangle: {
                module: true,
            },
            format: {
                comments: false,
            },
        });

        if (result.code) {
            writeFileSync(filePath, result.code);
            const minifiedSize = Buffer.byteLength(result.code, 'utf8');
            totalOriginal += originalSize;
            totalMinified += minifiedSize;
            filesProcessed++;

            const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
            console.log(`  ✓ ${filePath} (${savings}% smaller)`);
        }
    } catch (error) {
        console.error(`  ✗ Error minifying ${filePath}:`, error.message);
    }
}

async function main() {
    console.log('🚀 Ultra-Compression: Minifying dist/ files...\n');

    const files = getFilesRecursive(DIST_DIR);
    console.log(`Found ${files.length} JavaScript files to minify.\n`);

    for (const file of files) {
        await minifyFile(file);
    }

    const savingsPercent = ((1 - totalMinified / totalOriginal) * 100).toFixed(1);
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Files processed: ${filesProcessed}`);
    console.log(`   Original size:   ${(totalOriginal / 1024).toFixed(1)} KB`);
    console.log(`   Minified size:   ${(totalMinified / 1024).toFixed(1)} KB`);
    console.log(`   Savings:         ${savingsPercent}%`);
    console.log('='.repeat(50));
}

main().catch(console.error);
