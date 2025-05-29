from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS 헤더
        self.send_header('Access-Control-Allow-Origin', '*')
        # COOP/COEP 헤더 추가
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        SimpleHTTPRequestHandler.end_headers(self)

port = 8000
httpd = HTTPServer(('localhost', port), CORSRequestHandler)
print(f"Serving at port {port}")
httpd.serve_forever()