// src/utils/alerts.js
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// —— Config base para toasts (arriba a la derecha)
const baseToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
});

// —— Toasts rápidos
export const alertSuccess = (title = 'Listo') =>
  baseToast.fire({ icon: 'success', title });

export const alertError = (title = 'Ocurrió un error') =>
  baseToast.fire({ icon: 'error', title });

export const alertInfo = (title = 'Información') =>
  baseToast.fire({ icon: 'info', title });

export const alertWarning = (title = 'Atención') =>
  baseToast.fire({ icon: 'warning', title });

// —— Modal clásico (para confirmaciones/errores grandes)
export const modalError = (title = 'Error', text = '') =>
  Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#2563eb',
    background: '#fff',
  });

export const modalConfirm = async ({
  title = '¿Confirmar?',
  text = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  icon = 'question',
} = {}) => {
  const res = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    confirmButtonColor: '#2563eb',
    cancelButtonColor: '#6b7280',
    background: '#fff',
  });
  return res.isConfirmed;
};

// —— Confirmación para acciones destructivas (eliminar)
export const alertConfirm = async ({
  title = '¿Estás seguro?',
  text = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  icon = 'warning',
  confirmColor = '#dc2626',
} = {}) => {
  const res = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    confirmButtonColor: confirmColor,
    cancelButtonColor: '#6b7280',
    background: '#fff',
  });
  return res.isConfirmed;
};