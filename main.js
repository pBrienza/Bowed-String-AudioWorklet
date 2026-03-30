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
  masterFader.connect(rmsMeter);

  const a = 100 / 1000;
  const d = 15 / 1000;
  const s = 1;
  const r = 0.2;

  let velocity = 0.3;
  let pressure = 1;

  const bowADSR = new BowADSR(ctx, bowFilter, a, d, s, r);

  bowADSR.connectPressure(bowFilter.parameters.get("pressure"));
  bowADSR.connectVelocity(bowFilter.parameters.get("velocity"));

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

  let rms = 0;
  const infoDisplay = document.querySelector("#info");

  setInterval(() => {
    const fftInfo = new Float32Array();
    rmsMeter.getFloatFrequencyData(fftInfo);
    let sum = 0;
    for (let i = 0; i < fftInfo.size; i++) {
      sum += fftInfo[i];
    }
    rms = MusicTools.rms(sum);
    //rms = MusicTools.rms(rmsMeter.)
    const info = `Pressure: ${bowADSR.getPressure()} || Velocity: ${bowADSR.getVelocity()} || RMS: ${rms}`;
    infoDisplay.innerText = info;
    console.log(sum);
  }, 10);
}
