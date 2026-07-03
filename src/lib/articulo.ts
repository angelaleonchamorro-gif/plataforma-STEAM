// Estructura IMRD del artículo científico (divulgación en BGU).
// Cada sección lleva una guía pedagógica que se muestra como ayuda.

export interface SeccionArticulo {
  clave: string;
  nombre: string;
  guia: string;
  filas: number;
}

export const SECCIONES_ARTICULO: SeccionArticulo[] = [
  {
    clave: "titulo",
    nombre: "Título",
    guia: "Un título claro y específico que refleje lo que investigaste y construiste.",
    filas: 1,
  },
  {
    clave: "resumen",
    nombre: "Resumen",
    guia: "En 5-8 líneas: cuál fue el reto, qué construyeron, cómo lo probaron y qué resultado obtuvieron.",
    filas: 4,
  },
  {
    clave: "introduccion",
    nombre: "Introducción",
    guia: "Presenta el problema o reto, por qué es importante, y qué se propusieron lograr (objetivo).",
    filas: 6,
  },
  {
    clave: "materiales_metodos",
    nombre: "Materiales y métodos",
    guia: "Lista los materiales del prototipo y describe paso a paso cómo lo construyeron y cómo midieron su desempeño.",
    filas: 6,
  },
  {
    clave: "resultados",
    nombre: "Resultados",
    guia: "Presenta los datos de las pruebas: ¿qué mediste? ¿qué valores obtuviste? Incluye las mejoras del rediseño si las hubo.",
    filas: 6,
  },
  {
    clave: "discusion",
    nombre: "Discusión",
    guia: "Interpreta los resultados: ¿el prototipo cumplió el reto? ¿por qué sí o por qué no? ¿qué mejorarías?",
    filas: 5,
  },
  {
    clave: "conclusiones",
    nombre: "Conclusiones",
    guia: "2-4 ideas principales que aprendieron del proyecto, conectadas con el objetivo inicial.",
    filas: 4,
  },
  {
    clave: "referencias",
    nombre: "Referencias",
    guia: "Fuentes que consultaron (libros, páginas web, videos), una por línea.",
    filas: 3,
  },
];

export type SeccionesArticulo = Record<string, string>;
