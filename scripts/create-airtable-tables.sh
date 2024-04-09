#!/usr/bin/env bash

########################################
# Automatically create new airtable
# tables with the right structure for
# new sellers, provided with a base id
# and the seller's oauth access token.
########################################

if [[ $# -ne 2 ]]; then
  echo "USAGE: $0 <BASE_ID> <ACCESS_TOKEN>" >& 2
  exit 1
fi

BASE_ID="$1"
ACCESS_TOKEN="$2"
BRANDS=(
  "CHLOE"
  "CELINE"
  "GUCCI"
  "HERMES"
  "FENDI"
  "BOTTEGA VENETA"
  "MIU MIU"
  "CHRISTIAN DIOR"
  "SAINT LAURENT PARIS"
  "PRADA"
  "CHANEL"
  "DOLCE&GABBANA"
  "BALENCIAGA"
  "SALVATORE FERRAGAMO"
  "STELLA MCCARTNEY"
  "LOEWE"
  "LOUIS VUITTON"
  "BURBERRY"
  "COACH"
  "THE NORTH FACE"
  "SUPREME"
  "NIKE"
  "CARTIER"
)

for BRAND in "${BRANDS[@]}" ; do
  echo "Creating $BRAND table..."
  curl \
    -X POST "https://api.airtable.com/v0/meta/bases/$BASE_ID/tables" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    --data-raw "{ \"name\": \"$BRAND\", \"fields\": [ {\"name\": \"ID\", \"type\": \"singleLineText\"}, {\"name\": \"Available?\", \"type\": \"checkbox\", \"options\": {\"color\": \"greenBright\", \"icon\": \"check\"}}, {\"name\": \"Brand\", \"type\": \"singleSelect\", \"options\": {\"choices\": []}}, {\"name\": \"Name\", \"type\": \"singleLineText\"}, {\"name\": \"Model\", \"type\": \"singleSelect\", \"options\": {\"choices\": []}}, {\"name\": \"Type\", \"type\": \"singleSelect\", \"options\": {\"choices\": []}}, {\"name\": \"Subtype\", \"type\": \"singleSelect\", \"options\": {\"choices\": []}}, {\"name\": \"Gender\", \"type\": \"singleSelect\", \"options\": {\"choices\": []}}, {\"name\": \"Grade\", \"type\": \"singleSelect\", \"options\": {\"choices\": []}}, {\"name\": \"Size\", \"type\": \"multilineText\"}, {\"name\": \"Color(s)\", \"type\": \"multipleSelects\", \"options\": {\"choices\": []}}, {\"name\": \"Material(s)\", \"type\": \"multipleSelects\", \"options\": {\"choices\": []}}, {\"name\": \"Has serial number?\", \"type\": \"checkbox\", \"options\": {\"color\": \"greenBright\", \"icon\": \"check\"}}, {\"name\": \"Has guarantee card?\", \"type\": \"checkbox\", \"options\": {\"color\": \"greenBright\", \"icon\": \"check\"}}, {\"name\": \"Has box?\", \"type\": \"checkbox\", \"options\": {\"color\": \"greenBright\", \"icon\": \"check\"}}, {\"name\": \"Has dust bag?\", \"type\": \"checkbox\", \"options\": {\"color\": \"greenBright\", \"icon\": \"check\"}}, {\"name\": \"Images\", \"type\": \"multipleAttachments\"}, {\"name\": \"Price (EUR)\", \"type\": \"number\", \"options\": {\"precision\": 0}}, {\"name\": \"Wholesale Price\", \"type\": \"number\", \"options\": {\"precision\": 0}} ] }" > /dev/null 2>& 1
done

echo; echo "Done!"
