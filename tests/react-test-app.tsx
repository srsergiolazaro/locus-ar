import React from 'react';
import ReactDOM from 'react-dom/client';
import { TaptappAR } from '../src/react/TaptappAR';

const App = () => {
    const config = {
        cardId: "test-card",
        targetImageSrc: "./assets/test-image.png",
        targetTaarSrc: "./assets/targets.taar",
        videoSrc: "./assets/test-image.png", // Using the same image as overlay for testing
        videoWidth: 1024,
        videoHeight: 1024,
        scale: 1.0
    };

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <TaptappAR
                config={config}
                showScanningOverlay={true}
            />
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
