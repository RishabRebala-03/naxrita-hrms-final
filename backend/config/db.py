from pymongo import MongoClient
from .settings import settings

_client = None
_db = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=3000
        )
    return _client

def get_db():
    global _db
    if _db is None:
        _db = get_client()[settings.DB_NAME]
    return _db
