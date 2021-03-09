
import * as THREE from 'https://unpkg.com/three@0.124.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.124.0/examples/jsm/controls/OrbitControls.js';
export { start, log }

let nodes, dim
let scene

function start (div, svg) {
  let {width, height, data} = parse(svg)
  nodes = data
  dim = [width, height]
  scene = render(div, svg, nodes, width, height)
}

function log (level, current, packet) {
  discover ([current.instanceName, current.serviceName, current.host.hostname])
  discover ([packet.prevHop.instanceName, packet.prevHop.serviceName, packet.prevHop.host.hostname])
}


// R E N D E R   A C T I V I T Y

function render (div, text, nodes, width, height) {
  let view = [640, 480]
  let tick = null
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(...view);
  renderer.setPixelRatio(2);
  div.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(70, view[0]/view[1], 0.1, 15);
  camera.position.z = 3;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const scene = new THREE.Scene();

  scene.background = new THREE.Color('white')
  scene.add(new THREE.AmbientLight(0xffffff, .7))
  let loader = new THREE.TextureLoader()
  let url = 'data:image/svg+xml;base64,' + btoa(text)
  loader.load(url, texture => {
    let material = new THREE.MeshBasicMaterial({
      map: texture, side: THREE.DoubleSide })
    let geometry = new THREE.PlaneGeometry(
        texture.image.width / 100,
        texture.image.height / 100)
    let basemap = new THREE.Mesh(geometry, material)
    scene.add(basemap)
  })

  renderer.setAnimationLoop(() => {
    controls.update();
    if(tick) tick()
    renderer.render(scene, camera);
  })

  return scene
}

let geo = new THREE.CubeGeometry(.5,.3,.1)
let mat = new THREE.MeshStandardMaterial({
    color:'bisque',
    opacity: 0.5,
    transparent: true,
  })

function discover (aliases) {
  const at = xy => [(xy.x-dim[0]/2)/100, (-xy.y-dim[1]/2)/100]
  const brick = (what, height) => {
    let dot = new THREE.Mesh(geo, mat)
    let p = new THREE.Vector3(...at(nodes[what]), height)
    dot.position.copy(p)
    scene.add(dot)
  }
  // what is in the diagram
  let what = aliases.filter(name => nodes[name])[0]
  if (!what) return
  let stack = nodes[what].stack = nodes[what].stack || []
  // who is in the stack
  let who = aliases[0]
  if (stack.includes(who)) return
  stack.push(who)
  brick(what, .1 + .2 * stack.length)
}


// P A R S E   D I M E N T I O N S

function parse(text) {
  let lines = text.split(/\n/)
  let data = {}
  let width = 0
  let height = 0
  file()
  console.table(data)
  return {width, height, data}

  function file() {
    while (lines.length) {
      if (lines[0].startsWith('<!--')) {} else
      if (lines[0].endsWith('-->')) {} else
      if (lines[0] == '') {} else
      if (lines[0].startsWith('<?xml')) {} else
      if (lines[0].startsWith('<!DOCTYPE')) {} else
      if (lines[0].startsWith(' "http://www.w3.org')) {} else
      if (lines[0].startsWith(' viewBox=')) {} else
      if (lines[0].startsWith('<svg')) {
        // <svg width="262pt" height="98pt"
        console.log(lines[0])
        let m = lines[0].match(/width="(\d+)pt" height="(\d+)pt"/)
        width = m[1]
        height = m[2]
      } else
      if (lines[0].startsWith('</svg')) {} else
      if (lines[0].startsWith('<g id="graph')) { graph() } else
      { trouble('svg') }
      lines.shift()
    }  
  }

  function graph() {
    lines.shift()
    while (!lines[0].startsWith('</g')) {
      if (lines[0].startsWith('<!--')) {} else
      if (lines[0].startsWith('<polygon')) {} else
      if (lines[0].startsWith('<g id="node')) { node() } else
      if (lines[0].startsWith('<g id="edge')) { edge() } else
      { trouble('graph') }
      lines.shift()
    }
  }

  function node() {
    let name, place
    lines.shift()
    while (!lines[0].startsWith('</g')) {
      if (lines[0].startsWith('<!--')) {} else
      if (lines[0].startsWith('<polygon')) { place = polygon() } else
      if (lines[0].startsWith('<title')) { name = title() } else
      if (lines[0].startsWith('<text')) {} else
      if (lines[0].startsWith('<path')) {} else
      { trouble('node') }
      lines.shift()
    }
    data[name] = place
  }

  function edge() {
    lines.shift()
    while (!lines[0].startsWith('</g')) {
      if (lines[0].startsWith('<!--')) {} else
      if (lines[0].startsWith('<polygon')) {} else
      if (lines[0].startsWith('<title')) {} else
      if (lines[0].startsWith('<text')) {} else
      if (lines[0].startsWith('<path')) {} else
      { trouble('edge') }
      lines.shift()
    }
  }

  function title() {
    let m = lines[0].match(/<title>(.*?)<\/title>/)
    return m[1]
  }

  function polygon() {
    let m = lines[0].match(/points="(.*?)"/)
    let p = m[1].split(/ /).map(xy => xy.split(/,/).map(n => Math.round(n)))
    let l = Math.min(...p.map(xy => xy[0]))
    let r = Math.max(...p.map(xy => xy[0]))
    let t = Math.min(...p.map(xy => xy[1]))
    let b = Math.max(...p.map(xy => xy[1]))
    return {x:(l+r)/2, y:(t+b)/2, width:r-l, height:t-b}
    // return [(l+r)/2, (t+b)/2]
  }

  function trouble(rule) {
    console.error(`${rule} can't parse '${lines[0]}'`)
  }
}