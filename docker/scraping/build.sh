#!/usr/bin/env bash

# Script for building the base Scraping docker image

IMAGE_NAME=korvin-scraping-base

cp ../../scraping/package.json ../../scraping/package-lock.json .
docker build -t "$IMAGE_NAME" . || exit $?
