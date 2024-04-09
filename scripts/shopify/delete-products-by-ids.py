#!/usr/bin/env python3

import sys
import time

from graphql import run_query


QUERY = """
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


def delete_product_ids(product_ids):
    deleted = 0

    for i, product_id in enumerate(product_ids):
        if i:
            time.sleep(.2)

        response, _ = run_query(
            QUERY,
            {"input": {"id": "gid://shopify/Product/" + product_id}}
        )

        deleted_id = response["productDelete"]["deletedProductId"]

        print(
            f"{product_id}:",
            "OK" if deleted_id else "FAILED",
            f"({i + 1} / {len(product_ids)})",
            f"{response['productDelete']['userErrors']}" if not deleted_id else ""
        )

        deleted += bool(deleted_id)

    return deleted


def main(argv):
    if len(argv) != 2:
        print(
            f"Usage: {argv[0]} <COMMA_SEPARATED_PRODUCT_IDS>",
            file=sys.stderr
        )
        return 1

    shopify_ids = argv[1].split(",")

    start = time.time()
    print("\nDeleted", delete_product_ids(shopify_ids), "products")
    print("Done in", time.time() - start, "seconds")


if __name__ == "__main__":
    exit(main(sys.argv))
