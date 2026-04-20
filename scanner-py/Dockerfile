FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PY_BARCODE_PORT=8765

COPY requirements.txt ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends libzbar0 \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8765

# Chạy non-root (an toàn hơn)
RUN useradd -u 10001 -g users app && chown -R app:users /app
USER app

# Healthcheck đơn giản: kiểm tra process python còn chạy
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD python -c "import os,signal; os.kill(1,0)" || exit 1

CMD ["python","server.py"]

