class Path {
  constructor(diagram, color) {
    this.packets = [];
    this.dots = [];
    this.diagram = diagram;
    this.color = color;
  }

  create_packet(speed) {
    if (!speed) {
      speed = 1.0;
    }
    let first = this.dots[0];
    let pos = first.shape.position.clone().add(first.shape.parent.position);
    let packet = new Packet(
      sphere(pos),
      this.dots,
      speed,
    );
    this.packets.push(packet);
    return packet;
  }

  connect(from, to, create_packet) {
    let from_pos = from.shape.position.clone().add(from.shape.parent.position);
    let to_pos = to.shape.position.clone().add(to.shape.parent.position);
    let distance = to_pos.distanceTo(from_pos);
    let transforms = [
      new THREE.Matrix4().lookAt(
        from_pos,
        to_pos,
        new THREE.Vector3(0, 0, 1),
      ),
      new THREE.Matrix4().makeRotationX(Math.PI / 2),
      new THREE.Matrix4().makeTranslation(0, -distance / 2, 0),
    ];
    let transform = new THREE.Matrix4();
    for (let t of transforms) {
      transform.multiply(t);
    }
    cylinder(
      distance,
      transform,
      from_pos,
      this.color,
    );
    if (create_packet) {
    }
  }
}
