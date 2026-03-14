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


class MomentSummary(BaseModel):
    id: int
    date: str
    title: str | None
    photo_count: int
    representative_photo_id: int | None
    representative_thumbnail: str | None


class MomentDetail(BaseModel):
    id: int
    date: str
    title: str | None
    diary: str | None
    location: str | None
    photos: list[PhotoInfo]
