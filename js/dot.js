class Dot {
  constructor(
    name,
    image_x,
    image_y,
    world_z,
    image_width,
    image_height,
    shape,
  ) {
    this.name = name;
    this.image_width = image_width;
    this.image_height = image_height;
    this.image_x = image_x;
    this.image_y = image_y;
    this.world_z = world_z;
    this.shape = shape;
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
