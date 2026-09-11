import { getCurrentUserId } from "./auth";
import { formatCleanupDate, getUpcomingCleanupDates } from "./dates";
import { createPledge } from "./pledges";
import { createSite, updateSiteStatus } from "./sites";
import { signUpVolunteer } from "./volunteers";

const SAMPLE_SITES = [
  {
    title: "Trash pile behind market",
    description: "Large pile of mixed waste and plastic bags behind the local market.",
  },
  {
    title: "Dumping near riverside",
    description: "Illegal dumping of construction debris near the riverbank.",
  },
  {
    title: "Roadside litter buildup",
    description: "Accumulated litter along the roadside, mostly bottles and packaging.",
  },
  {
    title: "Abandoned lot waste",
    description: "Household waste dumped in an abandoned lot.",
  },
  {
    title: "Drainage blockage waste",
    description: "Waste blocking a drainage channel, causing flooding risk.",
  },
];

const PLACEHOLDER_PHOTO = "https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800";

// Generates a small random offset so seeded pins spread out near the given location
const randomOffset = () => (Math.random() - 0.5) * 0.01;

// Creates 5 demo sites near baseLatitude/baseLongitude, with 2-3 already having volunteers + pledges
export const seedDemoData = async (baseLatitude, baseLongitude) => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("Not signed in yet — try again in a moment.");
  }

  const upcomingDates = getUpcomingCleanupDates();
  const cleanupDate = upcomingDates[0] ? formatCleanupDate(upcomingDates[0]) : "";

  for (let i = 0; i < SAMPLE_SITES.length; i++) {
    const sample = SAMPLE_SITES[i];

    const siteId = await createSite(
      {
        title: sample.title,
        description: sample.description,
        latitude: baseLatitude + randomOffset(),
        longitude: baseLongitude + randomOffset(),
        photoUrl: PLACEHOLDER_PHOTO,
      },
      userId
    );

    // Give every other site a volunteer + pledge, so the map shows a realistic status mix
    if (i % 2 === 0) {
      await signUpVolunteer(siteId, userId, "Demo Volunteer", "Seeded for demo", cleanupDate);
      await updateSiteStatus(siteId, "Volunteers Assigned");
      await createPledge(siteId, userId, "Demo Volunteer", "Gloves", 3);
    }
  }
};