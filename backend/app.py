from flask import Flask, request, jsonify
from config.db import init_db
from routes.user_routes import user_bp
from routes.leave_routes import leave_bp  
from routes.auth_routes import auth_bp
from routes.holiday_routes import holiday_bp  
from routes.log_routes import log_bp
from apscheduler.schedulers.background import BackgroundScheduler
from utils.leave_accrual import accrue_monthly_leaves
from utils.year_end_reset import reset_sick_leaves_new_year 

app = Flask(__name__, static_url_path="/static", static_folder="static")

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
app.register_blueprint(log_bp, url_prefix="/api/logs")

scheduler = BackgroundScheduler()
# Monthly leave accrual (1st of every month)
scheduler.add_job(func=accrue_monthly_leaves, trigger="cron", day=1, hour=0, minute=1)
# Year-end sick leave reset (January 1st at midnight)
scheduler.add_job(func=reset_sick_leaves_new_year, trigger="cron", month=1, day=1, hour=0, minute=0)
scheduler.start()

if __name__ == "__main__":
    app.run(debug=True, host='127.0.0.1', port=5000)