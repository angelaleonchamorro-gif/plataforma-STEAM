// Grados del sistema educativo ecuatoriano con su subnivel curricular
// (determina qué DCD se ofrecen) y la edad de referencia (insumo para la IA).
// Preparatoria (1ero EGB) queda fuera: el Currículo Priorizado cargado no la incluye.

export interface GradoInfo {
  grado: string;
  subnivel: "Elemental" | "Media" | "Superior" | "BGU";
  edad: number;
}

export const GRADOS: GradoInfo[] = [
  { grado: "2do EGB", subnivel: "Elemental", edad: 6 },
  { grado: "3ero EGB", subnivel: "Elemental", edad: 7 },
  { grado: "4to EGB", subnivel: "Elemental", edad: 8 },
  { grado: "5to EGB", subnivel: "Media", edad: 9 },
  { grado: "6to EGB", subnivel: "Media", edad: 10 },
  { grado: "7mo EGB", subnivel: "Media", edad: 11 },
  { grado: "8vo EGB", subnivel: "Superior", edad: 12 },
  { grado: "9no EGB", subnivel: "Superior", edad: 13 },
  { grado: "10mo EGB", subnivel: "Superior", edad: 14 },
  { grado: "1ero BGU", subnivel: "BGU", edad: 15 },
  { grado: "2do BGU", subnivel: "BGU", edad: 16 },
  { grado: "3ero BGU", subnivel: "BGU", edad: 17 },
];

export function subnivelDeGrado(grado: string): GradoInfo["subnivel"] | null {
  return GRADOS.find((g) => g.grado === grado)?.subnivel ?? null;
}
