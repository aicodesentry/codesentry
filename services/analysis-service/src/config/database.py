from motor.motor_asyncio import AsyncIOMotorClient
import os
import ssl
import certifi

MONGODB_URL = os.getenv("MONGODB_URL")
MONGO_ENABLED = bool(MONGODB_URL)
if not MONGO_ENABLED:
    print("⚠️  MONGODB_URL not set. MongoDB storage disabled.")

# Ensure MongoDB Atlas connection string has proper format
# Expected format: mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
if MONGO_ENABLED and "mongodb+srv://" in MONGODB_URL:
    # Add missing parameters if not present
    if "retryWrites" not in MONGODB_URL:
        separator = "&" if "?" in MONGODB_URL else "?"
        MONGODB_URL = f"{MONGODB_URL}{separator}retryWrites=true&w=majority"
        print("⚠️  Added retryWrites=true&w=majority to MongoDB URL")

DATABASE_NAME = "analysis_results"

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def connect_to_mongo():
    """Connect to MongoDB and verify connection"""
    if not MONGO_ENABLED:
        return
    try:
        is_srv_url = "mongodb+srv://" in MONGODB_URL

        client_options = {
            "serverSelectionTimeoutMS": 5000,
            "connectTimeoutMS": 10000,
            "socketTimeoutMS": 10000,
        }

        if is_srv_url:
            client_options.update({
                "tls": True,
                "tlsCAFile": certifi.where(),
            })

        db.client = AsyncIOMotorClient(
            MONGODB_URL,
            **client_options
        )

        # Actually test the connection by pinging
        await db.client.admin.command('ping')
        print("✓ MongoDB connected successfully")

        # Get database info
        database = db.client[DATABASE_NAME]
        print(f"✓ Using database: {DATABASE_NAME}")

        # List existing collections
        collections = await database.list_collection_names()
        if collections:
            print(f"✓ Existing collections: {', '.join(collections)}")
        else:
            print("⚠️  No collections yet - will be created on first write")

        # Initialize database (create collections and indexes)
        await initialize_database()

    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {str(e)}")
        print(f"Connection string (without credentials): {MONGODB_URL.split('@')[1] if '@' in MONGODB_URL else 'invalid'}")
        raise

async def initialize_database():
    """Initialize database collections and indexes"""
    if not MONGO_ENABLED or not db.client:
        return
    try:
        database = db.client[DATABASE_NAME]

        # Create 'analyses' collection if it doesn't exist
        collections = await database.list_collection_names()
        if 'analyses' not in collections:
            # Create collection by inserting a dummy document and then removing it
            await database.analyses.insert_one({"_init": True})
            await database.analyses.delete_one({"_init": True})
            print("✓ Created 'analyses' collection")

        # Create indexes for better query performance
        await database.analyses.create_index("analysis_id", unique=True)
        await database.analyses.create_index("repository")
        await database.analyses.create_index("pr_number")
        await database.analyses.create_index([("repository", 1), ("pr_number", 1)])
        await database.analyses.create_index("timestamp")

        print("✓ Database indexes created")

        # Verify database was created in Atlas
        db_list = await db.client.list_database_names()
        if DATABASE_NAME in db_list:
            print(f"✓ Database '{DATABASE_NAME}' verified in MongoDB Atlas")
        else:
            print(f"⚠️  Database '{DATABASE_NAME}' not yet visible in Atlas (will appear after first real write)")

    except Exception as e:
        print(f"⚠️  Failed to initialize database: {str(e)}")
        # Don't raise - let the service start anyway

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("MongoDB connection closed")

def get_database():
    if not db.client:
        raise RuntimeError("Database client not initialized. Call connect_to_mongo() first.")
    return db.client[DATABASE_NAME]
