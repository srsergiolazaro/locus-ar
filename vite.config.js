export default {
    server: {
        allowedHosts: ["testroute.taptapp.xyz", "macastro.taptapp.xyz"]
    },
    // esbuild automatically handles .tsx files
    esbuild: {
        jsxInject: `import React from 'react'`
    }
};
