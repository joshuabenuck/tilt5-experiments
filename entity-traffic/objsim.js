export { start, User, Source, WebServer, Backend, LoadBalancer, Database }

/*
Future discussions:
- add host layer
- add dns lookups to diagrams
- dynamically add new diagrams w/ different configs
- discuss partial observability and how to represent it
- how to play back and visualize real observability data?
*/

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const SERVICE = 1
const NETWORK = 2
let log = () => console.log("unimplemented")

const prob = (pcnt) => Math.random()*100 < pcnt
const norm = (mean) => (Math.random()-Math.random()+1)*mean
const choose = (list) => {for (let one of list) if (prob(50)) return one; return '500 error'}

// Start our "recursive descent" logger
function start(model_logger) {
  log = model_logger
  for (let name of ['Joshua', 'Beth', 'Ward', 'Eric']) {
      let user = new User(name)
      user.host = new Host(`gateway`)
      user.run()
  }
  for (let vendor of ['amazon', 'apple', 'shopify']) {
      let source = new Source(vendor)
      source.host = new Host(`gateway`)
      source.run()
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
    constructor(serviceName, instanceName, host=null) {
        this.serviceName = serviceName
        this.instanceName = instanceName
        this.host = host
    }

    name() {
        if (this.serviceMode()) {
            return this.serviceName
        }
        return this.instanceName
    }

    async networkSend(packet) {
        let nextHop = packet.nextHop
        let service = dns.find(nextHop)
        if (service.host) {
            // resource cost...
            return await service.host.handle(packet, service)
        }
        return await service.handle(packet)
    }
}

class Host {
    constructor(hostname) {
        this.hostname = hostname
        this.services = []
    }

    addServices(services) {
        this.services = services
        for (let service of services) {
            service.host = this
        }
        return this
    }

    addService(service) {
        this.services.push(service)
        service.host = this
    }

    async handle(packet, service) {
        // ask service for cpu, ram, and disk costs
        // tracks resource usage
        return await service.handle(packet)
    }
}

class DNS {
    constructor() {
        this.types = {}
        this.indexes = {}
    }

    registerAll(hosts) {
        for (let host of hosts) {
            for (let service of host.services) {
                this.register(service.serviceName, service)
                this.register(service.instanceName, service)
            }
        }
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
        return await this.networkSend(new Packet({
            dst: "webserver",
            src: this,
            nextHop: "webserver",
            prevHop: this,
            op: action,
            args: [param]
        }))
    }

    async search(what) {
        return await this.perform("search", what)
    }

    async browse(what) {
        return await this.perform("browse", what)
    }

    async achieve(goal) {
        await delay(norm(250))
        let result = await this.search("watches")
        if (result.code != 200) {
            // possible stack overflow since we don't track recursion depth
            // TODO: roll the dice when deciding whether to try again
            this.failures += 1
            await delay(norm(1000))
            return await this.achieve(goal)
        }
        await delay(norm(3000))
        // TODO: Vary percentage of brands browsed
        for (let brand of result.payload.brands) {
            await delay(norm(250))
            result = await this.browse(brand)
            if (result.code != 200) {
                this.failures += 1
                await delay(norm(1000))
                return await this.achieve(goal)
            }
            this.successes += 1
            await delay(norm(3000))
        }
        // goal, expectation
        /*let tasks = ["search:watches"]//,"browse:brand1","browse:brand2","cart:brand1","checkout"]
        for (let task of tasks) {
            await delay(norm(250))
            let response = await this.perform.call(this, ...task.split(":"))
            if (!response) {
               console.log(task)
               continue 
            }
            if (response.code == 200) {
                this.successes += 1
            } else {
                this.failures += 1
            }
        }*/
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

    async handle(packet) {
        log(SERVICE, this, packet)
        if (packet.op == "search") {
            return await this.search(packet.args[0])
        } else if (packet.op == "browse") {
            return await this.browse(packet.args[0])
        } else {
            return {code: 200, payload: null}
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
    constructor(registrations) {
        LoadBalancer.instance += 1
        super("lb", `lb${LoadBalancer.instance}`)
        this.instance = LoadBalancer.instance
        this.services = {}
        this.index = 0
        for (let item of Object.entries(registrations)) {
            let [service, instances] = item
            for (let instance of instances) {
                this.register(service, instance)
            }
        }
        console.log(this.services)
    }

    serviceMode() {
        return LoadBalancer.serviceMode
    }

    async handle(packet) {
        let db = await this.find("db", packet)
        packet.prevHop = this
        packet.nextHop = db
        return await this.networkSend(packet)
    }

    register(service, instance) {
        let instances = this.services[service] || []
        instances.push(instance)
        this.services[service] = instances
    }

    async find(service, packet) {
        log(NETWORK, this, packet)
        let index = this.index
        this.index = (this.index + 1) % this.services[service].length
        return this.services[service][index] || undefined
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
        this.failures = 0
        this.successes = 0
        Database.inventory = {
            brands: {
                "basic": 3000,
                "fancy": 3000,
                "expensive": 3000
            }
        }
    }

    serviceMode() {
        return Database.serviceMode
    }

    async handle(packet) {
        delay(norm(100))
        log(SERVICE, this, packet)
        if (Math.random() > 0.01) {
            this.successes += 1
            let payload = {}
            if (packet.args[0] == "watches") {
                payload = {brands: ["basic", "fancy", "expensive"]}
            }
            if (packet.args[0] == "basic") {
                Database.inventory.brands.basic -= 1;
            }
            return {code: 200, payload}
        }
        this.failures += 1
        return {code: 500, message: "DB overloaded!"}
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
        await delay(norm(100))
        let packet = new Packet({
            src: this,
            dst: "backend",
            nextHop: "backend",
            prevHop: this,
            op: action,
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
        log(SERVICE, this, packet)
        //log(this.name(), packet.args[0], packet.prevHop.name())
        if (packet.op == "create") {
            let packet = new Packet({
                src: this,
                dst: "db",
                nextHop: "lb",
                prevHop: this,
                op: "query",
                args: ["update"]
            })
            let response = await this.networkSend(packet)
            //logEnd(...)
            return response
        } else if (packet.op == "box") {
        } else if (packet.op == "bag") {
        } else {
            return 404
        }
    }
}

let lb_registrations = {"db":["db1", "db2", "db3"]}

let dns = new DNS()
dns.registerAll([
    new Host("webserver_host").addServices([
        new WebServer(),
        new WebServer()
    ]),
    new Host("loadbalancer_host").addServices([
        new LoadBalancer(lb_registrations),
        new LoadBalancer(lb_registrations)
    ]),
    new Host("db_host").addServices([
        new Database(),
        new Database(),
        new Database()
    ]),
    new Host("backend_host").addServices([
        new Backend(),
        new Backend()
    ])
])