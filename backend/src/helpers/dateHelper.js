// Utilidades para manejo de fechas con zona horaria de Colombia

const { config } = require('../config/env');

const getColombiaDate = () => {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: config.timezone })
  );
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-CO', {
    timeZone: config.timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('es-CO', {
    timeZone: config.timezone,
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateTime = (date) => {
  return `${formatDate(date)} a las ${formatTime(date)}`;
};

const isBusinessOpen = () => {
  const now = getColombiaDate();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [openH, openM] = config.business.openHour.split(':').map(Number);
  const [closeH, closeM] = config.business.closeHour.split(':').map(Number);

  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  return currentTime >= openTime && currentTime <= closeTime;
};

const getStartOfDay = () => {
  const now = getColombiaDate();
  now.setHours(0, 0, 0, 0);
  return now;
};

const getEndOfDay = () => {
  const now = getColombiaDate();
  now.setHours(23, 59, 59, 999);
  return now;
};

module.exports = {
  getColombiaDate,
  formatDate,
  formatTime,
  formatDateTime,
  isBusinessOpen,
  getStartOfDay,
  getEndOfDay
};
