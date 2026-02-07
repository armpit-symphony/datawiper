from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', '')


# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str


class BrokerEntry(BaseModel):
    id: str
    name: str
    opt_out_url: str
    form_type: str = 'web'
    required_fields: List[str] = []
    verification_steps: Optional[str] = ''
    response_time: Optional[str] = ''
    follow_up_guidance: Optional[str] = ''

class BrokerPackCreate(BaseModel):
    version: str
    brokers: List[BrokerEntry]
    notes: Optional[str] = None
    updated_at: Optional[str] = None

@api_router.get("/broker-packs/latest", response_model=BrokerPack)
async def get_latest_broker_pack():
    latest_version = await get_latest_version()
    if not latest_version:
        raise HTTPException(status_code=404, detail="No broker packs available")

    pack = await broker_packs_collection().find_one({"_id": latest_version})
    if not pack:
        raise HTTPException(status_code=404, detail="Broker pack not found")
    return BrokerPack(**sanitize_pack(pack))


@api_router.get("/broker-packs/{version}", response_model=BrokerPack)
async def get_broker_pack(version: str):
    pack = await broker_packs_collection().find_one({"_id": version})
    if not pack:
        raise HTTPException(status_code=404, detail="Broker pack not found")
    return BrokerPack(**sanitize_pack(pack))


@api_router.post("/broker-packs", response_model=BrokerPack)
async def create_broker_pack(payload: BrokerPackCreate, authorization: Optional[str] = Header(None)):
    verify_admin_token(authorization)

    existing = await broker_packs_collection().find_one({"_id": payload.version})
    if existing:
        raise HTTPException(status_code=409, detail="Broker pack version already exists")

    created_at = datetime.utcnow().isoformat()
    updated_at = payload.updated_at or created_at

    pack_dict = payload.dict()
    pack_dict.update({
        "_id": payload.version,
        "created_at": created_at,
        "updated_at": updated_at
    })

    await broker_packs_collection().insert_one(pack_dict)
    await broker_pack_meta_collection().update_one(
        {"_id": "latest"},
        {"$set": {"version": payload.version, "updated_at": created_at}},
        upsert=True
    )

    return BrokerPack(**sanitize_pack(pack_dict))


class BrokerPack(BaseModel):
    version: str
    created_at: str
    updated_at: str
    brokers: List[BrokerEntry]
    notes: Optional[str] = None


def verify_admin_token(authorization: Optional[str]) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=500, detail="Admin token not configured")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.split(" ", 1)[1]
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


def sanitize_pack(pack: dict) -> dict:
    cleaned = {**pack}
    cleaned.pop("_id", None)
    return cleaned


def broker_packs_collection():
    return db.broker_packs


def broker_pack_meta_collection():
    return db.broker_pack_meta


async def get_latest_version() -> Optional[str]:
    meta = await broker_pack_meta_collection().find_one({"_id": "latest"})
    if meta and meta.get("version"):
        return meta["version"]

    latest = (
        await broker_packs_collection()
        .find()
        .sort("created_at", -1)
        .limit(1)
        .to_list(1)
    )
    if not latest:
        return None
    return latest[0].get("version")

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
