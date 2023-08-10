#!/bin/bash
set -e

package_dir=$(pwd)

pushd "$(mktemp -d)"
cat <<EOF >package.json
{
  "devDependencies": {
    "vite": "latest",
    "your-package": "file:$package_dir"
  }
}
EOF
cat <<EOF >vite.config.js
import { defineConfig } from "vite";
export default defineConfig({
  build: {
    manifest: true,
  },
});
EOF
cat <<EOF >index.html
<script type="module">
  import("your-package");
</script>
EOF

npm install
vite build

bundled_file=...
bundled_gzip=$(gzip -c "$bundled_file" | wc -c)
echo "gzip: $bundled_gzip"
