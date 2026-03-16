"""폴라로이드 스타일 이미지 합성 서비스."""
import os
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


_FONT_PATHS = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]

_BORDER_SIDE = 20   # 좌우·상단 테두리 px
_BORDER_BOTTOM = 80  # 하단 여백 px (텍스트 영역)
_TARGET_WIDTH = 1080


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in _FONT_PATHS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def generate_polaroid(photo_path: Path, title: str | None, date_str: str) -> bytes:
    """
    폴라로이드 스타일 이미지를 합성하여 JPEG bytes로 반환한다.
    - 흰색 배경, 좌우·상단 20px 테두리, 하단 80px 텍스트 영역
    - 출력 너비: 1080px
    """
    img = Image.open(str(photo_path)).convert("RGB")

    # 정방형 크롭 (중앙 기준)
    w, h = img.size
    min_dim = min(w, h)
    left = (w - min_dim) // 2
    top = (h - min_dim) // 2
    img = img.crop((left, top, left + min_dim, top + min_dim))

    # 출력 크기 계산
    photo_size = _TARGET_WIDTH - _BORDER_SIDE * 2  # 사진 영역 너비
    canvas_w = _TARGET_WIDTH
    canvas_h = _BORDER_SIDE + photo_size + _BORDER_BOTTOM

    # 캔버스 생성 (흰 배경)
    canvas = Image.new("RGB", (canvas_w, canvas_h), "white")

    # 사진 리사이즈 후 배치
    img = img.resize((photo_size, photo_size), Image.LANCZOS)
    canvas.paste(img, (_BORDER_SIDE, _BORDER_SIDE))

    # 텍스트 렌더링
    draw = ImageDraw.Draw(canvas)
    text_y_start = _BORDER_SIDE + photo_size + 12

    # 날짜 포맷 (YYYY-MM-DD → YYYY. MM. DD)
    try:
        parts = date_str[:10].split("-")
        date_display = f"{parts[0]}. {parts[1]}. {parts[2]}"
    except Exception:
        date_display = date_str[:10]

    title_font = _load_font(36)
    date_font = _load_font(28)
    text_color = (60, 60, 60)
    muted_color = (160, 160, 160)

    if title:
        # 긴 제목은 적당히 자르기
        max_title_len = 18
        display_title = title if len(title) <= max_title_len else title[:max_title_len] + "…"
        draw.text((_BORDER_SIDE, text_y_start), display_title, font=title_font, fill=text_color)
        draw.text((_BORDER_SIDE, text_y_start + 42), date_display, font=date_font, fill=muted_color)
    else:
        draw.text((_BORDER_SIDE, text_y_start + 8), date_display, font=title_font, fill=text_color)

    out = BytesIO()
    canvas.save(out, "JPEG", quality=90)
    return out.getvalue()
