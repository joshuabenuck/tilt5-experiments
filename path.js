// fetch all metadata for rendering a path through multiple diagrams
// usage: deno run --allow-net path.js

const uniq = (value, index, self) => self.indexOf(value) === index

let db = 'http://simnet.ward.asia.wiki.org/assets/pages/diagrams-as-base-model'
let index = await fetch(`${db}/index.json`).then(res=>res.json())
let path = index.paths['npl demo']
let team = 'growing-regions'
let diagrams = path.map(t=>t.diagram).filter(uniq)

const extension = (diagram) => index.data[team][diagram].extension

let images = {}
let pfi = diagrams.map(s=>{
  let url = `${db}/data/${team}/${s}.${extension(s)}`
  return fetch(url).then(res=>res.text()).then(text=>images[s]=text)
})

let things = {}
let pft = diagrams.map(s=>{
  let url = `${db}/data/${team}/${s}.json`
  return fetch(url).then(res=>res.json()).then(json=>things[s]=json.things)
})

await Promise.all([...pfi, ...pft])

console.dir({path,images,things},{depth:10})