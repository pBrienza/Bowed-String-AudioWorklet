import { MusicTools } from "./MusicTools.js";
import { BowADSR } from "./BowADSR.js";

let ctx = null;

document.querySelector("#startAudio").addEventListener("click", () => {
  if (ctx == null) {
    // Only runs if audio context has not been initialized
    main();
  } else {
    ctx.resume();
  }
});
async function main() {
  ctx = new AudioContext();
  const masterFader = new GainNode(ctx, { gain: 0 });
  masterFader.connect(ctx.destination);

  await ctx.audioWorklet.addModule("BowedStringWorklet.js");

  const bowFilter = new AudioWorkletNode(ctx, "BowedStringWorklet");
  bowFilter.connect(masterFader);

  const rmsMeter = new AnalyserNode(ctx, { fftSize: 1024 });
  //bowFilter.connect(rmsMeter);
  masterFader.connect(rmsMeter);

  // const testSig = new OscillatorNode(ctx, { frequency: 440 });
  // testSig.connect(masterFader);
  // testSig.start();

  const a = 100 / 1000;
  const d = 15 / 1000;
  const s = 1;
  const r = 0.2;

  let velocity = 0.4;
  let pressure = 1;

  const bowADSR = new BowADSR(ctx, bowFilter, a, d, s, r);

  const noise = MusicTools.createNoiseBuffer(ctx);
  noise.connect(bowADSR.parameters, 0, 1);
  noise.start();

  //bowADSR.connectParametersToFilter(bowFilter);

  // Listeners

  document.querySelector("#masterFader").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    const gain = MusicTools.db2a(value);
    masterFader.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.1);
    document.querySelector("#masterFaderLabel").innerText = `${value} dbfs`;
  });
  document.querySelector("#trigger").addEventListener("click", () => {
    bowADSR.trigger(velocity, pressure, true);
  });
  document.querySelector("#release").addEventListener("click", () => {
    bowADSR.release();
  });
  document.querySelector("#delaySlider").addEventListener("input", (e) => {
    const value = parseInt(e.target.value);
    bowADSR.setDelay(value, 0.01);
    document.querySelector("#delayLabel").innerText = `Delay: ${value}`;
  });
  document.querySelector("#vSlider").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    velocity = value;
    document.querySelector("#vLabel").innerText = `Max Velocity: ${value}`;
  });
  document.querySelector("#pSlider").addEventListener("input", (e) => {
    const value = parseFloat(e.target.value);
    pressure = value;
    document.querySelector("#pLabel").innerText = `Max Pressure: ${value}`;
  });

  // Output Monitoring

  let rms = 0;
  const infoDisplay = document.querySelector("#info");

  let rmsBuffer = new Float32Array(10).fill(0);
  let rmsCount = 0;

  setInterval(() => {
    const fftInfo = new Float32Array(1024);
    rmsMeter.getFloatTimeDomainData(fftInfo);
    rms = MusicTools.rms(fftInfo);
    //running average for rms meter
    rmsBuffer[rmsCount] = rms;
    rmsCount = rmsCount < rmsBuffer.length - 1 ? rmsCount + 1 : 0;
    let avg = 0;
    for (let i = 0; i < rmsBuffer.length; i++) {
      avg += rmsBuffer[i];
    }
    avg = avg / rmsBuffer.length;
    //console.log(avg);

    //rms = MusicTools.rms(rmsMeter.)
    const info = `Pressure: ${bowADSR.getPressure().toFixed(2)} || Velocity: ${bowADSR.getVelocity().toFixed(2)} || RMS: ${MusicTools.a2db(avg).toFixed(3)} || Raw Amp: ${fftInfo[0].toFixed(2)}`;
    infoDisplay.innerText = info;
  }, 10);
}
