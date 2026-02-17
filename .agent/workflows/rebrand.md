---
description: Automatically scan and replace "Pvt Ltd" or "Private Limited" with "The ChitraHarsha VPK Ventures" and synchronize version to v7.0.0.
---

// turbo-all

1. Scan for corporate titles:
   `rg -i "Pvt Ltd|Private Limited" . --glob "!.git/*"`

2. Perform replacement if found:
   `Get-ChildItem -Recurse -File -Exclude .git | ForEach-Object { (Get-Content $_.FullName) -replace 'Pvt Ltd', 'The ChitraHarsha VPK Ventures' -replace 'Private Limited', 'The ChitraHarsha VPK Ventures' | Set-Content $_.FullName }`

3. Normalize version to v7.0.0 (Optional/Contextual):
   Verify and update `v7.0.0` in README.md, LICENSE, and manifest.json.

4. Show diff:
   `git diff`
