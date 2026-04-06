class BowedStringWorklet extends AudioWorkletProcessor {
  // Four banks of filters:
  // One for the modeling loop, one for the biquad bridge filter, one for the biquad body filter
  constructor() {
    super();
    this.sampleRate = sampleRate;
    //console.log(this.sampleRate);
    this.maxDelayInSamples = parseInt(this.sampleRate / 20); // limit at 20hz max for testing
    this.stringDelays = [
      new Float32Array(this.maxDelayInSamples).fill(0),
      new Float32Array(this.maxDelayInSamples).fill(0),
      new Float32Array(this.maxDelayInSamples).fill(0),
      new Float32Array(this.maxDelayInSamples).fill(0),
    ];
    //console.log(this.maxDelayInSamples);
    this.bridgeDelays = new Float32Array(4).fill(0);
    this.bodyDelays = new Float32Array(4).fill(0);

    // LUT bow table
    this.maxVc = 0.5;
    this.tableSlope = -2;
    this.pressureDepth = 1000;

    // this.bowTable = new Array(this.pressureDepth);
    // for (let i = 0; i < this.pressureDepth; i++) {
    //   this.bowTable[i] = new Float32Array(this.sampleRate).fill(0);
    // }
    //createBowTable(this.bowTable, this.maxVc, this.tableSlope);
    // store pressure value to check if there has been change and the bowtable needs recalculated

    // console.log(getValueFromBowTable(this.bowTable, 1.0, 0.3));
    // console.log(newBowTable(this.maxVc, this.slope, 1.0, 0.3));

    this.writeIndex = 0;
    this.readIndex = 0;

    // Value preallocation
    this.center = 0;
    this.stringState = 0;
    this.nodes = new Float32Array(4).fill(0);
    this.bridge = 0;
    this.body = 0;
    this.pressure = 0;
    this.velocity = 0;
    this.delay = 0;

    this.outputSamp = 0;

    this.outOfBoundsFlag = 0;

    // biquad coeeficients
    this.bodyCoeff = [0.063615, 0, -0.063615, -1.766843, 0.771412];
    this.bridgeCoeff = [0.010295, 0, -0.010295, -1.973336, 0.973687];

    // Testing
    console.log(newBowTable(this.maxVc, this.slope, 0, 0));
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    for (let channel = 0; channel < output.length; channel++) {
      // const inputChannel = input[channel];
      // const outputChannel = output[channel];

      for (let samp = 0; samp < input.length; samp++) {
        this.pressure = input[0][samp];
        this.velocity = input[1][samp];
        this.delay = parseInt(input[2][samp]);
        //const noiseTestSig = (Math.random() * 2 - 1) / 2;
        //const nodes = new Float32Array(4).fill(0);

        this.readIndex = this.writeIndex - this.delay;
        if (this.readIndex < 0) this.readIndex += this.maxDelayInSamples;

        // Center
        // const stringState =
        //   velocity -
        //   this.stringDelays[3][this.readIndex] -
        //   this.stringDelays[1][this.readIndex];

        // const center =
        //   newBowTable(this.maxVc, this.tableSlope, pressure, velocity) *
        //   stringState;
        // flag = test("center", center, flag);

        // nodes[0] = this.stringDelays[3][this.readIndex] + center;
        // flag = test("node0", nodes[0]);

        // // Bridge

        // const bridge = processBiquad(
        //   this.bridgeDelays,
        //   this.stringDelays[0][this.readIndex],
        //   this.bridgeCoeff,
        // );
        // flag = test("bridge", bridge);
        // // Node 1

        // nodes[1] = bridge;

        // // Node 2

        // nodes[2] = this.stringDelays[1][this.readIndex] + this.center;

        // // Node 3

        // nodes[3] = -1 * this.stringDelays[2][this.readIndex];

        // Body [OUTPUT]

        this.body = processBiquad(
          this.bodyDelays,
          this.velocity,
          this.bodyCoeff,
        );
        //output[channel][samp] = this.body;

        // Cycle Buffers

        // for (let j = 0; j < this.stringDelays.length; j++) {
        //   this.stringDelays[j][this.writeIndex] = nodes[j];
        // }

        // Increment writeIndex

        // this.writeIndex = (this.writeIndex + 1) % this.maxDelayInSamples;

        // OUTPUT - Limited to -1:1

        this.outputSamp = this.body;

        this.outputSamp = this.outputSamp > 1.0 ? 1 : this.outputSamp;
        output[channel][samp] = this.outputSamp < -1.0 ? -1 : this.outputSamp;
      }
    }
    return true;
  }
}

//reimplement bowTable as peicewise polynomial caluated per value entered, just for testing?
function newBowTable(maxVc, slope, pressure, velocity) {
  if (pressure < 0.01) {
    // console.log("pressure <= 0");
    return 0;
  }
  const Vc = Math.max(maxVc * ((Math.log10(pressure) + 2) / 2), 0);
  const b = pressure - slope * Vc;
  if (velocity <= -Vc) {
    return Math.max(-slope * velocity + b, 0);
  } else if (velocity < Vc) {
    return pressure;
  } else {
    return Math.max(slope * velocity + b, 0);
  }
}

/**
 *
 * @param {Array} buffers Array of four Float32 Arrays
 * @param {Number} input Input sample
 * @param {Float32Array} coeffs Biquad Coeffecients [a0,a1,a2,b1,b2]
 * @param {Number} readIndex
 * @param {Number} writeIndex
 */
function processBiquad(buffers, input, coeffs) {
  const output =
    input * coeffs[0] +
    buffers[0] * coeffs[1] +
    buffers[1] * coeffs[2] -
    buffers[2] * coeffs[3] -
    buffers[3] * coeffs[4];
  // cylce buffers
  buffers[3] = buffers[2];
  buffers[2] = output;
  buffers[1] = buffers[0];
  buffers[0] = input;

  return output;
}

function test(msg, num, flag) {
  if (flag == false && isNaN(num)) {
    console.log(msg);
    return true;
  } else return flag;
}

registerProcessor("BowedStringWorklet", BowedStringWorklet);
