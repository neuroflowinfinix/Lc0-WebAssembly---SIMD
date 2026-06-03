const lc0 = require('./lc0.js');

let start = 0;

lc0({
  print: (msg) => {
    console.log("[lc0 out]", msg);
    if (msg === "readyok") {
        console.log("Engine is ready, sending go command...");
        start = Date.now();
        instance.cwrap('push_uci_command', 'void', ['string'])('position startpos');
        instance.cwrap('push_uci_command', 'void', ['string'])('go depth 15');
    }
    if (msg.includes("bestmove")) {
        let elapsed = (Date.now() - start) / 1000;
        console.log(`\n✅ Depth 15 completed in ${elapsed} seconds!`);
        process.exit(0);
    }
  },
  printErr: (msg) => {
    console.error("[lc0 err]", msg);
  }
}).then(m => {
  global.instance = m;
  console.log("Lc0 loaded! Starting main loop...");
  m.callMain(['--weights=embedded', '--backend=eigen', '--threads=1', '--minibatch-size=1']);
  console.log("Sending isready...");
  m.cwrap('push_uci_command', 'void', ['string'])('isready');
}).catch(err => {
  console.error("Failed to load WASM:", err);
});
