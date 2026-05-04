# Who's About? V1 Prototype

This is a phone-ready PWA prototype for the private no-chat meetup app.

## What works in this version
- Home feed with meetup cards
- Create a meetup with required time and location
- Set replies only: I'm in, maybe, on my way, arrived, what time, where
- Moderator/Admin role toggle
- Pending join requests
- Static poster/fingerprint concept
- Print authorisation code demo: 482913
- Live 2-hour QR demo
- Rules and support tab
- Local browser storage

## Important limits
This is a prototype. It does not yet have:
- Real accounts
- Real backend database
- Real push notifications
- Real QR scanning
- Real App Store / Play Store app package

For reliable closed-app push notifications, the production version should be built as React Native + Firebase for iOS and Android.

## Admin lock demo
- Admin unlock code: 1937
- Print authorisation code: 482913
- Admin/moderator controls are hidden/locked until the admin code is entered.

## Code security update
The demo admin and print codes are no longer stored as plain text in app.js.
They are checked with SHA-256 hashes in the prototype.

Important: for a real released app, admin permissions and poster creation must be checked on the backend, because any client-side app code can eventually be inspected.


## Current admin lock
Admin unlock code for this build: 28041972
Admin code is stored as SHA-256 hash in app.js:
6aaa689ab4cc5b8f9890452ab921f0861c773508870cd3cca0fc68f4270ad5c3

## Netlify Drop
Unzip this package, then drag the folder called `meetup_app_v1` into Netlify Drop.
