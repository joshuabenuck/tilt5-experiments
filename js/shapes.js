function image_to_world(x, y, width, height) {
  let w = width / 200 / 2 - (x / 200);
  let h = -height / 200 / 2 + (y / 200);
  return [-w, -h];
}

function sphere(wx, wy, wz) {
  let sphereGeometry = new THREE.SphereGeometry(0.06, 32, 32);
  var material = new THREE.MeshBasicMaterial({ color: 0x448800 });
  var sphere = new THREE.Mesh(sphereGeometry, material);
  scene.add(sphere);
  sphere.position.x = wx;
  sphere.position.y = wy;
  sphere.position.z = wz;
  return sphere;
}

function cube(wx, wy, wz) {
  var cube_geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  var cube = new THREE.Mesh(cube_geometry, material);
  scene.add(cube);
  cube.position.x = wx;
  cube.position.y = wy;
  cube.position.z = wz;
}

function cylinder(length, transform, x, y, z, color) {
  var geometry = new THREE.CylinderGeometry(0.02, 0.02, length, 32);
  geometry.applyMatrix(transform);
  var material = new THREE.MeshBasicMaterial({ color });
  var cyl = new THREE.Mesh(geometry, material);
  cyl.position.x = x;
  cyl.position.y = y;
  cyl.position.z = z;
  // cylinder.lookAt(new THREE.Vector3(world_x2, world_y2, world_z2));
  scene.add(cyl);
  return cyl;
}
