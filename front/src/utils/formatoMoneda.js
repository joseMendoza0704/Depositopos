export const formatearMoneda = (numero) => {
  return numero.toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};