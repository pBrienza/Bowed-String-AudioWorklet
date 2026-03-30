class BowADSR {
  constructor(audioCtx, bowFilter, a, d, s, r) {
    this.audioCtx = audioCtx;
    this.pressure = new ConstantSourceNode(audioCtx, { offset: 0 });
    this.velocity = new ConstantSourceNode(audioCtx, { offset: 0 });
    this.pressure.start();
    this.velocity.start();

    this.a = a;
    this.d = d;
    this.s = s;
    this.r = r;

    this.releaseTime = 0;

    this.isUpBow = true;
  }

  setParameters(a, d, s, r) {
    this.a = a;
    this.d = d;
    this.s = s;
    this.r = r;
  }

  connectVelocity(node) {
    this.velocity.connect(node);
  }

  connectPressure(node) {
    this.pressure.connect(node);
  }

  getPressure() {
    return this.pressure.offset.value;
  }

  getVelocity() {
    return this.velocity.offset.value;
  }

  /**
   *
   * @param {Number} velocity float -1 to 1
   * @param {Number} pressure float 0-1
   * @param {Boolean} bowChange Tells ADSR to change bow direction if true
   */
  trigger(velocity, pressure, bowChange) {
    const triggerTime = this.audioCtx.currentTime;
    const isPlaying = triggerTime < this.releaseTime || this.releaseTime < 0;

    if (bowChange) {
      this.isUpBow = !this.isUpBow;
    }

    let velo = velocity;

    if (this.isUpBow) {
      velo = -1 * velocity;
    }

    if (!this.isPlaying) {
      // Normal Trigger
      const attackTime = triggerTime + this.a;
      const decayTime = attackTime + this.d;

      this.velocity.offset.value = 0;
      this.velocity.offset.cancelScheduledValues(triggerTime);
      this.velocity.offset.linearRampToValueAtTime(velo, attackTime);
      this.velocity.offset.linearRampToValueAtTime(this.s * velo, decayTime);

      this.pressure.offset.value = 0;
      this.pressure.offset.cancelScheduledValues(triggerTime);
      this.pressure.offset.linearRampToValueAtTime(pressure, attackTime);
      this.pressure.offset.linearRampToValueAtTime(
        this.s * pressure,
        decayTime,
      );
    } else {
      // Retrigger
      const retrigCancelTime = 1 / 100;

      this.velocity.offset.cancelAndHoldAtTime(triggerTime);
      this.velocity.offset.linearRampToValueAtTime(
        velo,
        attackTime - retrigCancelTime,
      );
      this.velocity.offset.linearRampToValueAtTime(this.s * velo, decayTime);

      this.pressure.offset.cancelAndHoldAtTime(triggerTime);
      this.pressure.offset.linearRampToValueAtTime(
        pressure,
        attackTime - retrigCancelTime,
      );
      this.pressure.offset.linearRampToValueAtTime(
        this.s * pressure,
        decayTime,
      );
    }
    this.releaseTime = -1; // flag for currently playing with no scheduled release time
  }

  release() {
    const currentTime = this.audioCtx.currentTime;
    this.releaseTime = currentTime + this.r;

    this.velocity.offset.cancelScheduledValues(currentTime);
    this.velocity.offset.linearRampToValueAtTime(0, this.releaseTime);

    this.pressure.offset.cancelScheduledValues(currentTime);
    this.pressure.offset.linearRampToValueAtTime(0, this.releaseTime);
  }
}

export { BowADSR };
