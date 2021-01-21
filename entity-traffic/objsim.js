export { start }

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let serviceLog = (thing, details) => console.log("service:", thing, details)
let serviceDetailsLog = (thing, details) => console.log("details:", thing, details)

const prob = (pcnt) => Math.random()*100 < pcnt
const norm = (mean) => (Math.random()-Math.random()+1)*mean
const choose = (list) => {for (let one of list) if (prob(50)) return one; return '500 error'}

function start(serviceLogger, serviceDetailsLogger) {
  if(serviceLogger) {
      console.log("using custom service logger")
      serviceLog = serviceLogger
  }
  if(serviceDetailsLogger) {
      console.log("using custom service details logger")
      serviceDetailsLog = serviceDetailsLogger
  }
  for (let name of ['Joshua', 'Beth', 'Ward', 'Eric']) new Person(name).run()
  for (let vendor of ['amazon', 'apple', 'shopify']) new Source(vendor).run()
}

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

class Model {
    constructor() {

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
    }

    register(type, instance) {
        let instances = this.types[type] || []
        instances.push(instance)
        this.types[type] = instances
    }

    find(type) {
        return this.types[type][0] || undefined
    }
}

class Person extends Model {
    static instance = 0
    constructor(name) {
        super()
        this.name = name
        Person.instance += 1
        this.instance = Person.instance
        this.successes = 0
        this.failures = 0
    }

    async perform(action, param) {
        await this.networkSend(new Packet({
            dst: "webserver",
            src: `user${this.instance}`,
            nextHop: "webserver",
            prevHop: `user${this.instance}`,
            op: action,
            args: [param]
        }))
        //await dns.find("webserver").perform(from, action, param)
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

class WebServer extends Model {
    async handle({src, op, args}) {
        return await this.perform(src, op, args[0])
    }

    async perform(from, action, param) {
        serviceLog("webserver", action, from.replace(/\d/, ""))
        serviceDetailsLog("webserver", action, from)
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
            src: "webserver",
            dst: "db",
            nextHop: "balancer",
            prevHop: "webserver",
            op: "query",
            args: [term]
        })
        return await this.networkSend(packet)
    }

    async browse(item) {
        let packet = new Packet({
            src: "webserver",
            dst: "db",
            nextHop: "balancer",
            prevHop: "webserver",
            op: "query",
            args: [item]
        })
        return await this.networkSend(packet)
    }
}

class LoadBalancer extends Model {
    constructor() {
        super()
        this.services = {}
        this.index = 0
    }

    async handle(packet) {
        let db = await this.find("db", packet.prevHop)
        packet.prevHop = "balancer"
        packet.nextHop = db
        return await this.networkSend(packet)
    }

    register(service, instance) {
        let instances = this.services[service] || []
        instances.push(instance)
        this.services[service] = instances
    }

    async find(service, from) {
        //serviceLog("balancer", "read", from)
        serviceDetailsLog("balancer", "read", from)
        let index = this.index
        this.index = (this.index + 1) % this.services[service].length
        return this.services[service][this.index] || undefined
    }
}

// Reads should go to read-only replicas
// Writes should go to either
class Database {
    static instance = 0
    constructor() {
        Database.instance += 1
        this.instance = Database.instance
    }

    handle(packet) {
        return this.query(packet.args[0], packet.prevHop, packet.src)
    }

    query(query, fromDetails, from) {
        delay(0.2)
        serviceLog("database", query, from)
        serviceDetailsLog("database" + this.instance, query, fromDetails)
        return "results"
    }
}

class Source {
    constructor(name) {
        this.name = name
    }

    async perform(action) {
        await delay(100)
        dns.find("backend").perform(this.name, action)
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

class Backend extends Model {
    async perform(from, action) {
        serviceLog("backend", action, "source")
        serviceDetailsLog("backend", action, from)
        if (action == "create") {
            let packet = new Packet({
                src: "backend",
                dst: "db",
                nextHop: "balancer",
                prevHop: "backend",
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
let balancer = new LoadBalancer()
dns.register("db1", new Database())
dns.register("db2", new Database())
dns.register("db3", new Database())
balancer.register("db", "db1")
balancer.register("db", "db2")
balancer.register("db", "db3")
dns.register("balancer", balancer)
dns.register("backend", new Backend())