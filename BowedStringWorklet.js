class BowedStringWorklet extends AudioWorkletProcessor {
  // static get parameterDescriptors() {
  //   return [
  //     {
  //       name: "L",
  //       defaultValue: 0,
  //       minValue: 0,
  //       maxValue: 48000,
  //     },
  //     {
  //       name: "velocity",
  //       defaultValue: 0,
  //       minValue: -1,
  //       maxValue: 1,
  //     },
  //     {
  //       name: "pressure",
  //       defaultValue: 0,
  //       minValue: 0,
  //       maxValue: 1,
  //     },
  //   ];
  // }

  // Four banks of filters:
  // One for the modeling loop, one for the biquad bridge filter, one for the biquad body filter
  constructor() {
    super();
    this.sampleRate = 100;
    this.maxDelayInSamples = this.sampleRate / 20; // limit at 20hz max for testing
    this.stringDelays = [
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
    ];
    this.stringPointers = [0, 0, 0, 0];
    this.bridgeDelays = new Float32Array(4).fill(0);
    this.bodyDelays = new Float32Array(4).fill(0);

    // LUT bow table
    this.maxVc = 0.5;
    this.tableSlope = -4;
    this.pressureDepth = 10;

    this.bowTable = new Array(this.pressureDepth);
    for (let i = 0; i < this.pressureDepth; i++) {
      this.bowTable[i] = new Float32Array(this.sampleRate).fill(0);
    }
    createBowTable(this.bowTable, this.maxVc, this.tableSlope);
    // store pressure value to check if there has been change and the bowtable needs recalculated

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

    for (let channel = 0; channel < output.length; channel++) {
      // const inputChannel = input[channel];
      // const outputChannel = output[channel];

      for (let samp = 0; samp < input.length; samp++) {
        const pressure = input[0][samp];
        const velocity = input[1][samp];
        const delay = parseInt(input[2][samp]);
        //output[channel][samp] = delay;
        // calculations go here

        // Get parameter values

        // const pressure =
        //   parameters["pressure"].length > 1
        //     ? parameters["pressure"][i]
        //     : parameters["pressure"][0];

        // const velocity =
        //   parameters["velocity"].length > 1
        //     ? parameters["velocity"][i]
        //     : parameters["velocity"][0];

        // const L =
        //   parameters["L"].length > 1
        //     ? parameters["L"][samp]
        //     : parameters["L"][0];

        var readIndex = this.writeIndex - delay;
        if (readIndex < 0) readIndex += this.maxDelayInSamples;

        // DEPRECATED: Check if pressure has changed since last sample. Recalculate bowtable if so.
        // if (this.lastPressure != pressure) {
        //   createBowTable(this.bowTable, this.maxVc, pressure, this.tableSlope);
        // }
        // this.lastPressure = pressure;

        // BIQUAD TEST

        const noiseTestSig = Math.random() * 2 - 1;

        output[channel][samp] = noiseTestSig;

        // output[channel][samp] = processBiquad(
        //   this.bodyDelays,
        //   noiseTestSig,
        //   this.bodyCoeff,
        // );

        /** 
        // Center
        this.stringState =
          velocity -
          this.stringDelays[3][readIndex] -
          this.stringDelays[1][readIndex];
        
        this.center =
          getValueFromBowTable(this.bowTable, pressure, this.stringState) *
          this.stringState;

        // Node 0

        this.nodes[0] = this.stringDelays[3][readIndex] + this.center;

        // Bridge

        this.bridge = processBiquad(
          this.bridgeDelays,
          this.stringDelays[0][readIndex],
          this.bridgeCoeff,
        );

        // Node 1

        this.nodes[1] = this.bridge;

        // Node 2

        this.nodes[2] = this.stringDelays[1][readIndex] + this.center;

        // Node 3

        this.nodes[3] = -1 * this.stringDelays[2][readIndex];

        // Body [OUTPUT]

        this.body = processBiquad(this.bodyDelays, this.node0, this.bodyCoeff);
        //output[channel][samp] = this.body;

        // Cycle Buffers

        for (let j = 0; j < this.stringDelays.length; j++) {
          this.stringDelays[j][this.writeIndex] = this.nodes[j];
        }

        // Increment writeIndex

        this.writeIndex = (this.writeIndex + 1) % this.maxDelayInSamples;*/
      }
    }
    return true;
  }
}

function delay(inputChannel) {}

/**
 *
 * @param {Array} bowTable 2D Array of size [pressureDepth][sampleRate]
 * @param {number} maxVc maximum catch velocity (0-1)
 * @param {number} slope slope of the bow table ends (for now, will likely be changed to be reactive)
 * @returns 2d float32 array [pressure][velocity]
 */
function createBowTable(bowTable, maxVc, slope) {
  for (let pressure = 0; pressure < bowTable.length; pressure++) {
    const p = pressure / bowTable.length;
    let Vc = maxVc * ((Math.log10(p) + 2) / 2);
    Vc = Math.max(Vc, 0); // clamped >= 0
    const b = p - slope * Vc; // offset for slope lines

    for (let i = 0; i < bowTable[pressure].length; i++) {
      //console.log(p);
      const x = (2 * i) / bowTable[pressure].length - 1;
      if (x <= -Vc) {
        // left slop (clamped >= 0)
        bowTable[pressure][i] = Math.max(-slope * x + b, 0);
      } else if (x < Vc) {
        // reflection segment
        bowTable[pressure][i] = p;
      } else {
        // right slope (clamped >= 0)
        bowTable[pressure][i] = Math.max(slope * x + b, 0);
      }
    }
  }
}

function getValueFromBowTable(bowTable, pressure, velocity) {
  const pressureIndex = parseInt(
    Math.min(Math.max(pressure * bowTable.length, 0), 1),
  );
  const velocityIndex = parseInt(
    Math.min(Math.max(((velocity + 1) / 2) * bowTable[0].length, 0), 1),
  );
  return bowTable[pressureIndex][velocityIndex];
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

registerProcessor("BowedStringWorklet", BowedStringWorklet);
