"""
submit-predictions.py — helper for the ML team to submit demand predictions
to HealthDemand's API.

HealthDemand does not generate predictions itself; a separate ML team trains
the model and pushes results here through a single HTTP endpoint:

    POST {API_URL}/api/predictions/import

Request body (exact contract, see README.md section 6):

    {
      "modelVersion": "v1",
      "predictions": [
        {
          "date": "2026-09-10",
          "specialty": "Cardiología",
          "neighborhood": "Palermo",
          "predictedDemand": 28.5,
          "confidence": 0.82
        },
        ...
      ]
    }

Field notes:
  - "specialty" must be one of the 10 existing specialties, "neighborhood"
    one of the 10 Buenos Aires barrios (see GET /api/historical/specialties
    and GET /api/historical/neighborhoods for the exact lists — matching is
    case-insensitive server-side via ILIKE, but exact names are safest).
  - Re-sending the same date + specialty + neighborhood + modelVersion
    upserts instead of duplicating, so retries are safe.
  - Response body on success: {"imported": N, "modelVersion": "v1"}.

Dependency: this script only needs the standard library plus `requests`.
There is no requirements.txt in this project (single external dependency) —
install it with:

    pip install requests

No pandas dependency is required. If your predictions live in a DataFrame,
`df.to_dict('records')` converts it directly into the list of dicts this
script expects (adjust column names to match the contract above first).
"""

import os
import sys

import requests

DEFAULT_API_URL = 'http://localhost:4000'
REQUIRED_FIELDS = ('date', 'specialty', 'neighborhood', 'predictedDemand')


def _resolve_api_url(api_url):
    if api_url:
        return api_url.rstrip('/')
    return os.environ.get('API_URL', DEFAULT_API_URL).rstrip('/')


def _validate_predictions(predictions):
    if not isinstance(predictions, list) or len(predictions) == 0:
        raise ValueError('predictions must be a non-empty list of dicts')

    for index, prediction in enumerate(predictions):
        for field in REQUIRED_FIELDS:
            if field not in prediction or prediction[field] is None:
                raise ValueError(
                    "Missing required field '{}' in prediction at index {}: {!r}".format(
                        field, index, prediction
                    )
                )


def _warn_unknown_values(predictions, api_url):
    """
    Best-effort sanity check: fetches the known specialty/neighborhood lists
    and warns (never raises) about values in `predictions` that don't match
    either list. This is meant to catch typos before they hit a hard FK
    error server-side — it never blocks submission, since the lookup itself
    can fail (e.g. no network) without that being a reason to abort.
    """
    try:
        specialties_resp = requests.get('{}/api/historical/specialties'.format(api_url), timeout=10)
        specialties_resp.raise_for_status()
        known_specialties = {str(s).lower() for s in specialties_resp.json()}

        neighborhoods_resp = requests.get('{}/api/historical/neighborhoods'.format(api_url), timeout=10)
        neighborhoods_resp.raise_for_status()
        known_neighborhoods = {str(n).lower() for n in neighborhoods_resp.json()}
    except Exception as exc:  # noqa: BLE001 - best-effort, never fatal
        print('[submit-predictions] Warning: could not fetch known specialties/neighborhoods '
              'for validation ({}). Skipping this check.'.format(exc))
        return

    unknown_specialties = set()
    unknown_neighborhoods = set()
    for prediction in predictions:
        specialty = str(prediction.get('specialty', '')).lower()
        neighborhood = str(prediction.get('neighborhood', '')).lower()
        if specialty and specialty not in known_specialties:
            unknown_specialties.add(prediction.get('specialty'))
        if neighborhood and neighborhood not in known_neighborhoods:
            unknown_neighborhoods.add(prediction.get('neighborhood'))

    if unknown_specialties:
        print('[submit-predictions] Warning: unrecognized specialty value(s): {}'.format(
            sorted(unknown_specialties)
        ))
    if unknown_neighborhoods:
        print('[submit-predictions] Warning: unrecognized neighborhood value(s): {}'.format(
            sorted(unknown_neighborhoods)
        ))


def _chunked(items, chunk_size):
    for i in range(0, len(items), chunk_size):
        yield items[i:i + chunk_size]


def submit_predictions(predictions, model_version='v1', api_url=None, chunk_size=500):
    """
    Submit a list of prediction dicts to POST {api_url}/api/predictions/import.

    Args:
        predictions: list of dicts, each with at least 'date', 'specialty',
            'neighborhood', 'predictedDemand', and optionally 'confidence'.
        model_version: tag for this batch of predictions (default 'v1').
        api_url: base URL of the HealthDemand API. If omitted, reads the
            API_URL environment variable, defaulting to http://localhost:4000.
        chunk_size: how many predictions to send per request (default 500).
            Large single requests have been known to struggle through
            Railway's public proxy (see README.md) — chunking avoids that.

    Returns:
        Total number of predictions imported (sum of each chunk's
        'imported' field from the response).

    Raises:
        ValueError: if `predictions` is empty/malformed, or a record is
            missing a required field.
        RuntimeError: if any chunk's request comes back with a non-2xx
            status (the response body is included in the error message).
    """
    _validate_predictions(predictions)

    resolved_api_url = _resolve_api_url(api_url)

    _warn_unknown_values(predictions, resolved_api_url)

    chunks = list(_chunked(predictions, chunk_size))
    total_chunks = len(chunks)
    total_imported = 0

    for chunk_number, chunk in enumerate(chunks, start=1):
        payload = {
            'modelVersion': model_version,
            'predictions': chunk
        }

        response = requests.post(
            '{}/api/predictions/import'.format(resolved_api_url),
            json=payload,
            timeout=60
        )

        if not response.ok:
            raise RuntimeError(
                'Chunk {}/{} failed with status {}: {}'.format(
                    chunk_number, total_chunks, response.status_code, response.text
                )
            )

        body = response.json()
        imported = body.get('imported', 0)
        total_imported += imported

        print('[submit-predictions] Chunk {}/{}: {} predictions imported'.format(
            chunk_number, total_chunks, imported
        ))

    return total_imported


if __name__ == '__main__':
    # --- Smoke test example -------------------------------------------------
    # Run this file standalone (`python submit-predictions.py`) against a
    # local server (`npm run dev` from the repo root) to confirm the
    # contract works end to end before wiring in real model output.
    example_predictions = [
        {
            'date': '2026-09-10',
            'specialty': 'Cardiología',
            'neighborhood': 'Palermo',
            'predictedDemand': 28.5,
            'confidence': 0.82
        },
        {
            'date': '2026-09-11',
            'specialty': 'Pediatría',
            'neighborhood': 'Recoleta',
            'predictedDemand': 15.0,
            'confidence': 0.75
        },
        {
            'date': '2026-09-12',
            'specialty': 'Dermatología',
            'neighborhood': 'Belgrano',
            'predictedDemand': 9.2,
            'confidence': 0.68
        }
    ]
    # -------------------------------------------------------------------------

    try:
        total = submit_predictions(example_predictions, model_version='v1')
        print('Done. Total imported: {}'.format(total))
    except (ValueError, RuntimeError) as exc:
        print('submit_predictions failed: {}'.format(exc), file=sys.stderr)
        sys.exit(1)
