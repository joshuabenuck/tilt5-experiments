class World {
  constructor() {
    this.paths = {};
    this.diagrams = {};
  }

  add(demo) {
    let colors = [
      0x3df3df,
      0x73d73d,
    ];
    let index = Object.keys(this.paths).length % colors.length;
    console.log({ index, colors, color: colors[index] });
    let path = new Path(this, demo, colors[index]);
    this.paths[demo] = path;
    return path;
  }

  packets() {
    let packets = [];
    for (let path of this.paths.values()) {
      for (let packet of path.packets) {
        packets.push(packet);
      }
    }
  }
}
