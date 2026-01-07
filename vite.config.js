export default {
    server: {
        allowedHosts: ["testroute.taptapp.xyz", "macastro.taptapp.xyz"],
        fs: {
            allow: [
                '.',
                'D:/node_cache/pnpm-cache'
            ]
        }
    },
    // esbuild automatically handles .tsx files
    esbuild: {
        jsxInject: `import React from 'react'`
    }
};
