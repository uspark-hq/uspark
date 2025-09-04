#!/usr/bin/env bash

set -e
set -u

lefthook install
(cd turbo && pnpm install)
