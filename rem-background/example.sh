# create a little cli to download all images from the lints.txt file, remove the
# background and save the result in an output folder named `result-{date}`
SECONDS=0

if [ ! -f "$1" ]; then
  echo "Please provide a text file as first argument"
  exit 1
fi

#  args2 can be either `u2net` or `u2netp`
if [ "$2" != "u2net" ] && [ "$2" != "u2netp" ]; then
  echo "Please provide a model as second argument (u2net or u2netp)"
  exit 1
fi

date=$(date +%Y-%m-%d-%H-%M-%S)
folder=result-$date
mkdir -p "$folder"
endpoint=https://rembg.korvin.io/
model=$2
logs=logs-$date.txt
touch "$folder/$logs"


echo "Starting background removal for $1 and model $model" \
  | tee -a "$folder/$logs"
index=0
while read -r line; do
  curl -s "$endpoint?url=$line&model=$model" -o "$folder/$index.png"
  echo "$line saved in $folder/$index.png" | tee -a "$folder/$logs"
  index=$((index+1))
done < "$1"

echo "Success! All images are saved in the $folder folder" \
  | tee -a "$folder/$logs"
echo "Execution duration: $((SECONDS)) seconds" | tee -a "$folder/$logs"
