#!/usr/bin/env python3

import sys
import csv
import requests

STORE = "korvin-luxury"
BASE_URL = f"https://{STORE}.myshopify.com"


def create_collection(token, row):
    title, product_types, tags, vendors, title_keywords = row

    type_rules = [
        {
            "column": "type",
            "relation": "equals",
            "condition": product_type
        } for product_type in filter(None, product_types.split("||"))
    ]
    tag_rules = [
        {
            "column": "tag",
            "relation": "equals",
            "condition": tag
        } for tag in filter(None, tags.split("||"))
    ]
    vendor_rules = [
        {
            "column": "vendor",
            "relation": "equals",
            "condition": vendor
        } for vendor in filter(None, vendors.split("||"))
    ]
    title_rules = [
        {
            "column": "title",
            "relation": "contains",
            "condition": keyword
        } for keyword in filter(None, title_keywords.split("||"))
    ]

    result = requests.post(
        url=BASE_URL + "/admin/api/2023-01/smart_collections.json",
        headers={
            "X-Shopify-Access-Token": token
        },
        json={
            "smart_collection": {
                "title": title,
                "rules": [
                    *type_rules,
                    *tag_rules,
                    *vendor_rules,
                    *title_rules
                ],
                "disjunctive": any(
                    len(category) > 1 for category in (
                        type_rules, tag_rules, vendor_rules, title_rules
                    )
                )
            }
        }
    )

    print(result.status_code, result.content)


def main(argv):
    if len(argv) != 3:
        print(f"Usage: {argv[0]} <TOKEN> <CSV_FILE>", file=sys.stderr)
        return 1

    _, token, filepath = argv

    with open(filepath) as file:
        *rows, = csv.reader(file)

    for row in rows[1:]:
        create_collection(token, row)


if __name__ == "__main__":
    exit(main(sys.argv))
