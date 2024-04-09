#!/bin/bash

if [[ "$#" -ne 2 ]]; then
  echo "Usage: $0 <template> <unix_timestamp>" >&2
  exit 1
fi

TEMPLATE="$1"
DATE="$2"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Error: no such template: $TEMPLATE" >&2
  exit 2
fi

if [[ ! $DATE =~ ^[0-9]+$ ]] ; then
   echo "Error: unix_timestamp must be a positive number" >&2
   exit 1
fi

QUEUE_KEY="task-groups-queue"
PAYLOAD=$(
  sed "s/\$DATE/$DATE/" "$TEMPLATE" \
    | tr -d "\n" \
    | sed 's/ \{2,\}//g' \
    | sed -E 's/([\\"])/\\\1/g'
)

echo "ZADD \"$QUEUE_KEY\" \"$DATE\" \"$PAYLOAD\"" | redis-cli
