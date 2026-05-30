#!/usr/bin/env bash
set -euo pipefail

required_major=20
current_major=0

if command -v node >/dev/null 2>&1; then
  current_major="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
fi

if [ "${current_major}" -lt "${required_major}" ]; then
  node_version="${FRONTEND_NODE_VERSION:-20.19.0}"
  arch="$(uname -m)"
  case "${arch}" in
    x86_64) node_arch="x64" ;;
    aarch64|arm64) node_arch="arm64" ;;
    *) echo "Unsupported architecture for Node.js install: ${arch}" >&2; exit 1 ;;
  esac

  node_dir="/tmp/node-v${node_version}-linux-${node_arch}"
  if [ ! -x "${node_dir}/bin/node" ]; then
    curl -fsSL "https://nodejs.org/dist/v${node_version}/node-v${node_version}-linux-${node_arch}.tar.xz" -o /tmp/node.tar.xz
    rm -rf "${node_dir}"
    mkdir -p "${node_dir}"
    tar -xJf /tmp/node.tar.xz -C "${node_dir}" --strip-components=1
  fi
  export PATH="${node_dir}/bin:${PATH}"
fi

node --version
npm --version

cd frontend
npm ci
npm run build
