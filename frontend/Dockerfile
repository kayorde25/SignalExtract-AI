FROM python:3.11-slim

WORKDIR /app

# Copy dependencies
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy all frontend files
COPY . .

# Cloud Run expects PORT
ENV PORT=8080

# Run Streamlit
CMD streamlit run streamlit_app.py \
    --server.port=$PORT \
    --server.address=0.0.0.0 \
    --server.enableCORS=false \
    --server.enableXsrfProtection=false