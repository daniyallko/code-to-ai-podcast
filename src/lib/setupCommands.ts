export const UV_SYNC_RUNTIME = "uv sync --locked";
export const UV_SYNC_KOKORO = "uv sync --locked --extra kokoro";
export const UV_DEV_VALIDATION = "uv sync --locked --extra dev && uv run --no-sync pytest -q";
export const UV_DEV_VALIDATION_KOKORO = "uv sync --locked --extra dev --extra kokoro && uv run --no-sync pytest -q";
