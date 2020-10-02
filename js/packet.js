class Packet {
  constructor(sphere, dots, speed) {
    this.sphere = sphere;
    this.dots = dots;
    this.index = 0;
    this.start = new Date().getTime();
    // time to go from one dot to the next
    this.speed = 1;
    if (speed) {
      this.speed = speed;
    }
  }

  tick() {
    this.now = new Date().getTime();
    this.time = this.now - this.start;
    this.time *= 0.001; // convert time to seconds
    // time to make a full trip
    let trip = this.speed * this.dots.length - 1;
    // percentage of time to the next dot
    let p = this.speed - this.time % this.speed;
    // percentage of time to the end of the trip
    let tp = this.time % trip;
    this.index = Math.trunc(tp);

    this.x3 = this.p1.world_x * p + this.p2.world_x * (1 - p);
    this.y3 = this.p1.world_y * p + this.p2.world_y * (1 - p);
    this.z3 = this.p1.world_z * p + this.p2.world_z * (1 - p);
    this.sphere.position.x = this.x3;
    this.sphere.position.y = this.y3;
    this.sphere.position.z = this.z3;
  }

  get p1() {
    return this.dots[this.index];
  }

  get p2() {
    return this.dots[this.index + 1];
  }

  next() {
    this.index += 1;
    if (this.index == this.dots.length - 1) {
      this.index = 0;
    }
  }
}
