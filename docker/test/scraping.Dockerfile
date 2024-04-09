FROM korvin-scraping-base:latest

WORKDIR /korvin-test

RUN apk add --update --no-cache redis

COPY ../../db ./db
COPY ../scraping ./scraping

RUN cd scraping && npm install

WORKDIR /korvin-test/scraping
