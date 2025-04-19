// Tab switching functionality
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Simulate live audio visualization (in a real app, this would connect to actual audio)
const VISUALIZER_CONFIG = {
    minHeight: 0,         // Minimum bar height (%)
    maxHeight: 100,       // Maximum bar height (%)
    updateProbability: 0.1, // Chance to update a bar each frame (0-1)
    smoothingFactor: 0.6,  // How smooth the transitions are (0-1, higher = smoother)
    waveSize: 8,          // How many bars form a "wave" group
    blueHue: 240,         // Base blue hue (200 is standard blue)
    hueRange:0 ,         // Color variation range
    saturation: '100%',    // Color saturation
    lightness: '65%'      // Color lightness
};

let visualizerBars = [];
let animationFrameId = null;
let currentHeights = [];
let targetHeights = [];

function setupVisualizer() {
    const visualizer = document.getElementById('visualizer');
    visualizer.innerHTML = '';
    visualizerBars = [];
    currentHeights = Array(50).fill(VISUALIZER_CONFIG.minHeight);
    targetHeights = Array(50).fill(VISUALIZER_CONFIG.minHeight);
    
    // Create bars
    for (let i = 0; i < 50; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.left = `${i * 5}px`;
        bar.style.height = `${VISUALIZER_CONFIG.minHeight}%`;
        bar.style.transition = 'height 0.1s ease-out';
        bar.style.backgroundColor = `hsl(${VISUALIZER_CONFIG.blueHue}, ${VISUALIZER_CONFIG.saturation}, ${VISUALIZER_CONFIG.lightness})`;
        visualizer.appendChild(bar);
        visualizerBars.push(bar);
    }
    
    // Start animation loop
    animateVisualizer();
}


function animateVisualizer(analyzer) {
    if (!analyzer) return;
    
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
        animationFrameId = requestAnimationFrame(draw);
        
        // Get frequency data
        analyzer.getByteFrequencyData(dataArray);
        
        // Update bars based on audio data
        for (let i = 0; i < visualizerBars.length; i++) {
            // Scale the data to fit your visualizer
            const value = dataArray[i % bufferLength];
            const height = (value / 255) * (VISUALIZER_CONFIG.maxHeight - VISUALIZER_CONFIG.minHeight) + VISUALIZER_CONFIG.minHeight;
            
            visualizerBars[i].style.height = `${height}%`;
        }
    };
    
    draw();
}

// Live transcription controls
const startBtn = document.getElementById('startListening');
const stopBtn = document.getElementById('stopListening');
const liveStatus = document.getElementById('liveStatus');

startBtn.addEventListener('click', async () => {
    try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        liveStatus.classList.add('active');
        
        // Set up audio context and analyzer
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyzer = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        // Connect microphone to analyzer
        microphone.connect(analyzer);
        analyzer.fftSize = 256; // This determines the number of frequency bins
        
        // Start visualization with real audio data
        setupVisualizer();
        animateVisualizer(analyzer); // Pass the analyzer to the animation function
        
        // Store these for cleanup
        window.currentStream = stream;
        window.audioContext = audioContext;
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please ensure you have granted permission.');
    }
}); 

stopBtn.addEventListener('click', () => {
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    liveStatus.classList.remove('active');

    // Stop animation loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Stop all audio tracks from mic
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }

    // Close audio context
    if (window.audioContext) {
        window.audioContext.close().then(() => {
            window.audioContext = null;
        });
    }

    // Reset visualizer bars to 0% height
    visualizerBars.forEach(bar => {
        bar.style.transition = 'none';
        bar.style.height = '0%';
    });

    // Re-apply transitions after resetting
    setTimeout(() => {
        visualizerBars.forEach(bar => {
            bar.style.transition = 'height 0.1s ease-out';
        });
    }, 10); // 👈 THIS was missing: closing the setTimeout block
});

     
// File upload handling
const fileInput = document.getElementById('audioUpload');
const uploadBtn = document.getElementById('uploadButton');
const uploadStatus = document.getElementById('uploadStatus');

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        uploadBtn.disabled = false;
    } else {
        uploadBtn.disabled = true;
    }
});

uploadBtn.addEventListener('click', () => {
    if (fileInput.files.length > 0) {
        uploadStatus.classList.add('active');
        uploadBtn.disabled = true;

        // Simulate upload and processing delay
        setTimeout(() => {
            // In a real app: Process the uploaded file
            document.getElementById('transcriptionOutput').textContent =
                "This is a simulation of transcribed text from an uploaded audio file. In a real application, this would show the actual transcription results from the audio processing.";

            uploadStatus.classList.remove('active');
            uploadBtn.disabled = false;
        }, 3000);
    }
});

// Copy and download buttons
document.getElementById('copyText').addEventListener('click', () => {
    const text = document.getElementById('transcriptionOutput').textContent;
    navigator.clipboard.writeText(text)
        .then(() => alert('Text copied to clipboard!'))
        .catch(err => console.error('Could not copy text: ', err));
});

document.getElementById('downloadText').addEventListener('click', () => {
    const text = document.getElementById('transcriptionOutput').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});