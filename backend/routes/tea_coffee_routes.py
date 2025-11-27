from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime, timedelta
from config.db import mongo
from flask_cors import CORS, cross_origin

tea_coffee_bp = Blueprint("tea_coffee_bp", __name__)
CORS(tea_coffee_bp)

CUTOFF_TIME = "10:30"  # 10:30 AM cutoff

# -------------------------------
# Get Orders for Employee (15 days)
# -------------------------------
@tea_coffee_bp.route("/my_orders/<user_id>", methods=["GET"])
@cross_origin()
def get_my_orders(user_id):
    try:
        print(f"📥 Fetching orders for employee: {user_id}")

        today = datetime.now().date()
        end_date = today + timedelta(days=14)

        # Fetch orders using string employee_id
        orders = list(mongo.db.tea_coffee_orders.find({
            "employee_id": user_id,
            "date": {
                "$gte": today.isoformat(),
                "$lte": end_date.isoformat()
            }
        }))

        print(f"✅ Found {len(orders)} orders")

        for order in orders:
            order["_id"] = str(order["_id"])
            order["employee_id"] = str(order["employee_id"])

        return jsonify(orders), 200

    except Exception as e:
        print(f"❌ Error fetching orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch orders: {str(e)}"}), 500


@tea_coffee_bp.route("/place_order", methods=["POST"])
@cross_origin()
def place_order():
    try:
        data = request.get_json()
        print("\n☕ Received tea/coffee order:", data)

        employee_id = data.get("employee_id")
        date = data.get("date")
        morning = data.get("morning")
        evening = data.get("evening")

        if not employee_id or not date:
            return jsonify({"error": "Employee ID and date are required"}), 400

        if not morning and not evening:
            return jsonify({"error": "Please select at least one item"}), 400

        order_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = datetime.now().date()
        current_time = datetime.now().time()
        cutoff = datetime.strptime(CUTOFF_TIME, "%H:%M").time()

        if order_date == today and current_time >= cutoff:
            return jsonify({"error": f"Cannot place order for today after {CUTOFF_TIME}"}), 400

        if order_date < today:
            return jsonify({"error": "Cannot place order for past dates"}), 400

        # employee_id stays STRING
        try:
            emp_obj_id = ObjectId(employee_id)  # Only for user lookup
        except:
            return jsonify({"error": "Invalid employee ID"}), 400

        employee = mongo.db.users.find_one({"_id": emp_obj_id})

        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        # Use ObjectId in the query
        existing = mongo.db.tea_coffee_orders.find_one({
            "employee_id": employee_id,  # STRING
            "date": date
        })

        # Use ObjectId when saving too
        order_data = {
            "employee_id": employee_id,   # STRING
            "employee_name": employee.get("name"),
            "employee_email": employee.get("email"),
            "date": date,
            "morning": morning,
            "evening": evening,
            "updated_at": datetime.utcnow()
        }

        if existing:
            mongo.db.tea_coffee_orders.update_one(
                {"_id": existing["_id"]},
                {"$set": order_data}
            )
            message = "Order updated successfully"
        else:
            order_data["created_at"] = datetime.utcnow()
            mongo.db.tea_coffee_orders.insert_one(order_data)
            message = "Order placed successfully"

        return jsonify({"message": message}), 200

    except Exception as e:
        print("❌ Error placing order:", str(e))
        return jsonify({"error": str(e)}), 500



# ------------------------------------------
# ADMIN – GET ORDERS IN DATE RANGE
# ------------------------------------------
@tea_coffee_bp.route("/admin/orders", methods=["GET"])
@cross_origin()
def get_admin_orders():
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")

        if not start_date or not end_date:
            return jsonify({"error": "start_date and end_date are required"}), 400

        orders = list(mongo.db.tea_coffee_orders.find({
            "date": {"$gte": start_date, "$lte": end_date}
        }).sort("date", 1))

        for order in orders:
            order["_id"] = str(order["_id"])

        return jsonify(orders), 200

    except Exception as e:
        print("❌ Error fetching admin orders:", str(e))
        return jsonify({"error": str(e)}), 500


# ------------------------------------------
# CANCEL ORDER
# ------------------------------------------
@tea_coffee_bp.route("/cancel_order", methods=["DELETE"])
@cross_origin()
def cancel_order():
    try:
        data = request.get_json()
        employee_id = data.get("employee_id")
        date = data.get("date")

        if not employee_id or not date:
            return jsonify({"error": "Employee ID and date required"}), 400

        # Cutoff
        order_date = datetime.strptime(date, "%Y-%m-%d").date()
        today = datetime.now().date()
        cutoff = datetime.strptime(CUTOFF_TIME, "%H:%M").time()

        if order_date == today and datetime.now().time() >= cutoff:
            return jsonify({"error": f"Cannot cancel after {CUTOFF_TIME}"}), 400

        result = mongo.db.tea_coffee_orders.delete_one({
            "employee_id": employee_id,
            "date": date
        })

        if result.deleted_count == 0:
            return jsonify({"error": "No order found"}), 404

        return jsonify({"message": "Order cancelled successfully"}), 200

    except Exception as e:
        print("❌ Error cancelling order:", str(e))
        return jsonify({"error": str(e)}), 500


# ------------------------------------------
# TEST ENDPOINT
# ------------------------------------------
@tea_coffee_bp.route("/test", methods=["GET"])
def test_connection():
    try:
        count = mongo.db.tea_coffee_orders.count_documents({})
        return jsonify({
            "status": "OK",
            "total_orders": count,
            "timestamp": datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500