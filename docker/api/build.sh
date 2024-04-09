#!/usr/bin/env bash

# Script for building the base API docker image

IMAGE_NAME=korvin-api-base

cp ../../api/package.json ../../api/package-lock.json .
docker build -t "$IMAGE_NAME" . || exit $?
