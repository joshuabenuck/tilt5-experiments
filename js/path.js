class Path {
  constructor(color) {
    this.packets = [];
    this.dots = [];
    this.diagrams = [];
    this.diagram_idx = 0;
    this.color = color;
  }

  add_dot(dot) {
    if (this.diagrams[this.diagram_idx] != dot.diagram) {
      this.diagrams.push(dot.diagram);
      this.diagram_idx += 1;
    }
    this.dots.push(dot);
  }

  create_packet(speed, color) {
    if (!speed) {
      speed = 1.0;
    }
    let first = this.dots[0];
    let pos = first.shape.position.clone().add(first.shape.parent.position);
    let packet = new Packet(
      sphere(pos, color),
      this.dots,
      speed
    );
    this.packets.push(packet);
    return packet;
  }

  connect(from, to, create_packet) {
    let from_pos = from.shape.parent.localToWorld(from.shape.position.clone());
    let to_pos = to.shape.parent.localToWorld(to.shape.position.clone());
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
