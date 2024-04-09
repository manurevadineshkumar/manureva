import os
import sys
import json
import requests


API_KEY = os.getenv("API_KEY")
BATCH_SIZE = 125
URL = "https://catalog.thevintagebar.com/api/v1/sellers/products"
HEADERS = {
    "Api-Key": API_KEY,
    "Content-Type": "application/json"
}


def list_all_products():
    size = BATCH_SIZE
    product_ids = []
    page = 0

    print("Listing products...")

    while size == BATCH_SIZE:
        print("\r", len(product_ids), sep="", end="")
        batch = [p["seller_sku"] for p in list_products(page)]
        size = len(batch)
        product_ids += batch
        page += 1

    print(f"\nRetrieved {len(product_ids)} ids")

    return product_ids


def list_products(page):
    resp = requests.request(
        "GET",
        URL,
        headers=HEADERS,
        params={"page": page, "size": BATCH_SIZE}
    )

    return resp.json()


def delete_products(ids):
    resp = requests.request(
        "DELETE",
        URL,
        headers=HEADERS,
        data=json.dumps(ids)
    )
    print("Delete", len(ids), ["KO", "OK"][resp.status_code == 200])

    return resp.status_code == 200


def delete(batch, failed):
    if not batch or delete_products(batch):
        return len(batch)

    mid = len(batch) // 2

    if len(batch) == 1:
        failed.append(batch[0])
        return 0

    return delete(batch[:mid], failed) + delete(batch[mid:], failed)


if not API_KEY:
    print("Error: API_KEY env var not defined", file=sys.stderr)
    exit(1)

if len(sys.argv) == 2:
    *product_ids, = map(int, sys.argv[1].split(","))
else:
    product_ids = list_all_products()

if input(f"Delete {len(product_ids)} products?").lower() != "y":
    print("Ok, bye")
    exit()

print(f"Deleting {len(product_ids)} products...")

failed = []
deleted_count = delete(product_ids, failed)

print(deleted_count, "products deleted")
print(len(failed), "products failed")
print("Failed products:", failed)
