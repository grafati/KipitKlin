const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function secondAndThirdSaturday(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const firstSaturday = 1 + ((6 - firstDay + 7) % 7);
  return [firstSaturday + 7, firstSaturday + 14].map((day) => new Date(year, month, day));
}

export function upcomingCleanupDates(referenceDate = new Date()) {
  const dates = [];
  const startMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  for (let monthOffset = 0; dates.length < 6; monthOffset += 1) {
    const month = new Date(startMonth.getFullYear(), startMonth.getMonth() + monthOffset, 1);
    for (const date of secondAndThirdSaturday(month.getFullYear(), month.getMonth())) {
      if (date >= new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())) {
        dates.push(date);
      }
    }
  }

  return dates.slice(0, 6).map((date) => ({
    value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    label: `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()} (${date.getDate() <= 14 ? "Second" : "Third"} Saturday)`,
  }));
}
