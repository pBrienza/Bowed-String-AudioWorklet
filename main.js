import { MusicTools } from "./MusicTools.js";

let ctx = null;

document.querySelector("#startAudio").addEventListener("click", () => {
  if (ctx == null) {
    // Only runs if audio context has not been initialized
    main();
  } else {
    ctx.resume();
  }
});
function main() {
  ctx = new AudioContext();
}
