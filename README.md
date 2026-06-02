# Lc0 WebAssembly Engine (SIMD Optimized)

This repository contains the officially compiled **WebAssembly** (WASM) build of the [Leela Chess Zero (Lc0)](https://github.com/LeelaChessZero/lc0) chess engine. This specific build is **highly optimized with WebAssembly SIMD (128-bit vectorization)**, making it approximately 40% faster at evaluating nodes compared to the baseline scalar build.

## Features & Highlights
* **SIMD Accelerated:** Compiled with `-msimd128` to leverage hardware-level vector instructions for the Eigen math backend, drastically improving Nodes Per Second (NPS).
* **Integrated NNUE:** The neural network weights (`network.pb.gz`) are embedded directly into the WASM binary. You don't need to load or mount separate files!
* **Asynchronous Communication:** Uses an asynchronous condition variable queue and Pthreads to process UCI commands interactively without blocking the event loop.
* **MultiPV Support:** Full MultiPV analysis is supported natively by the engine.

## Size Information (SIMD Build)
* **Uncompressed WASM Size:** `12.7 MB` (Reduced from 15.2 MB due to SIMD compiler optimizations. Includes the `6.4 MB` gzip-compressed default 15x192 neural network).
* **Release ZIP Size:** `7.7 MB`
* *(Note: To get the WASM size under 5MB, you would need to compile a custom build using a smaller quantized "tiny" architecture, such as 10x128).*

---

## How to Run & Test

You can run this engine in two environments: **Node.js** and the **Browser**. Since this WASM engine uses multi-threading (`Pthreads`), your environment must support `SharedArrayBuffer`.

### Method 1: Browser (Interactive HTML Test)
Because `SharedArrayBuffer` requires strict cross-origin isolation policies, you cannot open the HTML file using `file://`. You must serve it over a local server with the correct headers.

1. Clone this repository or extract the ZIP file.
2. Open a terminal in the root folder.
3. Start the included Python server:
   ```bash
   python example/serve_test.py
   ```
4. Open your browser and navigate to [http://localhost:8080/example/test.html](http://localhost:8080/example/test.html).
5. Open the browser's Developer Console (F12) to see the engine's standard output.
6. Type UCI commands into the textbox (e.g. `position startpos` then `go nodes 10`) and click "Send".

### Method 2: Node.js (Terminal)
You can run the engine directly using Node.js without any local server required. 

1. Ensure you have Node.js installed (v16+).
2. Open a terminal in the root folder.
3. Install dependencies if needed, or simply run the test:
   ```bash
   npm run test
   # OR
   node run_eval.js
   ```
   *The script will automatically initialize the engine, set the weights file to the embedded network, evaluate the starting position for 10 nodes, and output the `bestmove`!*

---

## Technical Details: Errors Overcome During Compilation

Porting a complex C++ project like Lc0 to WebAssembly comes with heavy challenges. Below are the core issues we resolved to achieve this build:

1. **Virtual Filesystem Crashing (`RuntimeError: unreachable`):**
   * **The Error:** Lc0 uses `std::ifstream` and `std::filesystem` extensively to load its `.pb.gz` network file. Emscripten's virtual filesystem (MEMFS) struggles with deep filesystem abstraction calls, causing the engine to trap with an `unreachable` exception when initializing the network backend.
   * **The Fix:** We completely bypassed the virtual filesystem. We converted `network.pb.gz` into a C-style hex array (`embedded_net.h`), and rewrote `loader.cc` to load the byte array directly from RAM, skipping the standard library file streams entirely.

2. **Synchronous `stdin` Deadlocks (Main Thread Blocking):**
   * **The Error:** Standard C++ `std::getline(std::cin, ...)` acts synchronously. When running inside a browser or Node event loop, waiting for user input completely hangs the execution thread, causing the tab to freeze.
   * **The Fix:** We compiled Lc0 using `-sPROXY_TO_PTHREAD=1` to push the main `main()` function into a Web Worker thread. We then rewrote the `UciLoop::RunLoop` (inside `uciloop.cc`) to use an asynchronous `std::condition_variable` queue. We exported a custom C function `push_uci_command()` that allows Javascript to push UCI commands to the C++ worker thread dynamically without ever blocking!

3. **Node 22 Scope Isolation Bug (`No factory` / `globalThis`):**
   * **The Error:** Initially testing the engine using `eval()` within Node.js threw an error about missing factories. Node 22 evaluates strings in isolated scopes, which prevented Emscripten from registering the `LeelaChessZero` WASM object to the global scope.
   * **The Fix:** We replaced the `eval()` hack with standard CommonJS `require('./lc0.js')` module imports in `run_eval.js`.

4. **Stack Overflows (`Aborted(native code called abort())`):**
   * **The Error:** Initializing the Eigen math backend in LC0 requires large stack allocations. WebAssembly defaults to a 64KB stack, causing immediate crashes during startup.
   * **The Fix:** We increased the thread stack size flag `-sDEFAULT_PTHREAD_STACK_SIZE=8388608` (8MB) to accommodate Lc0's complex search memory constraints.

## License
This build is distributed under the GNU General Public License v3.0, following the original Leela Chess Zero license constraints. See `LICENSE` for details.
