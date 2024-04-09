#!/usr/bin/env python3

#######################################################
# One-liner to get the access token from the JS console
# JSON.parse(localStorage.getItem(Array.from(localStorage, (_, i) => localStorage.key(i)).find(it => it.startsWith("@@auth0spajs@@::"))))?.body?.access_token
#######################################################

import argparse
import os
import sys
import requests
import datetime
import json


URL = "https://mx-gql.wework.com/graphql"

QUERIES = {
    "UserMemberships": "query UserMemberships($membershipInput: MembershipInput) {\n  userMemberships(membershipInput: $membershipInput) {\n    uuid\n    userUuid\n    accountUuid\n    membershipType\n    productUuid\n    productName\n    __typename\n  }\n}\n",
    "UpcomingBookings": "query UpcomingBookings($ownerUUID: String!, $offset: Int, $limit: Int, $sort: [BookingSortOrder!], $userMembershipUuid: String, $startingAfter: String, $accountUUID: String) {\n  upcomingBookings(ownerUUID: $ownerUUID, offset: $offset, limit: $limit, sort: $sort, startingAfter: $startingAfter, accountUuid: $accountUUID) {\n    data {\n      uuid\n      creditOrder {\n        price\n        __typename\n      }\n      reservable {\n        uuid\n        capacity\n        openTime\n        closeTime\n        cancellationPolicy\n        ... on ConferenceRoom {\n          __typename\n          imageUrl\n          name\n          uuid\n          floorName\n          amenities {\n            id\n            displayName\n            __typename\n          }\n          productPrice(userUUID: $ownerUUID, userMembershipUUID: $userMembershipUuid, accountUUID: $accountUUID, startOfDay: $startingAfter) {\n            price {\n              currency\n              amount\n              __typename\n            }\n            __typename\n          }\n        }\n        ... on SharedWorkspace {\n          __typename\n          imageURL\n          productPrice(userUUID: $ownerUUID, userMembershipUUID: $userMembershipUuid, accountUUID: $accountUUID, startOfDay: $startingAfter) {\n            price {\n              currency\n              amount\n              __typename\n            }\n            __typename\n          }\n        }\n        ... on PrivateOffice {\n          __typename\n          capacity\n          imageUrl\n          name\n          uuid\n          floorName\n          productPrice(userUUID: $ownerUUID, userMembershipUUID: $userMembershipUuid, accountUUID: $accountUUID, startOfDay: $startingAfter) {\n            price {\n              currency\n              amount\n              __typename\n            }\n            __typename\n          }\n        }\n        ... on PrivateAccessArea {\n          __typename\n          capacity\n          imageUrl\n          name\n          uuid\n          floorName\n        }\n        location {\n          uuid\n          name\n          address {\n            line1\n            line2\n            city\n            state\n            country\n            zip\n            __typename\n          }\n          timeZone\n          hasThirdPartyDisplay\n          __typename\n        }\n        __typename\n      }\n      startsAt\n      endsAt\n      createdAt\n      updatedAt\n      isCurrentUsersBooking\n      modificationDeadline\n      maximumGuestsAllowed\n      __typename\n    }\n    __typename\n  }\n}\n",
    "RequestQuote": "mutation RequestQuote($items: RequestQuoteInput!) {\n  requestQuote(items: $items) {\n    uuid\n    quoteStatus\n    detail\n    error\n    message\n    __typename\n  }\n}\n",
    "Quotes": "query Quotes($uuids: [String!]) {\n  quotes(uuids: $uuids) {\n    uuid\n    validUntil\n    grandTotal {\n      currency\n      amount\n      __typename\n    }\n    quoteStatus\n    statusDetails {\n      statusCode\n      errorCode\n      message\n      source\n      __typename\n    }\n    __typename\n  }\n}\n",
    "PlaceOrder": "mutation PlaceOrder($order: PlaceOrderInput!) {\n  placeOrder(order: $order) {\n    uuid\n    orderStatus\n    detail\n    error\n    message\n    __typename\n  }\n}\n",
    "CancelReservation": "mutation CancelReservation($input: CancellationInput!) {\n  cancelFulfillment(cancellation: $input) {\n    uuid\n    status\n    statusDetail\n    fulfillmentUuid\n    __typename\n  }\n}\n",
}

