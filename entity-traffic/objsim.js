export { start }

/*
Future discussions:
- implement checkboxes to dynamically switch between service and instance
- discuss zoom levels, implement hop to service zoom?
- add host layer?
- add dns lookups
- discuss partial observability and how to represent it
*/

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let serviceLog = (thing, details) => console.log("service:", thing, details)
let serviceDetailsLog = (thing, details) => console.log("details:", thing, details)
let scaleLog = (thing, details) => console.log("scale:", thing, details)

const prob = (pcnt) => Math.random()*100 < pcnt
const norm = (mean) => (Math.random()-Math.random()+1)*mean
const choose = (list) => {for (let one of list) if (prob(50)) return one; return '500 error'}

// Start our "recursive descent" logger
function start(serviceLogger, serviceDetailsLogger, scaleLogger) {
  if(serviceLogger) {
      console.log("using custom service logger")
      serviceLog = serviceLogger
  }
  if(serviceDetailsLogger) {
      console.log("using custom service details logger")
      serviceDetailsLog = serviceDetailsLogger
  }
  if(scaleLogger) {
      console.log("using custom scale logger")
      scaleLog = scaleLogger
  }
  for (let name of ['Joshua', 'Beth', 'Ward', 'Eric']) new User(name).run()
  for (let vendor of ['amazon', 'apple', 'shopify']) {
      new Source(vendor).run()
      new Source(vendor).run()
  }
}

/*
A string name of a service can be thought of as an unresolved reference
to a service. Once it is resolved, it becomes an instance of Model

src: the source of the request (an instance of Model)
dst: the destination of the request (as a string)
nextHop: where the packet will be sent to next (as a string)
prevHop: the service that last touched the packet (an instance of Model)
*/
class Packet {
    constructor({src, dst, nextHop, prevHop, op, args}) {
        this.src = src;
        this.dst = dst;
        this.nextHop = nextHop;
        this.prevHop = prevHop;
        this.op = op;
        this.args = args;
    }
}

class Service {
    constructor(serviceName, instanceName) {
        this.serviceName = serviceName
        this.instanceName = instanceName
    }

    name() {
        if (this.serviceMode()) {
            return this.serviceName
        }
        return this.instanceName
    }

    networkSend(packet) {
        let nextHop = packet.nextHop
        let service = dns.find(nextHop)
        return service.handle(packet)
    }
}

class DNS {
    constructor() {
        this.types = {}
        this.indexes = {}
    }

    register(type, instance) {
        this.indexes[type] = this.indexes[type] || 0
        let instances = this.types[type] || []
        instances.push(instance)
        this.types[type] = instances
    }

    find(type) {
        let index = this.indexes[type]
        this.indexes[type] = (index + 1) % this.types[type].length
        return this.types[type][index] || undefined
    }
}

class User extends Service {
    static instance = 0
    static serviceMode = true
    constructor(login) {
        User.instance += 1
        super("user", login)
        this.login = login
        this.instance = User.instance
        this.successes = 0
        this.failures = 0
    }

    serviceMode() {
        return User.serviceMode
    }

    async perform(action, param) {
        await this.networkSend(new Packet({
            dst: "webserver",
            src: this,
            nextHop: "webserver",
            prevHop: this,
            op: action,
            args: [param]
        }))
    }

    async achieve(goal) {
        // goal, expectation
        let tasks = ["search:watches","browse:brand1","browse:brand2","cart:brand1","checkout"]
        for (let task of tasks) {
            await delay(250)
            let success = await this.perform.call(this, ...task.split(":"))
            if (success) {
                this.successes += 1
            } else {
                this.failures += 1
            }
        }
    }

    async run() {
        for (let i = 0; i < 1000; i++) {
            await this.achieve("purchase")
        }
    }
}

class WebServer extends Service {
    static instance = 0
    static serviceMode = true
    constructor() {
        WebServer.instance += 1
        super("webserver", `webserver${WebServer.instance}`)
    }

    serviceMode() {
        return WebServer.serviceMode
    }

    async handle({src, op, args}) {
        return await this.perform(src, op, args[0])
    }

    async perform(from, action, param) {
        serviceLog(this.name(), action, from.name())
        serviceDetailsLog(this.name(), action, from.name())
        scaleLog(this.name(), action, from.name())
        if (action == "search") {
            return await this.search(param)
        } else if (action == "browse") {
            return await this.browse(param)
        } else {
            return 404
        }
    }

