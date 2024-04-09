#!/usr/bin/env python3

import sys
import csv
import json


ALLOWED_COUNTRY_CODES = {
    "AF", "AX", "AL", "DZ", "AD", "AO", "AI", "AG", "AR", "AM", "AW", "AC",
    "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM",
    "BT", "BO", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF", "BI", "KH",
    "CA", "CV", "BQ", "KY", "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM",
    "CG", "CD", "CK", "CR", "HR", "CU", "CW", "CY", "CZ", "CI", "DK", "DJ",
    "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO",
    "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE", "GH", "GI",
    "GR", "GL", "GD", "GP", "GT", "GG", "GN", "GW", "GY", "HT", "HM", "VA",
    "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT",
    "JM", "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "XK", "KW", "KG", "LA",
    "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MG", "MW", "MY",
    "MV", "ML", "MT", "MQ", "MR", "MU", "YT", "MX", "MD", "MC", "MN", "ME",
    "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "AN", "NC", "NZ", "NI",
    "NE", "NG", "NU", "NF", "MK", "NO", "OM", "PK", "PS", "PA", "PG", "PY",
    "PE", "PH", "PN", "PL", "PT", "QA", "CM", "RE", "RO", "RU", "RW", "BL",
    "SH", "KN", "LC", "MF", "PM", "WS", "SM", "ST", "SA", "SN", "RS", "SC",
    "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "KR", "SS", "ES",
    "LK", "VC", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH",
    "TL", "TG", "TK", "TO", "TT", "TA", "TN", "TR", "TM", "TC", "TV", "UG",
    "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU", "VE", "VN", "VG", "WF",
    "EH", "YE", "ZM", "ZW", "ZZ"
}

"""
mutation deliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
  deliveryProfileUpdate(id: $id, profile: $profile) {
    profile {
      id
      name
    }
    userErrors {
      field
      message
    }
  }
}
"""


def get_zones(countries, costs):
    zones = {}

    for code, zone in countries:
        if not zone or code not in ALLOWED_COUNTRY_CODES:
            continue

        if zone not in zones:
            zones[zone] = {
                "name": f"Zone-{zone:02}",
                "countries": [],
                "methodDefinitionsToCreate": []
            }

        zones[zone]["countries"].append({
            "code": code,
            "includeAllProvinces": True
        })

    for weight, zone, price in costs:
        if not weight:
            continue

        zones[zone]["methodDefinitionsToCreate"].append({
            "active": True,
            "name": f"{(weight - 500) / 1000:04.1f}-{weight / 1000:04.1f} kg",
            "rateDefinition": {
                "price": {
                    "amount": price,
                    "currencyCode": "EUR"
                }
            },
            "weightConditionsToCreate": [
                {
                    "criteria": {
                        "unit": "KILOGRAMS",
                        "value": (weight - 500) / 1000
                    },
                    "operator": "GREATER_THAN_OR_EQUAL_TO"
                },
                {
                    "criteria": {
                        "unit": "KILOGRAMS",
                        "value": weight / 1000
                    },
                    "operator": "LESS_THAN_OR_EQUAL_TO"
                }
            ]
        })

    return [v for _, v in sorted((*zones.items(),), key=lambda x: x[0])]


def main(argv):
    if len(argv) != 3:
        print(f"Usage: {argv[0]} <COUNTRIES_CSV> <COSTS_CSV>", file=sys.stderr)
        return 1

    _, countries_filepath, costs_filepath = argv

    with open(countries_filepath) as file:
        *rows, = csv.reader(file)
        countries = [(code, int(zone)) for _, _, code, zone, _ in rows if zone]

    with open(costs_filepath) as file:
        *rows, = csv.reader(file)
        costs = [
            (int(weight), int(zone), int(price) / 100)
            for weight, zone, price in rows
        ]

    zones = get_zones(countries, costs)
    obj = {
      "id": "gid://shopify/DeliveryProfile/85524873385",
        "profile": {
            "locationGroupsToCreate": [
                {
                    "locations": "gid://shopify/Location/67389227177",
                    "zonesToCreate": zones
                }
            ]
        }
    }

    print(json.dumps(obj, indent=2))
    # print(get_obj(zones, costs))


if __name__ == "__main__":
    exit(main(sys.argv))
