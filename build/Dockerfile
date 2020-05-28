################
# UI build
################
FROM node:stretch-slim as build-ui
WORKDIR /app
# Copy and install deps first to cache
COPY build/ui/package.json build/ui/yarn.lock ./
RUN yarn
COPY build/ui .
RUN yarn schemas-generate
RUN yarn build
# Results in build/*

################
# Server build
################
FROM node:stretch-slim as build-server
WORKDIR /app
COPY build/server/package.json build/server/yarn.lock ./
RUN yarn
COPY build/server .
COPY --from=build-ui /app/src/common ../ui/src/common
RUN yarn prepare
RUN yarn build
# Results in build/index.js

################
# Git data
################
FROM node:stretch-slim as git-data
WORKDIR /app
RUN apt update && apt install --assume-yes git
COPY .git .git
COPY dappnode_package.json .
COPY build/getGitData.js .
RUN node getGitData /app/.git-data.json
# Results in /app/.git-data.json

################
# ethdo binary
################
FROM golang:stretch as ethdo-binary

RUN DEBIAN_FRONTEND=noninteractive \
  apt update && apt install --assume-yes --no-install-recommends \
  build-essential \
  && rm -rf /var/lib/apt/lists/*
RUN GO111MODULE=on go get github.com/wealdtech/ethdo

################
# Prysm binary
################
FROM l.gcr.io/google/bazel:3.0.0 as binary

RUN git clone https://github.com/prysmaticlabs/prysm 

RUN cd prysm && git checkout witti && bazel build //validator:validator 

################
# Final layer
################
FROM debian:stretch-slim

ENV NODE_ENV production
ENV SERVER_PORT 80
ENV CLIENT_FILES_PATH dist
ENV DATA_PATH /root/.config/ethereum2
ENV DB_API_DIR /app/db-api
ENV GIT_DATA_PATH /app/.git-data.json
ENV WORKDIR /app

# ETH2 Config
ENV ETH2_NETWORK_NAME Witti Testnet

WORKDIR ${WORKDIR}

ADD build/ssl /app/ssl
COPY --from=node:10.20.1-stretch-slim /usr/local/bin/node /usr/local/bin
COPY --from=ethdo-binary /go/bin/ethdo /usr/local/bin/ 
COPY --from=binary /prysm/bazel-bin/validator/linux_amd64_stripped/validator /usr/local/bin/validator
COPY --from=build-ui /app/build ${CLIENT_FILES_PATH}
COPY --from=build-server /app/build server
COPY --from=git-data /app/.git-data.json $GIT_DATA_PATH

RUN DEBIAN_FRONTEND=noninteractive \
  apt update && apt install --assume-yes --no-install-recommends \
  git \
  && rm -rf /var/lib/apt/lists/*

CMD ["node", "server"]
