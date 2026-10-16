#!/bin/sh
# One dictionary, three consumers. Edit assets/data/bariba_keyboard_dictionary.json
# then run this script to copy it to the Android IME and the iOS extension.
set -e
cd "$(dirname "$0")/.."
src=assets/data/bariba_keyboard_dictionary.json
cp "$src" android/app/src/main/assets/bariba_dictionary.json
cp "$src" ios/BaribaKeyboard/bariba_dictionary.json
echo "Dictionary synced to Android + iOS."
