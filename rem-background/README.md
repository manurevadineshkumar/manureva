# Korvin: Background Remover

It uses a neural network to remove the background of an image. It is based on the [rembg](https://github.com/danielgatis/rembg)

## Installation

The api is full dockerized, so you can run it with docker-compose:

```bash
docker-compose up -d
```

## API Usage

**Endpoint**: `http://0.0.0.0:5000/?model=u2netp&url=https://static.korvin.io/products/00012534/0000.jpg`

**Params**:
- `model`: `u2net` or `u2netp` (default: `u2net`)
- `url`: url of the image


## Script Usage

Script is located at `example.sh`

```bash
./example.sh file model
```

**Arguments**:
- `file`: path to the image
- `model`: `u2net` or `u2netp`


## Production

The production is accessible at [https://rembg.korvin.io/](https://rembg.korvin.io/) :rocket:
