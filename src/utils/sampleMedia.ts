// Generates playable Audio WAV and SVG Image Data URIs without external network dependencies

export function generateSampleAudioWav(): string {
  // Generates a 3-second gentle melodic chime audio WAV file encoded as a data URI
  const sampleRate = 22050;
  const duration = 2.5; // seconds
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Generate pleasant arpeggio notes (C5, E5, G5, C6)
  const notes = [523.25, 659.25, 783.99, 1046.5];
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.min(Math.floor(t / 0.5), notes.length - 1);
    const freq = notes[noteIdx];
    const decay = Math.exp(-3 * (t % 0.5));
    // Sine wave
    const sample = Math.sin(2 * Math.PI * freq * t) * decay * 0.4;
    // Clamp to 16-bit PCM range
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function generateSampleImage(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4f46e5" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" rx="20" fill="url(#bg)" />
    <circle cx="300" cy="170" r="70" fill="white" opacity="0.2" />
    <path d="M260 210 L300 130 L340 210 Z" fill="white" opacity="0.9" />
    <circle cx="380" cy="120" r="18" fill="#facc15" />
    <text x="300" y="275" fill="white" font-size="24" font-family="system-ui, sans-serif" font-weight="bold" text-anchor="middle">
      Live Directory Asset Preview
    </text>
    <text x="300" y="310" fill="white" opacity="0.8" font-size="14" font-family="system-ui, sans-serif" text-anchor="middle">
      Rendered seamlessly in-app from file directory
    </text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function generateSampleVideo(): string {
  // Public domain / creative commons test video source (Big Buck Bunny short snippet)
  return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
}
