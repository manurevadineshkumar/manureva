import json
import os
import requests
import time

STORE = "korvin-luxury"
# STORE = "alexltest"
URL = f"https://{STORE}.myshopify.com/admin/api/2023-07/graphql.json"
ACCESS_TOKEN = os.getenv("SHOPIFY_ACCESS_TOKEN")


def run_query(query, variables):
    res = requests.request(
        "POST",
        URL,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": ACCESS_TOKEN
        },
        data=json.dumps({
            "query": query,
            "variables": variables
        })
    )

    res.raise_for_status()

    if res.json()["extensions"]["cost"]["throttleStatus"]["currentlyAvailable"] < 200:
        print("Throttling... sleeping for 10 seconds.")
        time.sleep(10)

    return res.json()["data"], res.json()["extensions"]
