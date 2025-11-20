from datetime import datetime
from config.db import mongo

def reset_sick_leaves_new_year():
    """
    Resets sick leave balance to total at the start of each year.
    Planned leaves are carried forward (not reset).
    This should run on January 1st at midnight.
    """
    try:
        print("🔄 Running year-end leave reset...")
        
        # Get all users
        users = list(mongo.db.users.find())
        
        reset_count = 0
        for user in users:
            if "leaveBalance" in user:
                balance = user["leaveBalance"]
                
                # Reset sick leave to total
                sick_total = balance.get("sickTotal", 6)
                
                # Keep planned leave as-is (carry forward)
                # Update the balance
                mongo.db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {
                        "leaveBalance.sick": sick_total,
                        "leaveBalance.lastResetDate": datetime.utcnow()
                    }}
                )
                reset_count += 1
                print(f"✅ Reset sick leave for {user.get('name', 'Unknown')} to {sick_total}")
        
        print(f"✅ Year-end reset complete! Reset {reset_count} users")
        return {"success": True, "reset_count": reset_count}
        
    except Exception as e:
        print(f"❌ Error during year-end reset: {str(e)}")
        return {"success": False, "error": str(e)}