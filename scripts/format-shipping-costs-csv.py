#!/usr/bin/env python3

import sys
import csv


ZONE_PREFIX = "Zone "


def main(argv):
    if len(argv) != 2:
        print(f"USAGE: {argv[0]} <CSV_FILE>", file=sys.stderr)
        return 1

    filepath = argv[1]

    print("Weight (g),Zone ID,Price (cents)")

    with open(filepath) as file:
        reader = csv.reader(file)
        header = None

        for row in reader:
            if row[0] == "KG" and not header:
                header = row
                continue

            if header:
                try:
                    weight = int(float(row[0]) * 1000)
                except ValueError:
                    weight = 0

                for zone, val in zip(header[1:], row[1:]):
                    if zone.startswith(ZONE_PREFIX):
                        print(
                            weight,
                            zone[len(ZONE_PREFIX):],
                            round(float(val) * 100),
                            sep=","
                        )


if __name__ == "__main__":
    exit(main(sys.argv))
