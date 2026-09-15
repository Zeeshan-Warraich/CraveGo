# Google Maps checkout for CraveGo

## Revision: missing map section

The previous component returned nothing when the frontend Google Maps key was missing. The current project has no frontend `.env` or `.env.local` file, so that is why neither the map nor address search appeared.

This revision always displays the delivery-location section. If a key is absent or still a placeholder, it displays a clear notice and keeps manual address entry available. A live Google map still requires your own configured Google key.

## What is included

- Google address search at checkout, with Pakistan-focused results.
- A map where customers can click to place a delivery pin or drag it to their entrance.
- Selecting a search result fills the written address. Customers can add a house number or landmark and adjust the pin separately.
- Optional coordinates saved on the order and directions links in restaurant and admin order views.
- Manual address checkout remains available, including when Maps is unconfigured or unavailable.
- Existing ordering, restaurant status controls, admin features, and previous polish are preserved.

This feature does not add live driver tracking, distance-based delivery fees, delivery-area validation, or restaurant-location management.

## 1. Prepare Google Maps

In [Google Cloud Console](https://console.cloud.google.com/), create or select a project with billing enabled. Enable **Maps JavaScript API** and **Places API (New)**. Google requires a billing-enabled project and a key for this live integration; usage can incur charges. See [Google's setup guide](https://developers.google.com/maps/documentation/javascript/get-api-key) and [Places setup](https://developers.google.com/maps/documentation/javascript/place-get-started).

Create an API key for the frontend. Set its **application restriction to Websites** and allow your development URLs:

```text
http://localhost:5173/*
http://127.0.0.1:5173/*
```

If Vite runs on a different port, add that actual address. Under API restrictions, permit **Maps JavaScript API** and **Places API (New)** only. When you deploy, add your actual HTTPS website domain. This is a browser key: it is visible in browser requests, so the restrictions matter. Never put your Supabase secret or backend credentials into frontend environment variables.

Create a JavaScript map ID for production. `DEMO_MAP_ID` is included as a local-testing default. See [Google map IDs](https://developers.google.com/maps/documentation/javascript/map-ids/mapid-over).

## 2. Update Supabase

Open `database/01_delivery_location.sql` from this ZIP. Copy its contents into **Supabase → SQL Editor** for your CraveGo project and run it once.

It adds two optional columns to `orders`: `delivery_latitude` and `delivery_longitude`, with a coordinate constraint. Existing orders keep empty coordinates. The script is designed to be repeatable.

**Run this before starting the updated backend.** Its queries refer to the new columns.

## 3. Merge the application files

Stop your frontend and backend. Copy this ZIP's `src` and `backend` folders into:

```text
C:\Users\Zeeshan Warraich\crave-go
```

Choose to replace matching files. Merge the folders; do not delete your existing folders. No new npm packages are required. Keep your current `.env`, `vite.config.ts`, dependencies, and other files.

## 4. Set the frontend key

Copy the included `.env.local.example` into the main `crave-go` folder, next to the frontend `package.json`, and rename it to `.env.local`. If that file already exists, add the entries to it instead. Add your key:

```env
VITE_GOOGLE_MAPS_API_KEY=your_restricted_google_browser_key
VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

Use your own map ID for production. These entries belong in the **frontend** environment file, not `backend/.env`. In File Explorer, turn on **View → Show → File name extensions** and check the filename is `.env.local`, not `.env.local.txt`. Keep the actual key in your local configuration rather than posting it in chat.

Restart the frontend and backend. Vite loads environment variables at startup, so a browser refresh alone is insufficient after changing `.env.local`.

## 5. Test

1. As a customer, add items and open checkout.
2. Search for a street or area and select one of Google's results.
3. Check the filled address, add your house number/landmark, and move the delivery pin to the entrance. Moving the pin does not rewrite your typed address.
4. Place a test order. Confirm the restaurant dashboard's **Directions to delivery pin** link opens the selected destination.
5. Check the directions link under the admin order details.
6. Try removing the pin and placing an order using only the written address.

Google's search widget supplies keyboard access, and the draggable marker supports keyboard movement. Search is restricted to Pakistan; this can be adjusted in `DeliveryMap.tsx` if your service expands.

## Troubleshooting

- **Delivery section says map search unavailable:** set the key in `.env.local` and restart Vite.
- **No delivery section at all:** confirm the revised `src/DeliveryMap.tsx` and complete `src/App.tsx` were merged, and open the checkout page.
- **Map or search unavailable:** check billing, enabled APIs, website restrictions, and key restrictions in Google Cloud, then reload. Manual address entry remains usable.
- **Backend says columns are missing:** run the included SQL script in the correct Supabase project before restarting the backend.
- **Pin and address differ:** adjust the pin and written address before placing the order. A pin helps locate the entrance but does not replace the house number and delivery instructions.

## Verification and limits

TypeScript and production bundling passed using the current project's installed dependencies and existing CSS build workaround. Backend tests passed for coordinate validation (including zero and boundary values), absent coordinates, invalid coordinates, and persistence in the order/response. The prior checkout pricing, failure cleanup, and restaurant status tests also passed against a simulated database. The revised map widget was tested with React and a simulated Google SDK for absent/placeholder keys, address selection, busy states, map clicks, pin dragging, pin removal, and cleanup.

No Google key was used, no billing was enabled, and the Supabase script was not run during development. Live Google address search, pin dragging, and the SQL migration still require verification in your configured project. The app's existing non-atomic order-save flow and localhost deployment configuration remain separate work.

## References

- [Place Autocomplete widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Draggable advanced markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/draggable-markers)
- [Google Maps directions URLs](https://developers.google.com/maps/documentation/urls/get-started)
