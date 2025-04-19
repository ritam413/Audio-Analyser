// ========== TAB SWITCHING ==========
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

let analyzer = null;
let microphone = null;
let audioContext = null;
let waveAnimationId = null;
let fakeWaveOffset = 0;
let isFakeWave = false;


// ========== DRAW REAL WAVEFORM ==========
function drawLiveWaveform(analyzer) {
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyzer.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        waveAnimationId = requestAnimationFrame(draw);
        analyzer.getByteTimeDomainData(dataArray);
        const firstTen = Array.from(dataArray.slice(0, 10));
        console.log("Mic data:", firstTen);
        
        // Check if it's just flatline (128 = silence)
        const isSilent = firstTen.every(v => v === 128);
        if (isSilent) {
            liveStatus.classList.add('no-sound');
        } else {
            liveStatus.classList.remove('no-sound');
        }
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#4da8ff';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();
    }

    draw();
}

// ========== DRAW FAKE SINE WAVEFORM ==========
function drawFakeWaveform() {
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const waveLength = 100;
    const amplitude = 20;
    const speed = 0.05;
    const frequency = 0.1;

    isFakeWave = true;

    function draw() {
        if (!isFakeWave) return; // Prevent if cancelled
        waveAnimationId = requestAnimationFrame(draw);

        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#999';
        ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const y = height / 2 + Math.sin((x + fakeWaveOffset) * frequency) * amplitude;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
        fakeWaveOffset += speed * 10;
    }

    draw();
}

// ========== STOP ANY WAVEFORM ==========
function stopWaveform() {
    if (waveAnimationId) {
        cancelAnimationFrame(waveAnimationId);
        waveAnimationId = null;
    }
    isFakeWave = false;

    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}



// ========== RECORDING ==========
const startBtn = document.getElementById('startListening');
const stopBtn = document.getElementById('stopListening');
const liveStatus = document.getElementById('liveStatus');

startBtn.addEventListener('click', async () => {
    try {
        stopWaveform(); // stop any fake wave

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        liveStatus.classList.add('active');

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyzer = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        microphone.connect(analyzer);
        analyzer.fftSize = 256;

        window.currentStream = stream;

        drawLiveWaveform(analyzer);
    } catch (err) {
        console.error('Microphone access denied or failed:', err);
        alert('Please allow microphone access.');
    }
});

stopBtn.addEventListener('click', () => {
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    liveStatus.classList.remove('active');

    stopWaveform();

    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }

    if (audioContext) {
        audioContext.close().then(() => {
            audioContext = null;
        });
    }

    analyzer = null;
    microphone = null;
});
// ========== DEFAULT SINE WAVE ON LOAD ==========
window.addEventListener('load', () => {
    drawFakeWaveform();
});

// ========== FILE UPLOAD HANDLING ==========
const fileInput = document.getElementById('audioUpload');
const uploadBtn = document.getElementById('uploadButton');
const uploadStatus = document.getElementById('uploadStatus');

fileInput.addEventListener('change', () => {
    uploadBtn.disabled = fileInput.files.length === 0;
});

uploadBtn.addEventListener('click', () => {
    if (fileInput.files.length > 0) {
        uploadStatus.classList.add('active');
        uploadBtn.disabled = true;

        setTimeout(() => {
            document.getElementById('transcriptionOutput').textContent =
                "This is a simulation of transcribed text from an uploaded audio file.";

            uploadStatus.classList.remove('active');
            uploadBtn.disabled = false;
        }, 3000);
    }
});

// ========== COPY AND DOWNLOAD ==========
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
