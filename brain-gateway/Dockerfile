FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
RUN useradd -r -u 10001 fitila && mkdir /srv/cache && chown fitila:fitila /srv/cache
USER fitila
ENV PYTHONUNBUFFERED=1
EXPOSE 8091
CMD ["python", "app.py"]
