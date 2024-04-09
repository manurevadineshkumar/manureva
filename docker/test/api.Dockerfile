FROM node:18-alpine

WORKDIR /korvin-test

COPY ../../api ./api
COPY ../../db ./db

RUN cd ./api/ && npm i

WORKDIR /korvin-test/api
