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

    let p1_pos = this.p1.shape.parent.localToWorld(this.p1.shape.position.clone());
    let p2_pos = this.p2.shape.parent.localToWorld(this.p2.shape.position.clone());
    let sphere_position = p1_pos.multiplyScalar(p).add(
      p2_pos.multiplyScalar(1 - p),
    );
    this.sphere.position.x = sphere_position.x;
    this.sphere.position.y = sphere_position.y;
    this.sphere.position.z = sphere_position.z;
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
