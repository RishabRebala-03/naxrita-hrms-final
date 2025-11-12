from flask import Flask, request, jsonify
from config.db import init_db
from routes.user_routes import user_bp
from routes.leave_routes import leave_bp  
from routes.auth_routes import auth_bp
from routes.holiday_routes import holiday_bp  

app = Flask(__name__)

@app.before_request
def log_request():
    print(f"\n🔍 Incoming {request.method} request to {request.path}")
    print(f"   Origin: {request.headers.get('Origin')}")
    print(f"   Headers: {dict(request.headers)}")

@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        print("✅ Handling OPTIONS/preflight request")
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '3600'
        print(f"   Response headers: {dict(response.headers)}")
        return response, 200

@app.after_request
def after_request(response):
    print(f"📤 Sending response with status {response.status_code}")
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    print(f"   Final headers: {dict(response.headers)}")
    return response

# Initialize MongoDB
init_db(app)

# Register routes
app.register_blueprint(user_bp, url_prefix="/api/users")
app.register_blueprint(leave_bp, url_prefix="/api/leaves")  # ✅ NEW
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(holiday_bp, url_prefix="/api/holidays") # ✅ NEW

if __name__ == "__main__":
    app.run(debug=True, host='127.0.0.1', port=5000)