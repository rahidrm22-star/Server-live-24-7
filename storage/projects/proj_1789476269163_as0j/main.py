from http.server import HTTPServer, BaseHTTPRequestHandler
import json, os
port = int(os.environ.get('PORT', 3102))
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "healthy", "service": "Real Python Worker Verification Workload"}).encode())
HTTPServer(('0.0.0.0', port), Handler).serve_forever()