WORKSPACE_UUID = os.getenv("WEWORK_WORKSPACE_UUID") \
    or "60b99e50-ac82-11e9-b299-1287442e9660"
WEEK_DAYS = [0, 1, 3]
WEEK_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
AUTH_TOKEN = os.getenv("WEWORK_TOKEN")


def run_query(operation_name, variables):
    query = QUERIES[operation_name]

    res = requests.request(
        "POST",
        URL,
        headers={
            "Authorization": "Bearer " + AUTH_TOKEN,
            "Content-Type": "application/json"
        },
        data=json.dumps({
            "operationName": operation_name,
            "variables": variables,
            "query": query
        })
    )

    return res.json()["data"]


def parse_month_date(month_str):
    date_parts = month_str.split("-")

    if len(date_parts) != 2:
        raise ValueError("invalid month string (expected format: MM-YYYY)")

    month, year = map(int, date_parts)

    return datetime.date(year=year, month=month, day=1)


def get_dates(start_date, end_date, week_days):
    date = start_date

    while date <= end_date:
        if date.weekday() in week_days:
            yield date

        date += datetime.timedelta(days=1)


def book_date(membership_uuid, user_uuid, account_uuid, date):
    print(f"Booking {date}...", end="", flush=True)

    quote_request = run_query(
        "RequestQuote",
        {
            "items": {
                "currency": "com.wework.credits",
                "userUuid": user_uuid,
                "userMembershipUuid": membership_uuid,
                "lineItems": [
                    {
                        "lineItemType": "SharedWorkspace",
                        "startTime": date.strftime("%Y-%m-%dT00:00:00+01:00"),
                        "endTime": date.strftime("%Y-%m-%dT23:59:59+01:00"),
                        "inventoryUuid": WORKSPACE_UUID,
                        "quantity": 1
                    }
                ]
            }
        }
    )
    quote_request_uuid = quote_request["requestQuote"]["uuid"]
    quotes = run_query("Quotes", {"uuids": [quote_request_uuid]})

    cost = quotes["quotes"][0]["grandTotal"]["amount"]

    if cost:
        return print(
            "\rSkipped", date, "because booking it would cost",
            cost, "credit" + ("s" * (cost != 1))
        )

    order = run_query(
        "PlaceOrder",
        {
            "order": {
                "userUuid": user_uuid,
                "accountUuid": account_uuid,
                "quoteUuid": quote_request_uuid,
                "requesterUuid": user_uuid
            }
        }
    )

    if order["placeOrder"]["orderStatus"] == "PLACED":
        print("\rBooked desk on", date)
        return True

    print(f"\rFailed to place order on {date}:", order)


def cancel_date(user_uuid, booking_date, booking_uuid):
    print(f"Cancelling {booking_date}...", end="", flush=True)

    run_query(
        "CancelReservation",
        {
            "input": {
                "cancellationReason": "",
                "fulfillmentUuid": booking_uuid,
                "requesterUuid": user_uuid,
            }
        }
    )

    print("\rCancelled booking on", booking_date)

    return True


def parse_args(argv):
    parser = argparse.ArgumentParser(
        prog=sys.argv[0],
        description="Bulk operations on wework bookings",
    )

    parser.add_argument(
        "action",
        nargs="?",
        choices=["BOOK", "CANCEL"],
        default="BOOK",
        help="Action"
    )
    parser.add_argument(
        "date_from",
        help="Starting date (inclusive)"
    )
    parser.add_argument(
        "date_to",
        help="Ending date (inclusive)"
    )
    parser.add_argument(
        "-w",
        "--week-days",
        default="0,1,3",
        help="Specify week days, as comma-separated integers (0 to 6)"
    )

    return parser.parse_args(argv[1:])


