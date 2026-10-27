# Official event data

Verified against the organizer’s Luma calendar and event pages on October 26, 2026.

Calendar: https://luma.com/calendar/cal-4bdU9xyDKnEHDZ2

The calendar and the additional organizer-provided event page list **six separately registered events across four days, March 16–19, 2027**, in the SF Bay Area. The flagship Summit spans March 17–18. The March 19 VIP event is in Mountain View, not San Francisco; follow the published location block rather than the stale “San Francisco” phrase in its body. This supersedes the initial four-event / three-date snapshot.

All website event times use **America/Los_Angeles / PDT (UTC−07:00)**, as displayed on the event pages. The browser’s EDT clock is not the event timezone.

| Event | Local dates and published time | Venue | Published ticket tiers (USD) | Official registration |
|---|---|---|---|---|
| 82 Startup Opening Night 2027 | March 16, 17:00–21:00 PDT | Salesforce Tower, 415 Mission St, San Francisco, CA 94105 | Ticket $200 | https://luma.com/8faq28ez |
| 82 Startup Summit 2027 | March 17 at 09:00 through March 18 at 18:00 PDT | Fort Mason Center, 2 Marina Blvd, San Francisco, CA 94109 | Early Bird $25; Standard $50 | https://luma.com/sell0ikl |
| 82 Startup Expo 2027 | March 17 at 10:00 through March 18 at 18:00 PDT | Fort Mason Center · Gateway Pavilion, 2 Marina Blvd, San Francisco CA 94109 | Free; registration required | https://luma.com/ro8918x0 |
| Founders & Funders Evening | March 17, 18:30–21:30 PDT | Fort Mason Center, same address | Early Bird $50; Standard $100 | https://luma.com/9qj9ujht |
| Community Evening: Closing Celebration of the 82 Startup Summit | March 18, 18:30–21:30 PDT | Fort Mason Center, same address | Early Bird $50; Standard $100 | https://luma.com/6vy0xhk9 |
| 82 Night: VIP After Party | March 19, 18:00–21:00 PDT | The Ameswell Hotel, 800 Moffett Blvd, Mountain View, CA 94043 | Limited Ticket $100; invited VIP guests | https://luma.com/yu4fof7p |

The two evening descriptions retain an old “[Time TBD]” phrase; use their published event-header times above. The Summit does not publish individual session times or a March 18 opening hour; do not fabricate them. Its published start/end bounds are not a claim of continuous overnight sessions.

`public/event-data.js` is the shared source for homepage cards, the date-filtered schedule, and the ticket directory. Bookings and payment occur **only on Luma**, in a new tab with `noopener noreferrer`. Generic ticket CTAs lead to the six-event chronological ticket timeline. Contextual event CTAs lead directly to that event’s unique official URL. There is no local checkout, reservation, fake purchase modal, Day + Dinner selector, separate Day 01/02 pass, or invented bundle. Luma owns availability, tiers, fees and final payment amounts.

This supersedes the previous March 16 reception at Fort Mason, day-pass/dinner options, “prices coming soon” notices and absent-checkout workflow. The homepage’s 1,500 attendance figure remains an explicitly labeled planning estimate from the earlier organizer brief, not a figure asserted by this Luma calendar.

Homepage display range override: March15–21, 2027. This is presentation copy only; all individual event dates and Luma ticket facts above remain unchanged.

## Luma Expo synchronization — October 26, 2026

The official calendar now includes 82 Startup Expo 2027 (https://luma.com/ro8918x0), March 17 10:00 through March 18 18:00 PDT, Fort Mason Center · Gateway Pavilion, 2 Marina Blvd, San Francisco CA 94109. Admission is free with registration required. Use the published header bounds despite the body’s Time TBD; do not imply overnight sessions. Preserve the separately supplied March 19 VIP event. There are six events total. The homepage displays all six in chronological order in one grid: three columns and two rows on desktop, two columns on tablet, one on mobile. This supersedes the four-card layout and separate full-width VIP feature. Schedule and tickets use the same shared event source; show Expo on both days, its free registration action and official link. Keep counts and metadata at six; the homepage date range remains March 15–21.

## Homepage event timeline — latest layout

Replace the six-card 3-column/2-row homepage layout with one chronological vertical timeline. Preserve all six existing gradient/grain artworks and titles, event facts and individual registration links. Desktop rows contain a connected date rail, artwork and details; mobile rows keep the date rail beside stacked artwork/details. This explicitly supersedes the previous homepage grid and separate VIP feature. Use program-timeline rather than program-cards so the old full-row card overlay does not cross timeline content. Keep the 10px mobile outer gutters, larger hero title, full-width mobile hero button and local-only hold.
