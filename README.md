# CraveGo: testing and polish, pass 1

## Install

Stop the frontend and backend. Extract this ZIP and copy its `src` folder, `backend` folder, and `vite.config.ts` into your existing `crave-go` folder. Merge folders and replace matching files. Do not delete the existing folders. Restart both apps.

The complete App.tsx includes the previously tested admin panel and restaurant status controls. The package changes six files:

- src/App.tsx
- src/index.css
- backend/controllers/orderController.js
- backend/controllers/orderPricing.js (new)
- backend/controllers/restaurantOrderController.js
- vite.config.ts

Install the frontend and backend changes together: the confirmation screen now uses the server's verified order items.

## Fixed

1. **Mobile navigation:** primary links remain visible at phone widths, including the existing conditional restaurant Dashboard and Admin links.
2. **Checkout pricing:** the backend looks up menu items, restaurant ownership, prices, and delivery fees in Supabase. It validates quantities, combines duplicate menu items, and charges delivery once per restaurant. Browser-supplied names, prices, restaurant IDs, and subtotals are not trusted. If the reviewed total no longer matches, checkout stops and asks the customer to refresh and rebuild the cart.
3. **Multi-item status updates:** restaurant ownership checks use a limited list instead of expecting exactly one order-item row. Orders containing several items from the same restaurant can now update successfully.
4. **Failed order-item saves:** the backend attempts to remove the incomplete order; if cleanup also fails, it shows the order ID and asks the customer to contact support before retrying.
5. **Feedback and privacy:** restaurant loading has a 15-second timeout; a failed load no longer simultaneously claims no restaurants matched. Signing out clears order/contact/dashboard state. Successful order/dashboard reads check the current token before committing data.
6. **Production build:** CSS minification is disabled to avoid the missing optional Windows Lightning CSS binary seen in the installed dependencies. JavaScript still uses the standard production build. CSS files are larger; no dependencies were added.

## Checks completed

- TypeScript check passed for the copied current source plus these changes.
- Vite production bundle passed using the installed React plugin and the CSS workaround.
- Backend JavaScript syntax checks passed.
- Automated tests with a simulated database passed for canonical pricing, altered totals, invalid quantities, duplicate items, delivery fees, missing menu items, save success, failed-save cleanup, ownership, and status validation.
- Browser preview at 390px and 320px confirmed mobile navigation; the 320px DOM check reported no horizontal page overflow. Opening Orders while signed out opened Login.
- The running backend health endpoint and public restaurant endpoint answered a separate check; the public restaurant count was 8.

## Remaining live check

No real orders or database records were created or changed during these checks. The in-app preview timed out fetching restaurants even though the separate API request succeeded, so live end-to-end checkout across all three roles has not been verified here.

After installing:

1. As a customer, add **two different items from the same restaurant**, check the total, and place a test Cash on Delivery order.
2. Log out and sign in as that restaurant. Open Dashboard and move the order through Preparing, Out for delivery, and Delivered.
3. As the customer, confirm the order history shows Delivered.
4. As admin, find the same order and check its items, total, and status.
5. Repeat the navigation check on a phone: restaurant Dashboard and Admin should be reachable from the top navigation.

## Before deployment

This pass does not certify deployment readiness. The app still uses localhost API URLs. Order creation still uses two database writes with cleanup, rather than a single database transaction; interruption between writes can leave an incomplete order. A transaction and a request-deduplication key should be added before production. Multi-restaurant orders also still share one overall status, so one restaurant's update affects the whole order. These require a separate database/API change and were not silently changed in this UI/backend patch.
