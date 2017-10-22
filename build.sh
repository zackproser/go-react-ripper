#!/usr/bin/env bash
echo "Building go-react-ripper..."

GOOS=linux go build

echo "Bulding react UI..."

cd ./ui && npm run build

cd ..

docker build .
