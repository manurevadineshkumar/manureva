FROM python:3.10.9-slim-buster

WORKDIR /app

RUN pip install rembg[cli]

RUN apt update -y && apt install wget -y

RUN mkdir -p /root/.u2net && \
	wget -O /root/.u2net/u2net.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx && \
	wget -O /root/.u2net/u2netp.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx

CMD ["rembg", "s"]