    async search(term) {
        let packet = new Packet({
            src: this,
            dst: "db",
            nextHop: "lb",
            prevHop: this,
            op: "query",
            args: [term]
        })
        return await this.networkSend(packet)
    }

    async browse(item) {
        let packet = new Packet({
            src: this,
            dst: "db",
            nextHop: "lb",
            prevHop: this,
            op: "query",
            args: [item]
        })
        return await this.networkSend(packet)
    }
}

class LoadBalancer extends Service {
    static instance = 0
    static serviceMode = true
    constructor() {
        LoadBalancer.instance += 1
        super("lb", `lb${LoadBalancer.instance}`)
        this.instance = LoadBalancer.instance
        this.services = {}
        this.index = 0
    }

    serviceMode() {
        return LoadBalancer.serviceMode
    }

    async handle(packet) {
        let db = await this.find("db", packet.prevHop)
        packet.prevHop = this
        packet.nextHop = db
        return await this.networkSend(packet)
    }

    register(service, instance) {
        let instances = this.services[service] || []
        instances.push(instance)
        this.services[service] = instances
    }

    async find(service, from) {
        serviceDetailsLog(this.name(), "read", from.name())
        scaleLog(this.name(), "read", from.name())
        let index = this.index
        this.index = (this.index + 1) % this.services[service].length
        return this.services[service][this.index] || undefined
    }
}

// Reads should go to read-only replicas
// Writes should go to either
class Database extends Service {
    static instance = 0
    static serviceMode = true
    constructor() {
        Database.instance += 1
        let instance = Database.instance
        super("db", `db${instance}`)
        this.instance = Database.instance
    }

    serviceMode() {
        return Database.serviceMode
    }

    handle(packet) {
        return this.query(packet.args[0], packet.prevHop, packet.src)
    }

    query(query, fromDetails, from) {
        delay(0.2)
        serviceLog("database", query, from.name())
        serviceDetailsLog(this.name(), query, fromDetails.name())
        scaleLog(this.name(), query, fromDetails.name())
        return "results"
    }
}

class Source extends Service {
    static instances = {}
    static serviceMode = true
    constructor(vendor) {
        let instance = Source.instances[vendor] || 0
        Source.instances[vendor] = instance + 1
        super("source", vendor)
        this.vendor = vendor
    }

    serviceMode() {
        return Source.serviceMode
    }

    async perform(action) {
        await delay(100)
        let packet = new Packet({
            src: this,
            dst: "backend",
            nextHop: "backend",
            prevHop: this,
            op: this.op,
            args: [action]
        })
        return await this.networkSend(packet)
    }

    async run() {
        for (let i = 0; i < 1000; i++) {
            let tasks = ["create", "box", "bag"]
            for (let task of tasks) {
                await this.perform(task)
            }
        }
    }
}

class Backend extends Service {
    static instance = 0
    static serviceMode = true
    constructor() {
        Backend.instance += 1
        super("backend", `backend${Backend.instance}`)
    }

    serviceMode() {
        return Backend.serviceMode
    }

    async handle(packet) {
        this.perform(packet.prevHop, packet.args[0])
    }

    async perform(from, action) {
        serviceLog(this.name(), action, "source")
        serviceDetailsLog(this.name(), action, from.name())
        scaleLog(this.name(), action, from.name())
        if (action == "create") {
            let packet = new Packet({
                src: this,
                dst: "db",
                nextHop: "lb",
                prevHop: this,
                op: "query",
                args: ["update"]
            })
            return await this.networkSend(packet)
        } else if (action == "box") {
        } else if (action == "bag") {
        } else {
            return 404
        }
    }
}

let dns = new DNS()
dns.register("webserver", new WebServer())
dns.register("webserver", new WebServer())
let lb1 = new LoadBalancer()
let lb2 = new LoadBalancer()
dns.register("db1", new Database())
dns.register("db2", new Database())
dns.register("db3", new Database())
lb1.register("db", "db1")
lb1.register("db", "db2")
lb1.register("db", "db3")
lb2.register("db", "db1")
lb2.register("db", "db2")
lb2.register("db", "db3")
dns.register("lb", lb1)
dns.register("lb", lb2)
dns.register("backend", new Backend())
dns.register("backend", new Backend())