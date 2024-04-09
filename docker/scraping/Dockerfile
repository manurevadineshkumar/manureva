FROM node:18-alpine

WORKDIR /korvin-scraping

COPY package.json package-lock.json ./

ENV CHROME_BIN="/usr/bin/chromium-browser" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"

RUN apk add --no-cache chromium

RUN npm i
