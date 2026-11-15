from __future__ import annotations

# Adapters are imported lazily from their submodules (e.g. in dependencies.py) so that
# google-cloud-storage is only imported when STORAGE_TYPE=gcp. Do not import gcs here.
