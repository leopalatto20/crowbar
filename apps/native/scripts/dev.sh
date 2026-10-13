#!/bin/sh
# Starts Metro and copies its output to .expo/metro.log so agents can read runtime errors.
# script(1) runs Expo in a pseudo-terminal; piping through tee would make stdout a non-TTY,
# which turns off Expo's interactive keys and colours. util-linux and BSD script differ in syntax.
mkdir -p .expo
if script --version 2>/dev/null | grep -q util-linux; then
  exec script -q -e -c "expo start --clear" .expo/metro.log
else
  exec script -q .expo/metro.log expo start --clear
fi
