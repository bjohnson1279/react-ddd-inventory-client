grep -rn "Dismiss error" src/components/ | awk -F: '{print $1}' | sort | uniq | while read file; do
  echo "--- $file ---"
  grep -A 2 -B 2 "Dismiss error" "$file"
done
