# Extrae las destrezas con criterios de desempeño (DCD) de los PDF del
# Currículo Priorizado del Mineduc y genera el seed SQL para la tabla `dcd`.
#
# Uso:  python scripts/extraer_dcd.py
# Lee:  curriculo Ecuador/*.pdf
# Genera: scripts/dcd_extraidas.json (revisión) y
#         supabase/migrations/0002_seed_dcd.sql
import json
import os
import re

import pdfplumber

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARPETA_PDFS = os.path.join(RAIZ, "curriculo Ecuador")
SALIDA_JSON = os.path.join(RAIZ, "scripts", "dcd_extraidas.json")
SALIDA_SQL = os.path.join(RAIZ, "supabase", "migrations", "0002_seed_dcd.sql")

# (archivo, subnivel en la tabla dcd, dígito de subnivel en el código)
PDFS = [
    ("Curriculo-Priorizado-Elemental (1).pdf", "Elemental", "2"),
    ("Curriculo-Priorizado-EGB-Media.pdf", "Media", "3"),
    ("Curriculo-Priorizado-Superior.pdf", "Superior", "4"),
    ("Curriculo-Priorizado-Bachillerato.pdf", "BGU", "5"),
]

# Prefijo del código Mineduc → codigo de la tabla `asignaturas`.
# Los que no existen en el seed 0001 se crean en el SQL generado.
PREFIJO_ASIGNATURA = {
    "CN": "CN",    # Ciencias Naturales
    "M": "MAT",    # Matemática
    "LL": "LL",    # Lengua y Literatura
    "CS": "CS",    # Ciencias Sociales / Estudios Sociales
    "EF": "EF",    # Educación Física
    "ECA": "ECA",  # Educación Cultural y Artística
    "EFL": "EXT",  # Inglés (English as a Foreign Language)
    "F": "FIS",    # Física (BGU)
    "Q": "QUI",    # Química (BGU)
    "B": "BIO",    # Biología (BGU)
    "H": "HIS",    # Historia (BGU)
    "EC": "CIU",   # Educación para la Ciudadanía (BGU)
    "EG": "EMP",   # Emprendimiento y Gestión (BGU)
    "FIL": "FIL",  # Filosofía (BGU)
}

ASIGNATURAS_NUEVAS = {
    "HIS": "Historia",
    "CIU": "Educación para la Ciudadanía",
    "EMP": "Emprendimiento y Gestión",
    "FIL": "Filosofía",
}

# El separador tras el prefijo puede ser punto o espacio: 'CN.4.1.1' y
# 'EFL 3.1.1' (así aparece Inglés en los PDF de Media y Superior).
CODIGO = re.compile(r"([A-Z]{1,4})[ .](\d)\.(\d+)\.(\d+)\.?")
ENCABEZADOS = ("destrezas con criterios", "criterios de evaluación", "indicadores")


