export default {
    server: {
        allowedHosts: ["testroute.taptapp.xyz"]
    },
    // esbuild automatically handles .tsx files
    esbuild: {
        jsxInject: `import React from 'react'`
    }
};
