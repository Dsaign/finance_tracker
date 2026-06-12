import datetime
from pydantic import BaseModel
from app.models.import_file import ImportStatus


class ImportResponse(BaseModel):
    id: int
    account_id: int
    filename: str
    file_hash: str
    status: ImportStatus
    imported_at: datetime.datetime

    model_config = {"from_attributes": True}


class ImportResult(BaseModel):
    import_file_id: int
    filename: str
    total_parsed: int
    total_inserted: int
