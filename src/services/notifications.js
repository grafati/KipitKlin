import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const ensureNotificationPermission = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

// Schedules 3 reminders for a cleanup date: 2 days before, 1 day before, morning of
export const scheduleCleanupReminders = async (cleanupDate, siteTitle) => {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return [];

  const reminders = [
    { daysBefore: 2, hour: 9, label: "in 2 days" },
    { daysBefore: 1, hour: 9, label: "tomorrow" },
    { daysBefore: 0, hour: 7, label: "today" },
  ];

  const scheduledIds = [];

  for (const { daysBefore, hour, label } of reminders) {
    const triggerDate = new Date(cleanupDate);
    triggerDate.setDate(triggerDate.getDate() - daysBefore);
    triggerDate.setHours(hour, 0, 0, 0);

    if (triggerDate.getTime() <= Date.now()) continue; // don't schedule past reminders

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Cleanup Reminder 🧹",
        body: `Cleanup at "${siteTitle}" is ${label}!`,
      },
      trigger: { type: "date", date: triggerDate },
    });
    scheduledIds.push(id);
  }

  return scheduledIds;
};