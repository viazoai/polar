FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi-dev \
    fonts-nanum \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 개발 환경: docker-compose.yml에서 --reload 옵션 추가
# 프로덕션 환경: 이 CMD를 그대로 사용
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
