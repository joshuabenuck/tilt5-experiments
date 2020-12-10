function image_to_world(x, y, width, height) {
  let w = width / 200 / 2 - (x / 200);
  let h = -height / 200 / 2 + (y / 200);
  return [-w, -h];
}

function sphere(wp, color) {
  let sphereGeometry = new THREE.SphereGeometry(0.06, 32, 32);
  var material = new THREE.MeshPhongMaterial({ color, emissive: 0x072534, flatShading: false });
  var sphere = new THREE.Mesh(sphereGeometry, material);
  scene.add(sphere);
  sphere.position.x = wp.x;
  sphere.position.y = wp.y;
  sphere.position.z = wp.z;
  return sphere;
}

function cube(wp) {
  var cube_geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  var cube = new THREE.Mesh(cube_geometry, material);
  scene.add(cube);
  cube.position.x = wp.x;
  cube.position.y = wp.y;
  cube.position.z = wp.z;
}

function cylinder(length, transform, pos, color) {
  var geometry = new THREE.CylinderGeometry(0.02, 0.02, length, 32);
  geometry.applyMatrix4(transform);
  var material = new THREE.MeshBasicMaterial({ color });
  var cyl = new THREE.Mesh(geometry, material);
  cyl.position.x = pos.x;
  cyl.position.y = pos.y;
  cyl.position.z = pos.z;
  // cylinder.lookAt(new THREE.Vector3(world_x2, world_y2, world_z2));
  scene.add(cyl);
  return cyl;
}
