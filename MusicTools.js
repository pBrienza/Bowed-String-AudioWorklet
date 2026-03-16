/**
 * Common math tools for music stuff.
 * @module MusicTools
 */

class MusicTools {
  /**
   * Deciblse to Linear Amplitude
   * @param {number} db - decibles full scale
   * @returns {number} linear amplitude
   */
  static db2a(db) {
    return 10 ** (db / 20);
  }

  /**
   * Linear Amplitude to Decibels Full Scale
   * @param {number} a - Linear amplitude
   * @returns {number} Decibels full scale
   */
  static a2db(a) {
    return 20 * Math.log10(a);
  }

  /**
   *
   * @param {number} m - midi value (0-127)
   * @returns {number} Frquency in Hz
   */
  static m2f(m) {
    return 440 * 2 ** ((m - 69) / 12);
  }
  /**
   *
   * @param {number} f - Frequency in Hz
   * @returns {number} Midi value (int 0-127)
   */
  static f2m(f) {
    return Math.log2(f / 440) * 12 + 69;
  }

  static expScale(inMin, inMax, outMin, outMax, exp) {}
  static linScale(inMin, inMax, outMin, outMax) {}

  static samps2ms(samps, sampleRate) {
    return samps / sampleRate;
  }

  static ms2samps(ms, sampleRate) {
    return ms * sampleRate;
  }

  static rms(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return Math.sqrt(sum ** 2 / data.length);
  }

  static createNoiseEnvelope(audioCtx, attackTime, releaseTime) {
    return new NoiseEnvelope(audioCtx, attackTime, releaseTime);
  }

  static createImpulseTrain(audioCtx, gapLength) {
    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    // Store impulses with gapLength spaces in between
    let counter = 0;
    for (let i = 0; i < bufferSize; i++) {
      if (counter == 0) {
        output[i] = 1;
      } else {
        output[i] = 0;
      }

      counter++;
      if (counter > gapLength) {
        counter = 0;
      }
    }

    const impulseTrain = audioCtx.createBufferSource();
    impulseTrain.buffer = buffer;
    impulseTrain.loop = true;
    //impulseTrain.start();
    return impulseTrain;
  }

  static createNoiseBuffer(ctx) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;
    return whiteNoise;
  }
}

class NoiseEnvelope {
  constructor(audioCtx, attackTime, releaseTime) {
    this.ctx = audioCtx;
    this.noise = createWhiteNoise(audioCtx);
    this.gainNode = new GainNode(audioCtx);
    this.attackTime = attackTime;
    this.releaseTime = releaseTime;

    this.gainNode.gain.value = 0.0;
    this.noise.connect(this.gainNode);
    this.noise.start();
  }

  trigger() {
    this.gainNode.gain.linearRampToValueAtTime(
      1.0,
      this.ctx.currentTime + this.attackTime,
    );
    this.gainNode.gain.linearRampToValueAtTime(
      0.0,
      this.ctx.currentTime + this.attackTime + this.releaseTime,
    );
  }

  connectOutput(output) {
    this.gainNode.connect(output);
  }
}

// White noise generator from: https://dev.to/hexshift/how-to-create-procedural-audio-effects-in-javascript-with-web-audio-api-199e
function createWhiteNoise(ctx) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = buffer;
  whiteNoise.loop = true;
  return whiteNoise;
}

export { MusicTools };
