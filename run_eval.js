const fs = require('fs');
const path = require('path');
const LCZ = require('./lc0_wasm_package/lc0.js');

const commands = `uci
isready
position startpos moves e2e4 g8f6
go nodes 10
`;

let pos = 0;
let stdout_buffer = "";
(async () => {
    try {
        const M = await LCZ({
            noInitialRun: true,
            locateFile: (p) => path.join(__dirname, 'lc0_wasm_package', p),
            print: (t) => {
                console.log('STDOUT:', t);
                if (t.includes('bestmove')) {
                    console.log('Search finished, bestmove found! Exiting in 1 second.');
                    setTimeout(() => process.exit(0), 1000);
                }
            },
            printErr: (t) => console.error('STDERR:', t)
        });
        
        M.callMain(['--weights=embedded', '--backend=eigen', '--threads=1', '--minibatch-size=1']);
        
        const push_cmd = M.cwrap('push_uci_command', null, ['string']);
        
        console.log("Sending UCI commands...");
        push_cmd("uci\n");
        push_cmd("isready\n");
        push_cmd("position startpos moves e2e4 g8f6\n");
        push_cmd("go nodes 10\n");
        
        // Keep the Node process alive!
        setInterval(() => {}, 1000);
    } catch (ex) { 
        let msg = ex;
        try { if (M.getExceptionMessage) msg = M.getExceptionMessage(ex); } catch(e){}
        console.error('Crash:', ex, msg); 
    }
})();
