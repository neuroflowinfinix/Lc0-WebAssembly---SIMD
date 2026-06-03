import http.server
import socketserver
import os

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable Cross-Origin Isolation for SharedArrayBuffer (pthreads in WASM)
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

    def do_GET(self):
        # Handle Brotli transparently
        path = self.translate_path(self.path)
        br_path = path + '.br'
        
        # If the browser accepts brotli and we have a .br file
        if os.path.exists(br_path) and not path.endswith('.br'):
            # Override the path to point to the .br file
            self.path += '.br'
            
            # Save the original guess_type logic
            orig_guess_type = self.guess_type
            def custom_guess_type(path):
                # Guess type based on original path, not .br
                return orig_guess_type(path[:-3])
            self.guess_type = custom_guess_type
            
            # Send the file
            f = self.send_head()
            if f:
                # Inject the encoding header manually since send_head doesn't
                self.send_header('Content-Encoding', 'br')
                self.end_headers()
                try:
                    self.copyfile(f, self.wfile)
                finally:
                    f.close()
        else:
            super().do_GET()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}/test.html")
        httpd.serve_forever()
