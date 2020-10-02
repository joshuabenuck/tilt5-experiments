async function diagrams(demo) {
  // fetch all metadata for rendering a path through multiple diagrams
  // usage: deno run --allow-net path.js

  const uniq = (value, index, self) => self.indexOf(value) === index;

  let db =
    "http://simnet.ward.asia.wiki.org/assets/pages/diagrams-as-base-model";
  let index = await fetch(`${db}/index.json`).then((res) => res.json());
  let path = index.paths[demo];
  let team = "growing-regions";
  let diagrams = path.map((t) => t.diagram).filter(uniq);

  const extension = (diagram) => index.data[team][diagram].extension;

  let images = {};
  let pfi = diagrams.map((s) => {
    //return `${db}/data/${team}/${s}.${extension(s)}`
    let url = `${db}/data/${team}/${s}.${extension(s)}`;
    images[s] = url;
    // return fetch(url).then(res => res.text()).then(text => images[s] = text)
  });

  let things = {};
  let pft = diagrams.map((s) => {
    let url = `${db}/data/${team}/${s}.json`;
    return fetch(url).then((res) => res.json()).then((json) =>
      things[s] = json.things
    );
  });

  await Promise.all([...pfi, ...pft]);

  return { path, images, things };
}

class Path {
  constructor(world, demo, color) {
    this.packets = [];
    this.dots = [];
    this.demo = demo;
    this.world = world;
    this.color = color;
  }

  async render() {
    let { images, path, things } = await diagrams(this.demo);
    this.images = images;
    this.path = path;
    this.things = things;
    console.log({ images, path, things });
    let previous = undefined;
    let index = 0;
    for (let entry of path) {
      let dot = await this.render_entry(
        this.path,
        this.images,
        this.things,
        index,
      );
      this.dots.push(dot);
      if (previous) {
        this.connect(previous, dot, this.packets.length == 0);
      }
      previous = dot;
      index += 1;
    }
    return this.create_packet();
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

  async render_entry(path, images, things, index) {
    let diagram_name = path[index].diagram;
    let thing_name = path[index].thing;
    let diagram = this.world.diagrams[diagram_name];
    if (!diagram) {
      let count = Object.keys(this.world.diagrams).length;
      diagram = new Diagram(-count * 1.0 + 2.5, images[diagram_name]);
      this.world.diagrams[diagram_name] = diagram;
      await diagram.render();
    }
    let [x, y] = things[diagram_name][thing_name].dot;
    return diagram.add(thing_name, x, y);
  }

  connect(from, to, create_packet) {
    let x_comp = Math.pow((to.world_x - from.world_x), 2);
    let y_comp = Math.pow((to.world_y - from.world_y), 2);
    let z_comp = Math.pow((to.world_z - from.world_z), 2);
    let distance = Math.sqrt(x_comp + y_comp + z_comp);
    let transforms = [
      new THREE.Matrix4().lookAt(
        new THREE.Vector3(from.world_x, from.world_y, from.world_z),
        new THREE.Vector3(to.world_x, to.world_y, to.world_z),
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
