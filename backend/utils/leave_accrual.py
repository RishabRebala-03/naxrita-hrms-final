from datetime import datetime
from config.db import mongo

def accrue_monthly_leaves():
    """
    Runs on the 1st of every month to credit leaves
    1 day planned + 0.5 days sick per employee
    """
    try:
        today = datetime.utcnow()
        first_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Find all active employees
        employees = mongo.db.users.find({})
        
        updated_count = 0
        for employee in employees:
            leave_balance = employee.get("leaveBalance", {})
            last_accrual = leave_balance.get("lastAccrualDate")
            
            # Skip if already accrued this month
            if last_accrual and isinstance(last_accrual, datetime):
                if last_accrual.year == today.year and last_accrual.month == today.month:
                    continue
            
            # Credit new leaves
            leave_balance["planned"] = leave_balance.get("planned", 0) + 1.0
            leave_balance["plannedTotal"] = leave_balance.get("plannedTotal", 0) + 1.0
            leave_balance["sick"] = leave_balance.get("sick", 0) + 0.5
            leave_balance["sickTotal"] = leave_balance.get("sickTotal", 0) + 0.5
            leave_balance["lastAccrualDate"] = first_of_month
            
            # Update employee
            mongo.db.users.update_one(
                {"_id": employee["_id"]},
                {"$set": {"leaveBalance": leave_balance}}
            )
            updated_count += 1
        
        print(f"✅ Accrued leaves for {updated_count} employees")
        return {"success": True, "updated": updated_count}
        
    except Exception as e:
        print(f"❌ Accrual error: {str(e)}")
        return {"success": False, "error": str(e)}