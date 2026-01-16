# Admin Panel Guide

This guide covers the admin UI (`admin.html`) and SSH-signed requests.

## Access
1. Start the server:
   - `node server/index.js`
2. Open:
   - `http://localhost:3000/admin.html`

## SSH Auth Flow (Summary)
1. Fill Key ID + Timestamp.
2. Use the message box to create the signed message:
   - `METHOD`
   - `PATH`
   - `TIMESTAMP`
   - `BODY_SHA256`
3. Sign with your SSH key:
   - `ssh-keygen -Y sign -f /var/berrymx/keys/berrymx_admin -n berrymx-api /tmp/berrymx-message`
4. Base64 the signature and paste into the form.

## Global Auth Helper
At the top, the "SSH Kimlik Bilgileri" card lets you paste Key ID, Timestamp,
and Signature once, then apply to all forms.

## SEO List Editor
- Click `Yukle` to load current SEO pages.
- Edit rows, add a new row at the bottom.
- Click `JSONa Uygula` to update the SEO JSON payload.
- Sign and submit in the SEO form.

## Projects / Software Lists
- Click `Listeyi Yukle` to fetch items.
- Click `Duzenle` to populate the edit form with the selected item.
- Edit JSON, sign, and submit.

## Messages
- Click `Listeyi Yukle` to view contact form submissions.
- Messages are read-only in the admin UI.
