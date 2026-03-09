import urllib.request, json
data = json.dumps({'code': 'print()', 'language': 'python'}).encode()
req = urllib.request.Request(
    'http://localhost:8000/api/problems/A0001/run/',
    data=data,
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}:\n{e.read().decode()}")
except Exception as e:
    print(f"General Error: {e}")
