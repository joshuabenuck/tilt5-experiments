
import * as THREE from 'https://unpkg.com/three@0.124.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.124.0/examples/jsm/controls/OrbitControls.js';
export { start }

let lines, data

async function start (div, svg) {
  parse(svg)
  render(div, svg)
}


// R E N D E R   A C T I V I T Y

async function render (div, text) {
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
}


// P A R S E   D I M E N T I O N S

function parse(text) {
  let lines = text.split(/\n/)
  let data = {}
  file()
  console.table(data)
  return data

  function file() {
    while (lines.length) {
      if (lines[0].startsWith('<!--')) {} else
      if (lines[0].endsWith('-->')) {} else
      if (lines[0] == '') {} else
      if (lines[0].startsWith('<?xml')) {} else
      if (lines[0].startsWith('<!DOCTYPE')) {} else
      if (lines[0].startsWith(' "http://www.w3.org')) {} else
      if (lines[0].startsWith(' viewBox=')) {} else
      if (lines[0].startsWith('<svg')) {} else
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