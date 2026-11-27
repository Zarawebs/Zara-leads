# Zara Leads

A small business-discovery dashboard for Zara Codes. It searches Google Places for businesses by category and location, then lets you save leads and mark outreach as contacted.

## What it does
- Search Nigerian and international locations.
- Search business categories such as restaurants, salons, clothing stores, and supermarkets.
- Filter results by whether Google lists a website.
- Save prospects and mark them as contacted.
- Open the business website or Google Maps listing.

**Important:** "No website listed" does not prove a business has no website. Check the business manually before contacting it. This MVP does not monitor social media posts, scrape social networks, or send messages automatically.

## Deploy on Render (no local Node.js installation needed)
1. Create a GitHub repository and upload the contents of this folder.
2. In Render, choose **New + → Web Service**, connect the repository.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
4. Add the environment variable `GOOGLE_PLACES_API_KEY` in Render.
5. Deploy. The `/health` route should return `{"ok":true,"app":"Zara Leads"}`.

## Google Places API
Create a Google Maps Platform project and enable Places API (New). Google may require a billing profile and charges can apply. Review current pricing, quotas, and terms before enabling it. Because billing setup is involved, ask a parent/guardian to handle that step. Restrict the key to the Places API where possible.

Never put the API key in `public/` files, browser JavaScript, GitHub, or chat. Add it only as a private Render environment variable.

## Persistent saved leads
For saved leads to survive restarts/redeploys, attach a Render persistent disk mounted at `/var/data`, then set `DB_PATH` to `/var/data/zara-leads.sqlite`. Without a persistent disk, the database on a free instance may be lost when the instance is replaced. Check Render's current disk and plan pricing before adding one.

## Data handling
This app stores the Google Place ID and the business details the user chooses to save. Review Google Maps Platform terms and applicable privacy requirements before public/commercial use. Search results are not a guarantee that the business is a suitable prospect.