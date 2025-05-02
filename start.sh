#!/bin/bash

# ensure data dirs exist
mkdir -p data/uploads
mkdir -p data/qdrant
mkdir -p data/mongo

# Start with the base command and profile flags
CMD="docker-compose"

# Add profiles based on environment variables
if [ "$USE_RAG_UPLOADS" = "true" ] || [ "$USE_RAG_S3_UPLOADS" = "true" ]; then
  CMD="$CMD --profile rag_files_worker"
fi

if [ "$USE_RAG_SCRAPING" = "true" ]; then
  CMD="$CMD --profile rag_urls_worker"
fi

# Add more mappings as needed
# if [ "$SOME_OTHER_ENV" = "true" ]; then
#   CMD="$CMD --profile some_other_profile"
# fi

# Add the up and build flags at the end
CMD="$CMD up --build"

echo "Running: $CMD"
exec $CMD
