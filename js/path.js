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
    let packet = new Packet(
      sphere(first.world_x, first.world_y, first.world_z),
      this.dots,
      speed,
    );
    this.packets.push(packet);
    return packet;
  }

  connect(from, to, create_packet) {
    let x_comp = Math.pow((to.world_x - from.world_x), 2);
    let y_comp = Math.pow((to.world_y - from.world_y), 2);
    let z_comp = Math.pow((to.world_z - from.world_z), 2);
    let distance = Math.sqrt(x_comp + y_comp + z_comp);
    let transforms = [
      new THREE.Matrix4().lookAt(
        new THREE.Vector3(from.world_x, from.world_y, from.world_z),
        new THREE.Vector3(
          to.world_x,
          to.world_y,
          to.world_z,
        ),
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
      from.world_x,
      from.world_y,
      from.world_z,
      this.color,
    );
    if (create_packet) {
    }
  }
}