def limpiar(texto: str) -> str:
    """Colapsa saltos de línea y repara palabras cortadas por guion."""
    texto = texto.replace("\n", " ")
    # 'biomo- léculas' → 'biomoléculas' (solo entre minúsculas/vocales acentuadas)
    texto = re.sub(r"([a-záéíóúñ])- ([a-záéíóúñ])", r"\1\2", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


def es_referencia(texto: str, posicion: int) -> bool:
    """¿El código en `posicion` está precedido por 'Ref.', 'I.' o 'CE.'?"""
    contexto = texto[max(0, posicion - 6) : posicion]
    return bool(re.search(r"(Ref\.\s*|\bI\.|\bCE\.)$", contexto))


def destrezas_de_celda(celda: str):
    """Devuelve [(codigo, descripcion)] de una celda de la columna de destrezas."""
    texto = limpiar(celda)
    if not texto or any(texto.lower().startswith(e) for e in ENCABEZADOS):
        return []

    # Posiciones de códigos que INICIAN una destreza (no referencias).
    inicios = [m for m in CODIGO.finditer(texto) if not es_referencia(texto, m.start())]

    resultados = []
    if inicios and inicios[0].start() <= 3:
        # La celda es una lista de destrezas: "COD. texto COD. texto…"
        for i, m in enumerate(inicios):
            fin = inicios[i + 1].start() if i + 1 < len(inicios) else len(texto)
            codigo = f"{m.group(1)}.{m.group(2)}.{m.group(3)}.{m.group(4)}"
            descripcion = texto[m.end() : fin].strip(" .")
            if descripcion:
                resultados.append((codigo, descripcion))
    else:
        # Destreza modificada del priorizado: "texto… (Ref. COD.)"
        ref = re.search(r"\(\s*Ref\.\s*([A-Z]{1,4}[ .]\d\.\d+\.\d+)\.?\s*\)", texto)
        if ref:
            descripcion = limpiar(texto[: ref.start()]).strip(" .")
            if descripcion:
                resultados.append((ref.group(1).replace(" ", "."), descripcion))
    return resultados


def extraer():
    dcd = {}  # (codigo_asignatura, codigo_dcd) → registro
    desconocidos = {}

    for archivo, subnivel, digito in PDFS:
        ruta = os.path.join(CARPETA_PDFS, archivo)
        encontradas = 0
        with pdfplumber.open(ruta) as pdf:
            for pagina in pdf.pages:
                for tabla in pagina.extract_tables():
                    for fila in tabla:
                        if len(fila) != 3 or not fila[1]:
                            continue
                        # Columna 3 = indicadores de evaluación de la misma fila
                        # (mismo criterio de evaluación que las destrezas de la fila;
                        # el emparejamiento es por fila, no 1:1 exacto).
                        indicador = limpiar(fila[2] or "") or None
                        for codigo, descripcion in destrezas_de_celda(fila[1]):
                            prefijo, sub = codigo.split(".")[0], codigo.split(".")[1]
                            if sub != digito:
                                continue  # código de otro subnivel (referencia cruzada)
                            asignatura = PREFIJO_ASIGNATURA.get(prefijo)
                            if not asignatura:
                                desconocidos[prefijo] = desconocidos.get(prefijo, 0) + 1
                                continue
                            clave = (asignatura, codigo)
                            # Conservar la descripción más larga (más completa).
                            if clave not in dcd or len(descripcion) > len(dcd[clave]["descripcion"]):
                                dcd[clave] = {
                                    "asignatura": asignatura,
                                    "codigo": codigo,
                                    "descripcion": descripcion,
                                    "subnivel": subnivel,
                                    "indicador": indicador,
                                }
                            elif indicador and not dcd[clave].get("indicador"):
                                dcd[clave]["indicador"] = indicador
                            encontradas += 1
        print(f"{archivo}: {encontradas} destrezas leídas")

    registros = sorted(dcd.values(), key=lambda r: (r["subnivel"], r["asignatura"], r["codigo"]))
    print(f"\nTotal únicas: {len(registros)}")
    if desconocidos:
        print(f"Prefijos NO mapeados (revisar): {desconocidos}")

    resumen = {}
    for r in registros:
        clave = f"{r['subnivel']}/{r['asignatura']}"
        resumen[clave] = resumen.get(clave, 0) + 1
    for clave in sorted(resumen):
        print(f"  {clave}: {resumen[clave]}")

    with open(SALIDA_JSON, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False, indent=1)
    return registros


def generar_sql(registros):
    def sql_texto(valor: str) -> str:
        return "'" + valor.replace("'", "''") + "'"

    lineas = [
        "-- ============================================================",
        "-- EDINUN STEAM — Seed de destrezas con criterios de desempeño",
        "-- Generado por scripts/extraer_dcd.py desde los PDF del",
        "-- Currículo Priorizado del Mineduc. NO editar a mano: regenerar.",
        "-- ============================================================",
        "",
        "-- Asignaturas del BGU que no estaban en el seed inicial",
        "insert into asignaturas (codigo, nombre, es_principal) values",
    ]
    valores_asig = [
        f"  ({sql_texto(codigo)}, {sql_texto(nombre)}, false)"
        for codigo, nombre in ASIGNATURAS_NUEVAS.items()
    ]
    lineas.append(",\n".join(valores_asig))
    lineas.append("on conflict (codigo) do nothing;")
    lineas.append("")
    lineas.append("insert into dcd (asignatura_id, codigo, descripcion, subnivel, indicador) values")

    valores = []
    for r in registros:
        indicador = sql_texto(r["indicador"]) if r.get("indicador") else "null"
        valores.append(
            "  ((select id from asignaturas where codigo = "
            f"{sql_texto(r['asignatura'])}), {sql_texto(r['codigo'])}, "
            f"{sql_texto(r['descripcion'])}, {sql_texto(r['subnivel'])}, {indicador})"
        )
    lineas.append(",\n".join(valores))
    lineas.append(
        "on conflict (asignatura_id, codigo) do update set\n"
        "  descripcion = excluded.descripcion,\n"
        "  subnivel = excluded.subnivel,\n"
        "  indicador = excluded.indicador;"
    )
    lineas.append("")

    with open(SALIDA_SQL, "w", encoding="utf-8") as f:
        f.write("\n".join(lineas))
    print(f"\nSQL generado: {SALIDA_SQL}")


if __name__ == "__main__":
    registros = extraer()
    generar_sql(registros)
