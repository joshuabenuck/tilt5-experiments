class Dot {
  constructor(
    name,
    image_x,
    image_y,
    image_width,
    image_height,
  ) {
    this.name = name;
    // this.offsets = offsets;
    // this.world_z = offsets.z;
    this.world_z = 0.0;
    this.image_width = image_width;
    this.image_height = image_height;
    this.image_x = image_x;
    this.image_y = image_y;
    let sphereGeometry = new THREE.SphereGeometry(0.04, 32, 32);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.position.x = this.world_x;
    sphere.position.y = this.world_y;
    sphere.position.z = this.world_z;
    this.shape = sphere;
  }

  set image_x(x) {
    this._image_x = x;
    this.world_x = this.image_x_to_world_x(x, this.image_width);
  }

  get image_x() {
    this._image_x;
  }

  set image_y(y) {
    this._image_y = y;
    this.world_y = this.image_y_to_world_y(y, this.image_height);
  }

  get image_y() {
    this._image_y;
  }

  image_x_to_world_x(image_x, image_width) {
    let world_x = image_width / 200 / 2 - (image_x / 200);
    return -world_x;
  }

  image_y_to_world_y(image_y, image_height) {
    let world_y = -image_height / 200 / 2 + (image_y / 200);
    return -world_y;
  }
}
