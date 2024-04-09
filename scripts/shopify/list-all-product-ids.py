#!/usr/bin/env python3

import json
import sys
import time

from graphql import run_query


QUERY = """
query products($after: String) {
  products(first: 250, after: $after) {
    edges {
      node {
        id
      }
    }
    pageInfo {
      endCursor
    }
  }
}
"""


def list_product_ids():
    cursor = "eyJsYXN0X2lkIjowLCJsYXN0X3ZhbHVlIjoiMCJ9"
    batch = True
    product_ids = []
    i = 0

    while batch:
        if batch is not True:
            time.sleep(5)

        result, _ = run_query(QUERY, {"after": cursor})
        batch = [
            n["node"]["id"].split("/")[-1]
            for n in result["products"]["edges"]
        ]
        cursor = result["products"]["pageInfo"]["endCursor"]
        i += len(batch)
        print(i)

        product_ids += batch

    return product_ids


def main(argv):
    if len(argv) != 1:
        print(f"Usage: {argv[0]}", file=sys.stderr)
        return 1

    print(json.dumps(list_product_ids()))


if __name__ == "__main__":
    exit(main(sys.argv))
