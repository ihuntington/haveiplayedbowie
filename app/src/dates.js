function startOfDay(date) {
  return new Date(date.setHours(0, 0, 0, 0));
}

function isSameDay(dateA, dateB) {
  return startOfDay(dateA).getTime() === startOfDay(dateB).getTime();
}

function isToday(date) {
  return isSameDay(date, new Date());
}

module.exports = {
  isToday,
};
