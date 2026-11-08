#!/usr/bin/env bash
set -Eeuo pipefail

CONFIG_FILE="${1:-app-config.json}"
LIST_ATTEMPTS="${LIST_ATTEMPTS:-3}"
LIST_DELAY_SECONDS="${LIST_DELAY_SECONDS:-5}"

if ! command -v camber >/dev/null 2>&1; then
  echo "Error: Camber CLI is not installed or is not on PATH." >&2
  exit 127
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: configuration file not found: $CONFIG_FILE" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required to validate JSON." >&2
  exit 127
fi

python3 -m json.tool "$CONFIG_FILE" >/dev/null

run_app_list() {
  local attempt output status

  for ((attempt = 1; attempt <= LIST_ATTEMPTS; attempt++)); do
    echo "Listing Camber applications (attempt ${attempt}/${LIST_ATTEMPTS})..." >&2
    if output="$(camber app list --output json 2>&1)"; then
      printf '%s\n' "$output"
      return 0
    else
      status=$?
      printf '%s\n' "$output" >&2
      if (( attempt < LIST_ATTEMPTS )); then
        sleep "$LIST_DELAY_SECONDS"
      fi
    fi
  done

  return "$status"
}

echo "Existing Camber applications:"
existing_apps="$(run_app_list)" || {
  echo "Error: cannot verify Camber access before deployment." >&2
  echo "Check network access and authentication, then rerun: camber app list" >&2
  exit 1:
}
printf '%s\n' "$existing_apps"

echo
echo "Creating aivantaa-backend..."
create_output="$(camber app create --file "$CONFIG_FILE" 2>&1)" || {
  status=$?
  printf '%s\n' "$create_output" >&2
  echo "Error: Camber app creation failed with exit code $status." >&2
  exit "$status"
}
printf '%s\n' "$create_output"

echo
echo "Updated Camber applications:"
apps_output="$(run_app_list)" || {
  echo "Warning: deployment may have completed, but Camber app list timed out." >&2
  echo "Run 'camber app list --output json' manually after checking connectivity." >&2
  apps_output=""
}
printf '%s\n' "$apps_output"

public_url="$(
  printf '%s\n' "$apps_output" |
    grep -Eo 'https?://[^"[:space:]]+' |
    head -n 1 || true
)"

if [[ -n "$public_url" ]]; then
  echo
  echo "Public URL: $public_url"
else
  echo
  echo "No public URL was shown by 'camber app list'."
  echo "Use the app ID from the output with your Camber CLI's app inspection command."
fi
