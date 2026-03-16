class BowedStringWorklet extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "L",
        defaultValue: 0,
        minValue: 0,
        maxValue,
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

  constructor() {
    super();
    this.maxDelayInSamples = 48000;
    this.loopDelays = [
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0)
    ];
    this.loopPointers = [0,0,0,0];
    this.biquadDelays = [
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0),
      new Array(this.maxDelayInSamples).fill(0)
    ];
    this.biquadPointers = [0,0,0,0];
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    output.foreach((channel) => {
      // calculations go here
    });
    return true;
  }
}

function delay(inputChannel){
    for(let i = 0; i++ )
}

registerProcessor("bowed-string-worklet", BowedStringWorklet);
