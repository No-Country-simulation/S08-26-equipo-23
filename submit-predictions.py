"""
submit-predictions.py — helper para que el equipo de ML mande predicciones
de demanda a la API de HealthDemand.

HealthDemand no genera predicciones: un equipo aparte entrena el modelo y
manda los resultados acá a través de un único endpoint HTTP:

    POST {API_URL}/api/predictions/import

Cuerpo del request (contrato exacto, ver README.md sección 6):

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

Notas de los campos:
  - "specialty" tiene que ser una de las 10 especialidades existentes,
    "neighborhood" uno de los 10 barrios de CABA (ver GET
    /api/historical/specialties y GET /api/historical/neighborhoods para
    la lista exacta — el matcheo es case-insensitive del lado del server
    vía ILIKE, pero lo más seguro es mandar el nombre exacto).
  - Reenviar la misma date + specialty + neighborhood + modelVersion
    actualiza el valor en vez de duplicar, así que reintentar es seguro.
  - Respuesta esperada si sale bien: {"imported": N, "modelVersion": "v1"}.

Dependencia: este script solo necesita la librería estándar más `requests`.
No hay requirements.txt en este proyecto (es una sola dependencia externa)
— instalala con:

    pip install requests

No hace falta pandas. Si tus predicciones viven en un DataFrame,
`df.to_dict('records')` lo convierte directo en la lista de dicts que
espera este script (ajustá los nombres de columna al contrato de arriba
antes de convertir).
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
        raise ValueError('predictions debe ser una lista de dicts, no vacía')

    for index, prediction in enumerate(predictions):
        for field in REQUIRED_FIELDS:
            if field not in prediction or prediction[field] is None:
                raise ValueError(
                    "Falta el campo obligatorio '{}' en la predicción del índice {}: {!r}".format(
                        field, index, prediction
                    )
                )


def _warn_unknown_values(predictions, api_url):
    """
    Chequeo best-effort: trae las listas conocidas de especialidad/barrio y
    avisa (nunca frena) sobre valores en `predictions` que no matchean
    ninguna de las dos listas. Sirve para pescar errores de tipeo antes de
    que se estrellen contra un error de FK del lado del server — nunca
    bloquea el envío, porque la consulta en sí puede fallar (sin red, por
    ejemplo) sin que eso sea motivo para abortar.
    """
    try:
        specialties_resp = requests.get('{}/api/historical/specialties'.format(api_url), timeout=10)
        specialties_resp.raise_for_status()
        known_specialties = {str(s).lower() for s in specialties_resp.json()}

        neighborhoods_resp = requests.get('{}/api/historical/neighborhoods'.format(api_url), timeout=10)
        neighborhoods_resp.raise_for_status()
        known_neighborhoods = {str(n).lower() for n in neighborhoods_resp.json()}
    except Exception as exc:  # noqa: BLE001 - best-effort, nunca fatal
        print('[submit-predictions] Aviso: no se pudieron traer las listas de especialidad/barrio '
              'para validar ({}). Se salta este chequeo.'.format(exc))
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
        print('[submit-predictions] Aviso: valor(es) de especialidad no reconocidos: {}'.format(
            sorted(unknown_specialties)
        ))
    if unknown_neighborhoods:
        print('[submit-predictions] Aviso: valor(es) de barrio no reconocidos: {}'.format(
            sorted(unknown_neighborhoods)
        ))


def _chunked(items, chunk_size):
    for i in range(0, len(items), chunk_size):
        yield items[i:i + chunk_size]


def submit_predictions(predictions, model_version='v1', api_url=None, chunk_size=500):
    """
    Manda una lista de predicciones a POST {api_url}/api/predictions/import.

    Args:
        predictions: lista de dicts, cada uno con al menos 'date',
            'specialty', 'neighborhood', 'predictedDemand', y
            opcionalmente 'confidence'.
        model_version: etiqueta para esta tanda de predicciones (default 'v1').
        api_url: URL base de la API de HealthDemand. Si no se pasa, lee la
            variable de entorno API_URL, con default http://localhost:4000.
        chunk_size: cuántas predicciones mandar por request (default 500).
            Requests únicos muy grandes tuvieron problemas con el proxy
            público de Railway (ver README.md) — mandar en lotes evita eso.

    Returns:
        Cantidad total de predicciones importadas (suma del campo
        'imported' de la respuesta de cada lote).

    Raises:
        ValueError: si `predictions` viene vacío/mal formado, o a algún
            registro le falta un campo obligatorio.
        RuntimeError: si algún lote vuelve con un status no-2xx (el cuerpo
            de la respuesta queda incluido en el mensaje de error).
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
                'Lote {}/{} falló con status {}: {}'.format(
                    chunk_number, total_chunks, response.status_code, response.text
                )
            )

        body = response.json()
        imported = body.get('imported', 0)
        total_imported += imported

        print('[submit-predictions] Lote {}/{}: {} predicciones importadas'.format(
            chunk_number, total_chunks, imported
        ))

    return total_imported


if __name__ == '__main__':
    # --- Ejemplo / smoke test ------------------------------------------------
    # Corré este archivo solo (`python submit-predictions.py`) contra un
    # server local (`npm run dev` desde la raíz del repo) para confirmar que
    # el contrato funciona de punta a punta antes de conectar la salida real
    # del modelo.
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
        print('Listo. Total importado: {}'.format(total))
    except (ValueError, RuntimeError) as exc:
        print('submit_predictions falló: {}'.format(exc), file=sys.stderr)
        sys.exit(1)
