"""GPT-4o Vision 기반 AI 분석 서비스.

- analyze_photo(): 사진 → 감성 제목 + 일기 생성
- identify_people(): 사진 + 참조 사진 → 인물 식별
"""
import base64
import io
import json
import logging
import time

from PIL import Image

from config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

# GPT-4o Vision API에 전달할 최대 이미지 크기 (비용 절감)
_AI_IMAGE_MAX_PX = 1024


def _resize_for_api(image_bytes: bytes) -> str:
    """이미지를 최대 _AI_IMAGE_MAX_PX 크기로 줄이고 base64 JPEG로 반환."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((_AI_IMAGE_MAX_PX, _AI_IMAGE_MAX_PX), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def _get_client():
    """OpenAI 클라이언트 (지연 초기화)."""
    from openai import OpenAI
    return OpenAI(api_key=OPENAI_API_KEY)


def analyze_photo(image_bytes: bytes) -> dict | None:
    """사진을 분석하여 감성 제목과 일기를 생성한다.

    Returns:
        {"title": str, "diary": str} 또는 실패 시 None
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY가 설정되지 않아 AI 분석을 건너뜁니다")
        return None

    b64 = _resize_for_api(image_bytes)
    client = _get_client()

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "당신은 가족의 일상을 기록하는 다정하고 살짝 장난스러운 AI 일기 작가입니다. "
                            "말투는 친한 친구가 사진을 보며 얘기해주는 느낌으로, 존댓말 대신 ~했지, ~였어 같은 반말 일기체를 사용하세요. "
                            "이모티콘은 1~2개만 자연스럽게 섞어주세요 (🌞🍃😊 등). 과하게 넣지 마세요.\n"
                            "반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.\n"
                            '{"title": "한 줄 감성 제목", "diary": "2~3문장의 다정한 일기"}'
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "이 가족 사진을 보고 제목과 일기를 써줘. "
                                    "제목은 한 줄로 짧고 감성적으로 (예: '햇살이 참 좋았던 날 🌞'), "
                                    "일기는 2~3문장으로 사진 속 순간을 다정하게, 약간 장난스럽게 써줘. "
                                    "너무 진지하지 않게, 가족 앨범에 적어두는 메모 느낌으로."
                                ),
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
                            },
                        ],
                    },
                ],
                max_tokens=300,
                temperature=0.8,
            )

            # 토큰 사용량 로깅
            usage = response.usage
            if usage:
                logger.info(
                    "AI analyze_photo 완료 | prompt=%d completion=%d total=%d",
                    usage.prompt_tokens,
                    usage.completion_tokens,
                    usage.total_tokens,
                )

            raw = response.choices[0].message.content or ""
            # 마크다운 코드 블록 제거
            raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            data = json.loads(raw)
            return {"title": str(data.get("title", "")), "diary": str(data.get("diary", ""))}

        except json.JSONDecodeError as e:
            logger.warning("AI 응답 JSON 파싱 실패 (시도 %d/3): %s", attempt + 1, e)
        except Exception as e:
            logger.warning("AI analyze_photo 오류 (시도 %d/3): %s", attempt + 1, e)
            if attempt < 2:
                time.sleep(1)

    return None


def identify_people(image_bytes: bytes, family_members: list[dict]) -> list[dict]:
    """사진에서 가족 구성원을 식별한다.

    Args:
        image_bytes: 분석할 사진
        family_members: [{"id": int, "name": str, "reference_photos": list[str]}]
            reference_photos: 참조 사진 파일 경로 리스트

    Returns:
        [{"family_member_id": int, "name": str, "confidence": str}]
        confidence: "high" | "medium" | "low"
    """
    if not OPENAI_API_KEY:
        return []
    if not family_members:
        return []

    # 참조 사진이 있는 구성원만 처리
    members_with_refs = [m for m in family_members if m.get("reference_photos")]
    if not members_with_refs:
        return []

    b64_main = _resize_for_api(image_bytes)
    client = _get_client()

    # 메시지 구성: 분석 대상 사진 + 구성원별 참조 사진
    content: list = [
        {
            "type": "text",
            "text": (
                "아래는 분석할 가족 사진(첫 번째 이미지)과 가족 구성원 참조 사진들입니다. "
                "분석 대상 사진에 등장하는 가족 구성원을 식별해주세요.\n\n"
                "가족 구성원 목록:\n"
                + "\n".join(
                    f"- {m['name']} (참조 사진 {len(m['reference_photos'])}장 제공)"
                    for m in members_with_refs
                )
                + "\n\n"
                "반드시 아래 JSON 형식으로만 응답하세요:\n"
                '{"people": [{"name": "이름", "confidence": "high|medium|low"}]}\n'
                "사진에 없는 사람은 포함하지 마세요."
            ),
        },
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64_main}", "detail": "low"},
        },
    ]

    # 참조 사진 추가
    for member in members_with_refs:
        for ref_path in member["reference_photos"][:2]:  # 참조 사진 최대 2장
            try:
                with open(ref_path, "rb") as f:
                    ref_bytes = f.read()
                ref_b64 = _resize_for_api(ref_bytes)
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{ref_b64}",
                            "detail": "low",
                        },
                    }
                )
            except Exception as e:
                logger.warning("참조 사진 로드 실패 (%s): %s", ref_path, e)

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "당신은 가족 사진에서 인물을 식별하는 AI입니다. 요청된 JSON 형식으로만 응답하세요.",
                    },
                    {"role": "user", "content": content},
                ],
                max_tokens=200,
                temperature=0.2,
            )

            usage = response.usage
            if usage:
                logger.info(
                    "AI identify_people 완료 | prompt=%d completion=%d total=%d",
                    usage.prompt_tokens,
                    usage.completion_tokens,
                    usage.total_tokens,
                )

            raw = response.choices[0].message.content or ""
            raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            data = json.loads(raw)

            # 이름 → family_member_id 매핑
            name_to_id = {m["name"]: m["id"] for m in members_with_refs}
            result = []
            for p in data.get("people", []):
                member_id = name_to_id.get(p.get("name", ""))
                if member_id:
                    result.append(
                        {
                            "family_member_id": member_id,
                            "name": p["name"],
                            "confidence": p.get("confidence", "medium"),
                        }
                    )
            return result

        except json.JSONDecodeError as e:
            logger.warning("AI 인물 식별 JSON 파싱 실패 (시도 %d/3): %s", attempt + 1, e)
        except Exception as e:
            logger.warning("AI identify_people 오류 (시도 %d/3): %s", attempt + 1, e)
            if attempt < 2:
                time.sleep(1)

    return []
