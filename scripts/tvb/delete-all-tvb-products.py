import os
import sys
import time
import json
import requests

API_KEY = os.getenv("VINTAGE_BAR_TOKEN")
URL = "https://catalog.thevintagebar.com/api/v1/sellers/products"
HEADERS = {
    "Api-Key": API_KEY,
    "Content-Type": "application/json"
}

def list_products(page):
    print()
    print("Fetching products from page", page, "...")
    response = requests.get(
        URL,
        headers=HEADERS,
        params={"page": page, "size": 25}
    )
    print("HTTP code", response.status_code)

    response_data = response.json()

    skus = [item["seller_sku"] for item in response_data]
    print("Found", len(skus), "products")
    print(skus)
    return skus

def delete_products(skus):
    print("Deleting products...")
    response = requests.delete(
        URL,
        headers=HEADERS,
        data=json.dumps(skus)
    )
    print("HTTP code", response.status_code)

    response_data = response.json()

    [print(key, value) for key,value in response_data.items()]
    


if __name__ == "__main__":
    if not API_KEY:
        print("Error: VINTAGE_BAR_TOKEN env var not defined", file=sys.stderr)
        exit(1)

    print("This script will delete ALL the products on The Vintage Bar")
    print("Do you want to continue ? (YES/NO)")

    if input() != "YES":
        print("Abort")
        exit(1)

    page = 0
    product_skus = list_products(page)
    while len(product_skus) > 0:
        delete_products(product_skus)
        page += 1
        product_skus = list_products(page)

    print("WARNING, the script has finished but there might be some products left. Please check manually.")

    exit(0)