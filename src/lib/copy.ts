export const copy = {
  siteName: "82 Startup",
  nav: { signIn: "Sign in", profile: "Profile", signOut: "Sign out", events: "Events" },
  login: {
    title: "Sign in to 82 Startup",
    emailLabel: "Email",
    emailButton: "Email me a sign-in link",
    google: "Continue with Google",
    sent: "Check your email for a sign-in link. Open it in this browser.",
    errors: {
      email: "Enter your email address.",
      send: "We could not send the email. Try again in a minute.",
      provider: "We could not start that sign-in. Try again.",
      auth: "That sign-in link did not work. Request a new one.",
    },
  },
  profile: {
    title: "Your profile",
    pickType: "Tell us who you are so others know how to connect with you.",
    name: "Name",
    jobTitle: "What is your job title",
    company: "Company",
    companyWebsite: "Company website",
    bio: "About you",
    linkedin: "LinkedIn URL",
    memberType: "I am",
    types: {
      startup: "Startup",
      investor: "Investor",
      student: "Student",
      corporate: "Corporate",
      institution: "Institution",
      other: "Other",
    },
    save: "Save profile",
    saved: "Profile saved.",
    errors: {
      name: "Enter your name (up to 100 characters).",
      job_title: "Job title can be up to 120 characters.",
      company_name: "Company can be up to 100 characters.",
      company_website: "Use a http:// or https:// address (up to 200 characters).",
      bio: "About you can be up to 1000 characters.",
      linkedin_url: "Use a https://www.linkedin.com/... address.",
      member_type: "Pick one of the options.",
      save: "We could not save your profile. Try again.",
    },
  },
  events: {
    title: "Events",
    upcoming: "Upcoming",
    past: "Past",
    emptyUpcoming: "No upcoming events.",
    emptyPast: "No past events.",
    loading: "Loading events…",
    getTickets: "Get tickets",
    allEvents: "All events",
    notFoundTitle: "Event not found",
    cover: "Event cover image",
  },
} as const;

export function loginErrorText(code: string | null): string | null {
  if (code === null || !Object.hasOwn(copy.login.errors, code)) return null;
  return copy.login.errors[code as keyof typeof copy.login.errors];
}
