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

const LINEAR = "linear";
const STACKED = "stacked";

class World {
  constructor(layout) {
    this.layout = STACKED;
    if (layout) {
      this.layout = layout;
    }
    this.canvas = document.querySelector("#c");
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      2.0,
      1000,
    );
    if (this.layout == LINEAR) {
      this.controls = new oc.MapControls(this.camera, this.renderer.domElement);
    } else if (this.layout == STACKED) {
      this.controls = new oc.OrbitControls(
        this.camera,
        this.renderer.domElement,
      );
    } else {
      console.log("WARN: Unknown layout", this.layout);
    }
    //controls.update() must be called after any manual changes to the camera's transform
    this.camera.position.set(0, 0, 7.5);
    this.controls.update();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    document.addEventListener("click", (event) => {
      if (this.intersected) {
        for (let diagram of Object.values(this.diagrams)) {
          diagram.deselect();
        }
        let diagram = this.intersected.userData.diagram;
        diagram.select();
        if (this.layout == LINEAR) {
          scene.position.x = -diagram.offsets.x;
        }
      }
    });

    document.addEventListener("mousemove", (event) => {
      event.preventDefault();

      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }, false);

    this.paths = {};
    this.diagrams = {};
    this.current_x = 0.0;
  }

  async add_demo(demo) {
    let colors = [
      0x3df3df,
      0x73d73d,
    ];
    let color_index = Object.keys(this.paths).length % colors.length;
    let { images, path: diagram_path, things } = await diagrams(demo);
    console.log({ images, diagram_path, things });
    let previous = undefined;
    let index = 0;
    let path = new Path(this, colors[color_index]);
    for (let entry of diagram_path) {
      let diagram_name = diagram_path[index].diagram;
      let thing_name = diagram_path[index].thing;
      let diagram = this.diagrams[diagram_name];
      if (!diagram) {
        let offsets = {};
        if (this.layout == LINEAR) {
          offsets.x = this.current_x;
        } else if (this.layout == STACKED) {
          let count = Object.keys(this.diagrams).length;
          offsets.z = -count * 1.0 + 2.5;
        }
        diagram = new Diagram(offsets, images[diagram_name]);
        this.diagrams[diagram_name] = diagram;
        await diagram.render();
        this.current_x += diagram.width / 200; // ick...
      }
      let [x, y] = things[diagram_name][thing_name].dot;
      let dot = diagram.add_dot(thing_name, x, y);
      path.dots.push(dot);
      if (previous) {
        path.connect(previous, dot, path.packets.length == 0);
      }
      previous = dot;
      index += 1;
    }
    path.create_packet();
    this.paths[demo] = path;
    return path;
  }

  packets() {
    let packets = [];
    for (let path of Object.values(this.paths)) {
      for (let packet of path.packets) {
        packets.push(packet);
      }
    }
    return packets;
  }

  render(time, packets) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let intersects = this.raycaster.intersectObjects(scene.children);
    intersects = intersects.filter((i) => {
      return i.object.geometry.type == "PlaneGeometry";
    });
    if (intersects.length > 0) {
      if (this.intersected != intersects[0].object) {
        if (this.intersected) this.intersected.userData.diagram.unhover();
        this.intersected = intersects[0].object;
        let diagram = this.intersected.userData.diagram;
        diagram.hover();
      }
    } else {
      if (this.intersected) this.intersected.userData.diagram.unhover();
      this.intersected = null;
    }
    for (let packet of packets) {
      packet.tick();
    }
    requestAnimationFrame((time) => this.render(time, packets));

    // required if controls.enableDamping or controls.autoRotate are set to true
    this.controls.update();

    this.renderer.render(scene, this.camera);

    // canvas.toBlob((blob) => {
    //     socket.send(blob);
    // });
    // show.src = canvas.toDataURL();
    let ms = Date.now();
    // console.log(ms);
  }
}
