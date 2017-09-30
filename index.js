var http = require("http");

const options = (path) => ({
    hostname: "localhost",
    method: "POST",
    port: 8000,
    path: path,
    headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    }
});

function makeMap(arr) {
    return arr.reduce((map, val, i) => (map[i + "_"] = val, map), {});
}

function makeUrlEncodedArgs(map) {
    return Object.keys(map).map((key) => `${key}=${map[key]}`).join("&");
}

function doRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', resolve);
            res.on('end', () => {
                console.log('No more data in response.');
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function resolveScAddrs(sysIdtfs) {
    if (!Array.isArray(sysIdtfs)) {
        sysIdtfs = [sysIdtfs];
    }
    const map = makeMap(sysIdtfs);

    const data = makeUrlEncodedArgs(map);

    return doRequest(options("/api/addr/resolve/"), data);
}

function doCommand(cmd, args) {
    if (!Array.isArray(args)) {
        args = [args];
    }
    const map = makeMap(args);
    map.cmd = cmd;
    const data = makeUrlEncodedArgs(map);
    return doRequest(options("/api/cmd/do/"), data);
}

if (false) {
    //it's for testing in interaction mode
    resolveScAddrs("ui_control_search").then(console.log, console.error);
    resolveScAddrs(["ui_start_sc_element", "nrel_boolean"]).then(console.log, console.error);
    doCommand(3029532673, [2626486273]).then(console.log, console.error);
}

function kickScAgent(cmd, ...args) {
    // {sys_idtf: sc_addr}
    return Promise.resolve(resolveScAddrs([cmd, ...args]))
        .then(JSON.parse)
        .then((scAddrs) => {
            const unresolverAddrs = [cmd, ...args].filter(val => !scAddrs[val]);
            if (unresolverAddrs.length !== 0) {
                throw Error(`Addrs unresolved. ${unresolverAddrs}`);
            } else {
                return scAddrs;
            }

        })
        .then((scAddrs) => doCommand(scAddrs[cmd], args.map((val) => scAddrs[
            val])))
        .then(JSON.parse);
}

if (false) {
    kickScAgent("ui_menu_view_full_semantic_neighborhood", "ui_start_sc_element").then(console.log, console.error);
    kickScAgent("ui_menu_view_full_semantic_neighborhood", "ui_sc_element").then(console.log, console.error);
}

kickScAgent.apply(null, process.argv.slice(2))
    .then((result) => (console.log(result), console.log(
        `To see result of question refer to this link:
http://localhost:8000/?question=${result.question}`)))
    .catch(console.error);