def list_bookings(membership_uuid, user_uuid, account_uuid, date_from):
    batch_size = 50
    bookings = []
    batch = True
    offset = 0

    while batch:
        batch = run_query(
            "UpcomingBookings",
            {
                "ownerUUID": user_uuid,
                "offset": offset,
                "limit": batch_size,
                "sort": ["start"],
                "userMembershipUuid": membership_uuid,
                "startingAfter": date_from.strftime("%Y-%m-%dT00:00:00Z"),
                "accountUUID": account_uuid
            }
        )["upcomingBookings"]["data"]
        bookings += [
            {
                "uuid": b["uuid"],
                "workspace_uuid": b["reservable"]["uuid"],
                "date": datetime.date.fromtimestamp(sum(
                    datetime.datetime.strptime(
                        t,
                        "%Y-%m-%dT%H:%M:%S.000Z"
                    ).timestamp()
                    for t in (b["startsAt"], b["endsAt"])
                ) // 2),
            }
            for b in batch
        ]
        offset += batch_size

    return bookings


def summarize(action, dates, week_days):
    print("Action:   ", action)
    print("Week days:", ", ".join(WEEK_DAY_NAMES[d] for d in sorted(week_days)))
    print("Days:")
    print("  " + "\n  ".join(
        datetime.datetime.strftime(d, "%Y-%m-%d (%a)") for d in dates
    ))
    print(f"({len(dates)} total)")
    print("\nHit enter to proceed, Ctrl+C to abort")

    input()


def main(argv):
    args = parse_args(argv)

    action = args.action
    date_from = datetime.datetime.strptime(args.date_from, "%Y-%m-%d").date()
    date_to = datetime.datetime.strptime(args.date_to, "%Y-%m-%d").date()
    delta = date_to - date_from
    week_days = {*map(int, args.week_days.split(","))}

    if delta.days < 0:
        print("date_from has to be before date_to", file=sys.stderr)
        return 1

    if any(d not in range(7) for d in week_days):
        print("invalid week days:", args.week_days, file=sys.stderr)
        return 1

    if not AUTH_TOKEN:
        print("Missing WEWORK_TOKEN environment variable", file=sys.stderr)
        return 1

    *dates, = get_dates(date_from, date_to, week_days)

    summarize(action, dates, week_days)

    memberships = run_query(
        "UserMemberships",
        {"membershipInput": {"active": True}}
    )

    membership_uuid = memberships["userMemberships"][0]["uuid"]
    user_uuid = memberships["userMemberships"][0]["userUuid"]
    account_uuid = memberships["userMemberships"][0]["accountUuid"]

    print("=== User data ===")
    print("  membership_uuid:", membership_uuid)
    print("  user_uuid:      ", user_uuid)
    print("  account_uuid:   ", account_uuid)
    print()

    bookings = list_bookings(
        membership_uuid,
        user_uuid,
        account_uuid,
        date_from
    )
    booked_dates = {booking["date"] for booking in bookings}
    print("Upcoming bookings:", len(bookings))

    is_placing = action == "BOOK"
    fulfilled = 0
    skipped = 0

    for date in dates:
        if (
            is_placing and date in booked_dates
            or not is_placing and date not in booked_dates
        ):
            print(
                f"Skipped {date} because it",
                "is already" if is_placing else "was not",
                "booked"
            )
            skipped += 1
        else:
            if is_placing:
                if book_date(membership_uuid, user_uuid, account_uuid, date):
                    fulfilled += 1
                else:
                    skipped += 1
            else:
                found_bookings = [
                    b for b in bookings if (
                        (
                            b["workspace_uuid"],
                            b["date"]
                        ) == (
                            WORKSPACE_UUID,
                            date
                        )
                    )
                ]

                if found_bookings:
                    cancel_date(user_uuid, date, found_bookings[0]["uuid"])
                    fulfilled += 1
                else:
                    print(f"Skipped {date} because booking not found")
                    skipped += 1

    print()
    print(
        fulfilled,
        f"booking{'s' * (fulfilled != 1)}",
        ("canceled", "placed")[is_placing] + ",",
        skipped,
        "skipped"
    )


if __name__ == "__main__":
    exit(main(sys.argv))
