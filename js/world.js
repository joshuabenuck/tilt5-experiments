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
    let controls = new oc.OrbitControls(camera, element);
    controls.enableKeys = false;
    return controls;
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
    this.degrees = Math.PI / 6;
    this.radius = 8.0;
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
      new THREE.Matrix4().makeRotationY(rotate_by * this.degrees),
    );
  }
  offsets() {
    let offsets = {};
    offsets.z = -this.radius;
    offsets.rotate_y = -this.diagram_index * this.degrees;
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

    document.querySelector("body").addEventListener("keydown", (event) => {
      if (event.key == "ArrowUp") {
        if (!this.selected) return;
        if (Math.abs(this.selected.plane.position.z) <= 0.001) return;
        let z_pos = this.selected.plane.position.z;
        let new_z_pos = z_pos + 1.0;
        for (let d of Object.values(this.diagrams)) {
          if (Math.abs(d.plane.position.z - new_z_pos) < 0.001) {
            d.outline.position.z = z_pos;
            d.plane.position.z = z_pos;
            this.selected.outline.position.z = new_z_pos;
            this.selected.plane.position.z = new_z_pos;
          }
        }
        console.log(this.selected_index)
      }
      if (event.key == "ArrowDown") {
        if (!this.selected) return;
        if (Math.abs(this.selected.plane.position.z + 1.6) <= 0.001 ) return;
        let z_pos = this.selected.plane.position.z;
        let new_z_pos = z_pos - 1.0;
        for (let d of Object.values(this.diagrams)) {
          if (Math.abs(d.plane.position.z - new_z_pos) < 0.001) {
            d.outline.position.z = z_pos;
            d.plane.position.z = z_pos;
            this.selected.outline.position.z = new_z_pos;
            this.selected.plane.position.z = new_z_pos;
          }
        }
        console.log(this.selected_index)
      }
      event.preventDefault();
    });

    document.addEventListener("mousemove", (event) => {
      event.preventDefault();

      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }, false);

    this.layout_stacked = new StackedLayout();
    this.layout_linear = new LinearLayout();
    this.layout_circle = new CircleLayout();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      1.0,
      1000,
    );

    // setup dat gui controls
    this.gui = new dat.GUI();
    let camera = this.gui.addFolder("Camera");
    camera.add(this.camera.position, "x", 0.0, 10.0, 1.0);
    camera.add(this.camera.position, "y", 0.0, 10.0, 1.0);
    camera.add(this.camera.position, "z", 0.0, 10.0, 1.0);
    camera.add(
      this.camera.rotation,
      "x",
      Math.PI / 180,
      Math.PI * 2,
      Math.PI / 180,
    ).name("x angle");
    camera.add(
      this.camera.rotation,
      "y",
      Math.PI / 180,
      Math.PI * 2,
      Math.PI / 180,
    ).name("y angle");
    camera.add(
      this.camera.rotation,
      "z",
      Math.PI / 180,
      Math.PI * 2,
      Math.PI / 180,
    ).name("z angle");
    let stacked = this.gui.addFolder("Stacked");
    let linear = this.gui.addFolder("Linear");
    let circle = this.gui.addFolder("Circle");
    circle.add(this.layout_circle, "radius", 0.5, 20, 1.0);
    circle.add(
      this.layout_circle,
      "degrees",
      Math.PI / 180,
      Math.PI * 2,
      Math.PI / 180,
    );

    document.querySelector(".layout").addEventListener(
      "click",
      async (event) => {
        if (event.target.nodeName != "INPUT") return;

        // reset scene
        scene.remove(...scene.children);
        scene.position.x = 0;
        scene.position.y = 0;
        scene.position.z = 0;
        scene.setRotationFromMatrix(new THREE.Matrix4());
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        // 0, 0, 7.5
        light.position.set(-1, 2, 4);
        scene.add(light);

        // reset camera

        let selected = document.querySelector(".layout input:checked");
        let layout = selected.getAttribute("id");
        if (layout == "stacked") {
          this.layout = this.layout_stacked;
        } else if (layout == "linear") {
          this.layout = this.layout_linear;
        } else if (layout == "circle") {
          this.layout = this.layout_circle;
        } else {
          console.log("WARN: Invalid layout selected!");
        }
        this.controls = this.layout.controls(
          this.camera,
          this.renderer.domElement,
        );
        //controls.update() must be called after any manual changes to the camera's transform
        this.controls.update();
        this.paths = [];
        this.diagrams = {};
        this.diagram_index = 0;
        await this.build();
      },
      false,
    );
    this.paths_to_diagrams = [];
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

  get selected_index() {
    let index = 0;
    for (let diagram of Object.values(this.diagrams)) {
      if (diagram.selected) {
        return index;
      }
      index += 1;
    }
    return null;
  }

  async add_demo(demo) {
    // convert to step objects
    let paths_to_steps = [];
    let { images, path: diagram_path, things } = await diagrams(demo);
    console.log({ images, diagram_path, things });
    let steps = [];
    for (let entry of diagram_path) {
      let diagram_name = entry.diagram;
      let thing_name = entry.thing;
      steps.push(
        {
          diagram: diagram_name,
          thing: things[diagram_name][thing_name],
          image: images[diagram_name],
        },
      );
    }
    paths_to_steps.push(steps);
    console.log({ paths_to_steps });

    // group by diagrams
    for (let steps of paths_to_steps) {
      let previous_image = null;
      let path_diagrams = [];
      let diagram = {};
      for (let step of steps) {
        if (step.image != previous_image) {
          previous_image = step.image;
          diagram = { color: step.color, image: step.image, steps: [] };
          path_diagrams.push(diagram);
        }
        diagram.steps.push(step.thing);
      }
      this.paths_to_diagrams.push(path_diagrams);
    }
    console.log({ paths_to_diagrams: this.paths_to_diagrams });

    this.demos.push(demo);
  }

  async build() {
    // merge paths
    // let diagrams = [];
    // let step_idx = 0;
    // while (true) {
    //   for (let path of paths_to_diagrams) {
    //   }
    //   break;
    // }

    let colors = [
      0x3df3df,
      0x73d73d,
    ];
    let index = 0;
    for (let path_def of this.paths_to_diagrams) {
      let previous = undefined;
      let color_index = Object.keys(this.paths).length % colors.length;
      console.log({ path_def });
      let path = new Path(colors[color_index]);
      for (let diagram of path_def) {
        console.log({ diagram });
        let diagramobj = this.diagrams[diagram.image];
        if (!diagramobj) {
          let offsets = this.layout.offsets(this.diagrams);
          diagramobj = new Diagram(
            Object.values(this.diagrams).length,
            offsets,
            diagram.image,
          );
          this.diagrams[diagram.image] = diagramobj;
          await diagramobj.render();
          this.layout.record(diagramobj);
        }
        for (let step of diagram.steps) {
          let [x, y] = step.dot;
          let dot = diagramobj.create_dot("thing_name", x, y);
          path.add_dot(dot);
          if (previous) {
            previous.shape.parent.updateWorldMatrix(true, false);
            dot.shape.parent.updateWorldMatrix(true, false);
            //path.connect(previous, dot, path.packets.length == 0);
          }
          previous = dot;
          index += 1;
        }
      }
      let packet_count = 0;
      function create_packet() {
        path.create_packet(Math.random(), colors[color_index]);
        packet_count++;
        if (packet_count < 100) {
          setTimeout(create_packet, 10)
        }
      }
      setTimeout(create_packet, 0);
      this.paths.push(path);
    }
  }


  packets() {
    let packets = [];
    for (let path of this.paths) {
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
