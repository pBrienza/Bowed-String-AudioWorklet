class BowedStringWorklet extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "L",
        defaultValue: 0,
        minValue: 0,
        maxValue: 48000,
      },
      {
        name: "velocity",
        defaultValue: 0,
        minValue: -1,
        maxValue: 1,
      },
      {
        name: "pressure",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
      },
    ];
  }

  // Four banks of filters:
  // One for the modeling loop, one for the biquad bridge filter, one for the biquad body filter
  constructor() {
    super();
    this.sampleRate = 48000;
    this.maxDelayInSamples = this.sampleRate / 20; // limit at 20hz max for testing
    this.stringDelays = [
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
    ];
    this.stringPointers = [0, 0, 0, 0];
    this.bridgeDelays = [
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
    ];
    this.bridgePointers = [0, 0, 0, 0];
    this.bridgeDelays = [
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
    ];
    this.bridgePointers = [0, 0, 0, 0];
    this.bodyDelays = [
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
    ];
    this.bodyPointers = [0, 0, 0, 0];

    // LUT bow table
    this.bowTable = new Array(this.sampleRate).fill(0);
    // store pressure value to check if there has been change and the bowtable needs recalculated
    this.lastPressure = 0;

    this.maxVc = 0.4;
    this.tableSlope = 4;

    this.writeIndex = 0;

    // Node value preallocation
    this.center = 0;
    this.stringState = 0;
    this.nodes = new Float32Array(4).fill(0);
    this.bridge = 0;
    this.body = 0;

    // biquad coeeficients
    this.bodyCoeff = [0.063615, 0, -0.063615, -1.766843, 0.771412];
    this.bridgeCoeff = [0.010295, 0, -0.010295, -1.973336, 0.973687];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    output.forEach((channel) => {
      // const inputChannel = input[channel];
      // const outputChannel = output[channel];

      for (let i = 0; i < input.length; i++) {
        // calculations go here

        // Get parameter values
        const pressure =
          parameters["pressure"].length > 1
            ? parameters["pressure"][i]
            : parameters["pressure"][0];

        const velocity =
          parameters["velocity"].length > 1
            ? parameters["velocity"][i]
            : parameters["velocity"][0];

        const L =
          parameters["L"].length > 1 ? parameters["L"][i] : parameters["L"][0];

        const readIndex = this.writeIndex - L;
        if (readIndex < 0) readIndex += this.maxDelayInSamples;

        // Check if pressure has changed since last sample. Recalculate bowtable if so.
        if (this.lastPressure != pressure) {
          createBowTable(this.bowTable, this.maxVc, pressure, this.tableSlope);
        }
        this.lastPressure = pressure;

        // Center
        this.stringState =
          velocity -
          this.stringDelays[3][readIndex] -
          this.stringDelays[1][readIndex];
        this.center = this.bowTable[stringState] * stringState;

        // Node 0

        this.nodes[0] = this.stringDelays[3][readIndex] + this.center;

        // Bridge

        this.bridge = processBiquad(
          this.bridgeDelays,
          this.stringDelays[0][readIndex],
        );

        // Node 1

        this.nodes[1] = this.bridge;

        // Node 2

        this.nodes[2] = this.stringDelays[1][readIndex] + this.center;

        // Node 3

        this.nodes[3] = -1 * this.stringDelays[2][readIndex];

        // Body [OUTPUT]

        this.body = processBiquad(this.bodyDelays, this.node0);
        channel[i] = this.body;

        // Cycle Buffers

        for (let j = 0; j < this.stringDelays.length; j++) {
          this.stringDelays[j][this.writeIndex] = this.nodes[j];
        }

        // Increment writeIndex

        this.writeIndex = (this.writeIndex + 1) % this.maxDelayInSamples;
      }
    });
    return true;
  }
}

function delay(inputChannel) {}

/**
 *
 * @param {Array} bowTable Array of size sampleRate
 * @param {number} maxVc maximum catch velocity (0-1)
 * @param {number} pressure pressure applied to bow (0-1)
 * @param {number} slope slope of the bow table ends (for now, will likely be changed to be reactive)
 * @returns
 */
function createBowTable(bowTable, maxVc, pressure, slope) {
  const Vc = maxVc * ((Math.log10(pressure) + 2) / 2);
  Vc = Math.max(Vc, 0); // clamped >= 0
  const b = p + slope * Vc; // offset for slope lines

  for (i = 0; i < bowTable.length; i++) {
    const x = (2 * i) / bowTable.length - 1;
    if (x <= -Vc) {
      // left slop (clamped >= 0)
      bowTable[i] = Math.max(-slope * x + b, 0);
    } else if (x < Vc) {
      // reflection segment
      bowTable[i] = pressure;
    } else {
      // right slope (clamped >= 0)
      bowTable[i] = Math.max(slope * x + b, 0);
    }
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
    buffers[0][0] * coeffs[1] +
    buffers[1][0] * coeffs[2] -
    buffers[2][0] * coeffs[2] -
    buffers[3][0] * coeffs[3];
  // cylce buffers
  buffers[0][1] = 0;
  buffers[1][1] = buffers[0][0];
  buffers[2][1] = output;
  buffers[3][1] = buffers[2][0];

  return output;
}

registerProcessor("BowedStringWorklet", BowedStringWorklet);
