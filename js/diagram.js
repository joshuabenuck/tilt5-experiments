class Diagram {
  constructor(offsets, path) {
    this.world_offsets = offsets;
    this.offsets = {};
    this.path = path;
    this.dots = {};
  }

  async render() {
    let loader = new THREE.TextureLoader();
    let promise = new Promise(
      (resolve, reject) => {
        loader.load(this.path, (texture) => {
          resolve(texture);
        });
      },
    );
    let texture = await promise;
    this.width = texture.image.width;
    this.height = texture.image.height;
    let plane_material = new THREE.MeshBasicMaterial(
      { map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.5 },
    );
    var plane_geometry = new THREE.PlaneGeometry(
      this.width / 200,
      this.height / 200,
    );
    this.plane = new THREE.Mesh(plane_geometry, plane_material);
    this.plane.userData.diagram = this;
    scene.add(this.plane);
    var edges = new THREE.EdgesGeometry(plane_geometry);
    this.outline = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial(
        { color: 0x77ff77, transparent: true, opacity: 0.0 },
      ),
    );
    scene.add(this.outline);
    this.offsets.x = 0.0;
    if (this.world_offsets.x != undefined) {
      this.offsets.x = this.world_offsets.x + this.width / 200 / 2;
      this.plane.position.x = this.offsets.x;
      this.outline.position.x = this.offsets.x;
    }
    this.offsets.z = 0.0;
    if (this.world_offsets.z) {
      this.offsets.z = this.world_offsets.z - 0.1;
      this.plane.position.z = this.offsets.z;
      this.outline.position.z = this.offsets.z;
    }
  }

  add_dot(name, x, y) {
    this.dots[name] = new Dot(
      name,
      x,
      y,
      this.offsets,
      this.width,
      this.height,
    );
    return this.dots[name];
  }

  select() {
    this.plane.material.opacity = 1.0;
  }

  hover() {
    this.outline.material.opacity = 1.0;
  }

  unhover() {
    this.outline.material.opacity = 0.0;
  }

  deselect() {
    this.plane.material.opacity = 0.5;
  }

  centerOn(name) {
    let [x, y, _c] = this.dots[name];
    let [plane_x, plane_y] = image_to_world(x, y, this.width, this.height);
    this.plane.position.x = -plane_x;
    this.plane.position.y = -plane_y;
  }
}
