#!/bin/sh
set -eu
mkdir -p dist/packages
cargo build --release
cp target/release/aal dist/packages/aal
tar -C dist/packages -czf dist/packages/aal-0.1.0-linux-x86_64.tar.gz aal
rm dist/packages/aal
printf '%s\n' 'Created dist/packages/aal-0.1.0-linux-x86_64.tar.gz'
