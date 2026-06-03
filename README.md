# Lc0 WebAssembly Engine (SIMD & Thread Optimized)

This repository contains the officially compiled **WebAssembly** (WASM) build of the [Leela Chess Zero (Lc0)](https://github.com/LeelaChessZero/lc0) chess engine. 

This specific build represents the **state-of-the-art** for running Lc0 in a web browser. It is highly optimized with **WebAssembly SIMD (128-bit vectorization)**, **Web Workers (Pthreads)**, and **Brotli Level 11 Compression**.

## Features & Highlights
* **Threaded Background Execution:** Compiled with `-sUSE_PTHREADS=1` and `-sPROXY_TO_PTHREAD=1`. The engine's heavy infinite search loop runs quietly on a background Web Worker, ensuring your browser's main UI thread stays 100% responsive.
* **SIMD Accelerated:** Compiled with `-msimd128` to leverage hardware-level vector instructions for the Eigen math backend, maximizing Nodes Per Second (NPS) inside the browser.
* **Maximum Compression:** The engine files have been pre-compressed using **Brotli Quality 11** (`.br` files). A smart web host (like Cloudflare/Vercel) will serve these tiny files automatically, drastically reducing download times.
* **Integrated NNUE:** The neural network weights (`LittleEnder 2x32`) are embedded directly into the WASM binary. No external network files need to be fetched!
* **Asynchronous UCI Communication:** We exported a custom `push_uci_command()` function that allows your JavaScript to safely push UCI commands to the C++ worker thread dynamically without ever blocking.

## Size Information (SIMD Build)
* **Raw WASM Size:** `~8.6 MB` (Includes the engine + the embedded neural network).
* **Brotli Compressed Size:** `~7.0 MB` (The actual size downloaded over the network!).
* *(Note: While 7MB is incredibly small for a neural network engine, to get the size even smaller you would need to compile a custom build using a highly quantized "tiny" architecture).*

---

## How to Run & Deploy

Because this engine uses multi-threading (`Pthreads`), your environment must support `SharedArrayBuffer`. This requires strict cross-origin isolation policies (COOP/COEP headers). You cannot open the HTML file using `file://`.

### Local Testing
1. Clone this repository or extract the files.
2. Open a terminal in the root folder.
3. Start the included Python smart server (which automatically serves the `.br` files and sets the correct COOP/COEP headers):
   ```bash
   python serve_test.py
   ```
4. Open your browser and navigate to [http://localhost:8080/test.html](http://localhost:8080/test.html).
5. The UI will stay perfectly responsive while the engine searches in the background!

### Production Deployment
To host this engine on a live website, you must ensure your web host sends the following HTTP headers for `SharedArrayBuffer` to work:
* `Cross-Origin-Opener-Policy: same-origin`
* `Cross-Origin-Embedder-Policy: require-corp`

**Recommended Hosts:**
* **Cloudflare Pages / Vercel:** These modern hosts will automatically serve your raw `.wasm` files using Brotli compression on the fly. You can safely delete the `.br` files from your repository and just configure the COOP/COEP headers in your `_headers` or `vercel.json` config.
* **Basic Static Servers (Apache/Nginx):** If your server does not compress files automatically, keep the `.br` files and configure your server to route `.wasm` requests to `.wasm.br` with `Content-Encoding: br`.

## Technical Details: Errors Overcome During Compilation

Porting a complex C++ project like Lc0 to WebAssembly comes with heavy challenges. Below are the core issues we resolved to achieve this build:

1. **Virtual Filesystem Crashing (`RuntimeError: unreachable`):**
   * **The Error:** Lc0 uses `std::ifstream` and `std::filesystem` extensively to load its `.pb.gz` network file. Emscripten's virtual filesystem (MEMFS) struggles with deep filesystem abstraction calls, causing the engine to trap with an `unreachable` exception when initializing the network backend.
   * **The Fix:** We completely bypassed the virtual filesystem. We converted the network into a C-style hex array (`embedded_net.h`), and rewrote `loader.cc` to load the byte array directly from RAM, skipping the standard library file streams entirely.

2. **Synchronous `stdin` Deadlocks (Main Thread Freezing):**
   * **The Error:** Standard C++ `std::getline(std::cin, ...)` acts synchronously. When running inside a browser, waiting for user input completely hangs the execution thread, causing the tab to freeze.
   * **The Fix:** We compiled Lc0 using `-sPROXY_TO_PTHREAD=1` to push the `main()` function into a Web Worker thread. We then rewrote the `UciLoop::RunLoop` (inside `uciloop.cc`) to use an asynchronous `std::condition_variable` queue.

3. **SSE Compatability Crashes (`unreachable` during Search):**
   * **The Error:** Compiling with `-msse2` triggered Emscripten's SSE emulation headers. Eigen matrix operations attempting to use these emulated intrinsic headers crashed instantly during evaluation.
   * **The Fix:** We stripped all references to `emmintrin.h` and `xmmintrin.h` from the Lc0 codebase (patching `mutex.h`) and used pure `-msimd128` to rely entirely on LLVM auto-vectorization instead of emulated SSE.

## Credits
* **_neuroflowinfinix:** Creator and maintainer of this specialized WebAssembly port.
* **[Leela Chess Zero (Lc0) Contributors](https://github.com/LeelaChessZero/lc0):** For developing the incredible open-source neural network chess engine.
* **[nmrugg (Stockfish.js)](https://github.com/nmrugg/stockfish.js/):** For the initial inspiration and pioneering work on highly-optimized, multi-threaded WASM chess engines in the browser.

## License
This build is distributed under the GNU General Public License v3.0, following the original Leela Chess Zero license constraints. See `LICENSE` for details.
