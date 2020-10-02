class Diagram {
  constructor(z, path) {
    this.z = z;
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
    window.textures.push(texture);
    scene.add(this.plane);
    this.plane.position.z = this.z - 0.1;
  }

  add(name, x, y) {
    let sphereGeometry = new THREE.SphereGeometry(0.04, 32, 32);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var sphere = new THREE.Mesh(sphereGeometry, material);
    scene.add(sphere);
    let [wx, wy] = image_to_world(x, y, this.width, this.height);
    sphere.position.x = wx;
    sphere.position.y = wy;
    sphere.position.z = this.z;
    this.dots[name] = new Dot(
      name,
      x,
      y,
      this.z,
      this.width,
      this.height,
      cube,
    );
    return this.dots[name];
  }

  centerOn(name) {
    let [x, y, _c] = this.dots[name];
    let [plane_x, plane_y] = image_to_world(x, y, this.width, this.height);
    this.plane.position.x = -plane_x;
    this.plane.position.y = -plane_y;
  }
}
