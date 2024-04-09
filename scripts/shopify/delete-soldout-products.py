#!/usr/bin/env python3

import os
import sys
import requests
import time
from datetime import datetime

from graphql import run_query


LIST_PRODUCTS_QUERY = """
query products($after: String) {
    products(first: 250, after: $after) {
        edges {
            node {
                id
                totalInventory
            }
        }
        pageInfo {
            endCursor
            hasNextPage
        }
    }
}
"""


DELETE_PRODUCT_QUERY = """
mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
        deletedProductId
        userErrors {
            field
            message
        }
    }
}
"""


def get_shopify_product_count():
    response = requests.get(
        "https://korvin-luxury.myshopify.com/admin/api/2023-07/products/count.json",
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": os.getenv("SHOPIFY_ACCESS_TOKEN")
        }
    )
    return response.json()["count"]


def get_products(cursor = None):
    result, extensions = run_query(LIST_PRODUCTS_QUERY, {"after": cursor})
    return result, extensions


def delete_product(product_id):
    result, extensions = run_query(DELETE_PRODUCT_QUERY, {"input": {"id": product_id}})
    return result, extensions


def process_products(products, filename):
    print(f"Processing {len(products)} products...")
    count = 0
    count_deleted = 0

    with open(filename, 'a') as f:
        for product in products:
            count += 1
            if product["node"]["totalInventory"] == 0:
                print(f"({total + count}/{shopify_product_count}) Deleting product {product['node']['id']}")
                if not dry_run:
                    result, _ = delete_product(product["node"]["id"])

                    if len(result["productDelete"]["userErrors"]) > 0:
                        print(f"Error deleting product {product['node']['id']}: {result['productDelete']['userErrors']}")
                        continue

                print("  Write id to file")
                f.write(f"{product['node']['id']}\n")

                count_deleted += 1
            else:
                print(f"({total + count}/{shopify_product_count}) Skip product {product['node']['id']}")
    
    return count, count_deleted


def delete_soldout_products():
    now = datetime.now()
    filename = f"delete-soldout-products{'-DRYRUN' if dry_run == True else ''}-{now.strftime('%Y_%m_%d_%H_%M_%S')}.txt"
    print(f"Writing to file {filename}")

    global shopify_product_count
    shopify_product_count = get_shopify_product_count()

    global total
    total = 0
    total_deleted = 0

    cursor = None
    last_page = False

    while not last_page:
        result, _ = get_products(cursor)

        cursor = result["products"]["pageInfo"]["endCursor"]
        if result["products"]["pageInfo"]["hasNextPage"] is False:
            last_page = True

        products = result["products"]["edges"]
        count, count_deleted = process_products(products, filename)
        total += count
        total_deleted += count_deleted

    summary = f"Total products: {total} - Total deleted: {total_deleted} - Total remaining: {total - total_deleted}\n"
    with open(filename, 'a') as f:
        f.write(summary)
    print(summary)


def main(argv):
    global dry_run
    dry_run = True

    if len(argv) < 1 or len(argv) > 2:
        print(f"Usage: {argv[0]} [--delete]", file=sys.stderr)
        exit(1)
    
    if len(argv) == 2 and argv[1] != "--delete":
        print(f"Usage: {argv[0]} [--delete]", file=sys.stderr)
        exit(1)
    elif len(argv) == 2 and argv[1] == "--delete":
        dry_run = False
        print("Running in delete mode...")
        input("Press Enter to continue...")
    else:
        print("Running in dry-run mode...")

    delete_soldout_products()


if __name__ == "__main__":
    main(sys.argv)
    exit(0)