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

class LinearLayout {
  constructor() {
    this.current_x = 0;
  }
  controls(camera, element) {
    camera.position.set(0, 0, 7.5);
    return new oc.MapControls(camera, element);
  }
  select(previous, current) {
    if (previous) previous.deselect();
    current.select();
    scene.position.x = -current.offsets.x;
  }
  offsets() {
    let offsets = {};
    offsets.x = this.current_x;
    return offsets;
  }
  record(diagram) {
    this.current_x += diagram.width / 200; // ick...
  }
}

class StackedLayout {
  constructor() {
    this.current_x = 0;
  }
  controls(camera, element) {
    camera.position.set(0, 0, 7.5);
    return new oc.OrbitControls(camera, element);
  }
  select(previous, current) {
    if (previous) previous.deselect();
    current.select();
  }
  offsets(diagrams) {
    let offsets = {};
    let count = Object.keys(diagrams).length;
    offsets.z = -count * 1.0 + 2.5;
    return offsets;
  }
  record(diagram) {
    this.current_x += diagram.width / 200; // ick...
  }
}

class CircleLayout {
  constructor() {
    this.diagram_index = 0;
  }
  controls(camera, element) {
    camera.position.set(0, 0, 0);
    return new oc.OrbitControls(camera, element);
  }
  select(previous, current) {
    let previous_index = 0;
    if (previous) {
      previous_index = previous.index;
      previous.deselect();
    }
    current.select();
    let rotate_by = current.index - previous_index;
    scene.applyMatrix4(
      new THREE.Matrix4().makeRotationY(rotate_by * Math.PI / 12),
    );
  }
  offsets() {
    let offsets = {};
    offsets.z = -18.0;
    offsets.rotate_y = -this.diagram_index * (Math.PI / 12);
    return offsets;
  }
  record(_diagram) {
    this.diagram_index += 1;
  }
}

class World {
  constructor(layout) {
    if (layout) {
      this.layout = layout;
    } else {
      this.layout = new StackedLayout();
    }
    this.demos = [];
    this.canvas = document.querySelector("#c");
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });

    // this.camera = new THREE.OrthographicCamera(
    //   window.innerWidth / -2,
    //   window.innerWidth / 2,
    //   window.innerHeight / 2,
    //   window.innerHeight / -2,
    //   1.0,
    //   1000,
    // );

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    document.addEventListener("click", (event) => {
      if (this.intersected) {
        this.layout.select(
          this.selected,
          this.intersected.userData.diagram,
        );
      }
    });

    document.addEventListener("mousemove", (event) => {
      event.preventDefault();

      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }, false);

    document.querySelector(".layout").addEventListener(
      "click",
      async (event) => {
        if (event.target.nodeName != "INPUT") return;
        scene.remove(...scene.children);
        this.camera = new THREE.PerspectiveCamera(
          50,
          window.innerWidth / window.innerHeight,
          1.0,
          1000,
        );
        scene.position.x = 0;
        scene.position.y = 0;
        scene.position.z = 0;
        scene.setRotationFromMatrix(new THREE.Matrix4());
        let selected = document.querySelector(".layout input:checked");
        let layout = selected.getAttribute("id");
        if (layout == "stacked") {
          this.layout = new StackedLayout();
        } else if (layout == "linear") {
          this.layout = new LinearLayout();
        } else if (layout == "circle") {
          this.layout = new CircleLayout();
        } else {
          console.log("WARN: Invalid layout selected!");
        }
        this.controls = this.layout.controls(
          this.camera,
          this.renderer.domElement,
        );
        //controls.update() must be called after any manual changes to the camera's transform
        this.controls.update();
        this.paths = {};
        this.diagrams = {};
        this.diagram_index = 0;
        for (let demo of this.demos) {
          await this.add_demo(demo);
        }
      },
      false,
    );
    document.querySelector(".layout input[id='stacked']").click();
  }

  get selected() {
    for (let diagram of Object.values(this.diagrams)) {
      if (diagram.selected) {
        return diagram;
      }
    }
    return null;
  }

  async add_demo(demo) {
    if (this.demos.indexOf(demo) == -1) {
      this.demos.push(demo);
    }
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
        let offsets = this.layout.offsets(this.diagrams);
        diagram = new Diagram(
          Object.values(this.diagrams).length,
          offsets,
          images[diagram_name],
        );
        this.diagrams[diagram_name] = diagram;
        await diagram.render();
        this.layout.record(diagram);
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

  render(time) {
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
    for (let packet of this.packets()) {
      packet.tick();
    }
    requestAnimationFrame((time) => this.render(time));

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
