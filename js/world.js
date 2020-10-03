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

class World {
  constructor() {
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
        offsets.x = this.current_x;
        // let count = Object.keys(this.diagrams).length;
        // offsets.z = -count * 1.0 + 2.5;
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
}
