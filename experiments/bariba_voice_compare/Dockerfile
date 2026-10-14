FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY requirements.txt /srv/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt fastapi 'uvicorn[standard]'
COPY compare.py service.py /srv/
RUN useradd -r -u 10001 fitila && chown -R fitila:fitila /srv
USER fitila
EXPOSE 8090
CMD ["uvicorn","service:app","--host","0.0.0.0","--port","8090"]
