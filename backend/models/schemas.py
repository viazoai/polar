from pydantic import BaseModel


class PhotoUploadResponse(BaseModel):
    id: int
    moment_id: int
    file_path: str
    thumbnail_gallery: str
    thumbnail_list: str
    taken_at: str
    has_exif_date: bool


class PhotoInfo(BaseModel):
    id: int
    thumbnail_gallery: str
    thumbnail_list: str
    taken_at: str


class PersonTag(BaseModel):
    family_member_id: int
    name: str
    confidence: str  # high | medium | low
    is_confirmed: bool


class MomentSummary(BaseModel):
    id: int
    date: str
    title: str | None
    photo_count: int
    representative_photo_id: int | None
    representative_thumbnail: str | None
    ai_status: str  # pending | done | failed


class MomentDetail(BaseModel):
    id: int
    date: str
    title: str | None
    diary: str | None
    location: str | None
    ai_status: str
    content_source: str | None  # None | 'ai' | 'manual'
    representative_photo_id: int | None
    people: list[PersonTag]
    photos: list[PhotoInfo]


class FamilyMember(BaseModel):
    id: int
    name: str
    reference_photos: list[str]


class FamilyMemberCreate(BaseModel):
    name: str


class FamilyMemberUpdate(BaseModel):
    name: str | None = None


class MomentUpdate(BaseModel):
    title: str | None = None
    diary: str | None = None
    date: str | None = None  # YYYY-MM-DD


class MomentSplitRequest(BaseModel):
    photo_ids: list[int]  # 새 순간으로 분리할 사진 ID 목록


class MomentMergeRequest(BaseModel):
    source_moment_id: int  # 이 순간으로 합쳐질 순간 ID


class PersonTagUpdate(BaseModel):
    family_member_id: int
