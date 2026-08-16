#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_dir=$(dirname -- "$script_dir")
cd "$repository_dir"

if ! command -v git >/dev/null 2>&1; then
  echo "Fehler: Git ist nicht installiert." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Fehler: Docker ist nicht installiert." >&2
  exit 1
fi

branch=$(git branch --show-current)
if [ "$branch" != "main" ]; then
  echo "Fehler: Docker-Synchronisation ist nur vom Branch main erlaubt (aktuell: $branch)." >&2
  exit 1
fi

if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
  echo "Fehler: Der Git-Arbeitsbaum enthält noch nicht eingecheckte Änderungen." >&2
  echo "Bitte zuerst committen und nach GitHub pushen." >&2
  git status --short >&2
  exit 1
fi

echo "GitHub-Stand wird geprüft ..."
git fetch origin main --tags

local_commit=$(git rev-parse HEAD)
remote_commit=$(git rev-parse origin/main)
if [ "$local_commit" != "$remote_commit" ]; then
  echo "Fehler: Lokal und GitHub main sind nicht identisch." >&2
  echo "Lokal:  $local_commit" >&2
  echo "GitHub: $remote_commit" >&2
  exit 1
fi

export APP_COMMIT_SHA=$local_commit

echo "Docker-Images werden aus Commit $APP_COMMIT_SHA gebaut ..."
docker compose build --pull
docker compose up -d --force-recreate --remove-orphans
docker compose ps

echo "Docker und GitHub verwenden jetzt Commit $APP_COMMIT_SHA."
