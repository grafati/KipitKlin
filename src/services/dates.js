// Get the 2nd and 4th Saturday of a given month/year
function getNthSaturday(year, month, nth) {
  const date = new Date(year, month, 1);
  let saturdayCount = 0;

  while (date.getMonth() === month) {
    if (date.getDay() === 6) {
      saturdayCount++;
      if (saturdayCount === nth) {
        return new Date(date);
      }
    }
    date.setDate(date.getDate() + 1);
  }
  return null;
}

// Get upcoming cleanup dates (2nd + 4th Saturday) for the next `monthsAhead` months
export const getUpcomingCleanupDates = (monthsAhead = 3) => {
  const today = new Date();
  const dates = [];

  for (let i = 0; i < monthsAhead; i++) {
    const targetMonth = today.getMonth() + i;
    const targetYear = today.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;

    const secondSaturday = getNthSaturday(targetYear, normalizedMonth, 2);
    const fourthSaturday = getNthSaturday(targetYear, normalizedMonth, 4);

    [secondSaturday, fourthSaturday].forEach((date) => {
      if (date && date >= today) {
        dates.push(date);
      }
    });
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
};

// Format a date nicely, e.g. "Saturday, October 11, 2026"
export const formatCleanupDate = (date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};