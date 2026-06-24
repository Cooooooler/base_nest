#!/bin/sh
# lint-staged wrapper: cd into package dir and run eslint on relative paths
pkg="$1"
shift
cd "$pkg" || exit 1
exec node_modules/.bin/eslint --fix "$@"
