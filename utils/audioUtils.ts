/**
 * Decodes a Base64 string into an ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts raw PCM data (16-bit, little-endian) to an AudioContext AudioBuffer.
 * Gemini TTS default is 24kHz.
 */
export async function pcmToAudioBuffer(
  base64Pcm: string, 
  audioContext: AudioContext, 
  sampleRate: number = 24000
): Promise<AudioBuffer> {
  const arrayBuffer = base64ToArrayBuffer(base64Pcm);
  const dataView = new DataView(arrayBuffer);
  const numSamples = arrayBuffer.byteLength / 2; // 16-bit = 2 bytes
  const float32Data = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    // Convert Int16 to Float32 (-1.0 to 1.0)
    const int16 = dataView.getInt16(i * 2, true); // true = little-endian
    float32Data[i] = int16 / 32768.0;
  }

  const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
  audioBuffer.copyToChannel(float32Data, 0);
  return audioBuffer;
}

/**
 * Creates a WAV file Blob from an AudioBuffer.
 * Useful for downloading the generated audio.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this example)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true); // write 16-bit sample
      offset += 2;
    }
    pos++;
  }

  // Helper functions
  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
}

/**
 * Converts an AudioBuffer to an MP3 Blob using lamejs.
 */
export function audioBufferToMp3(buffer: AudioBuffer): Blob {
  // @ts-ignore
  const lib = window.lamejs;
  if (!lib) {
    console.error("lamejs not loaded");
    // Fallback to WAV if lamejs is missing for some reason
    return audioBufferToWav(buffer);
  }

  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const mp3Encoder = new lib.Mp3Encoder(channels, sampleRate, 128); // 128kbps

  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : undefined;
  
  const sampleBlockSize = 1152;
  const mp3Data = [];

  // Convert Float32 to Int16
  const convertBuffer = (array: Float32Array) => {
      const res = new Int16Array(array.length);
      for (let i = 0; i < array.length; i++) {
          // Clamp and scale
          let s = Math.max(-1, Math.min(1, array[i]));
          res[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return res;
  };

  const leftInt16 = convertBuffer(left);
  const rightInt16 = right ? convertBuffer(right) : undefined;

  for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      let mp3buf;
      if (channels === 1) {
          mp3buf = mp3Encoder.encodeBuffer(leftChunk);
      } else {
          // @ts-ignore
          const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
          mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      }
      if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
      }
  }
  
  const mp3buf = mp3Encoder.flush();
  if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}