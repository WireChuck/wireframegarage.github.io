# Wireframe Garage website

A plain static website: HTML, CSS and a little JavaScript, with no build step and no server.

**To put it online and set up the editor, follow [`SETUP.md`](SETUP.md).**

## Changing products, the FAQ and settings

After setup you don't edit files by hand. Go to **app.pagescms.org**, open `wireframe-garage`, and use:

- **Products:** add, edit or hide products, upload photos, and set prices for the model file, printed part and sticker versions. Leave a price empty if you don't sell it that way.
- **FAQ & policies:** the questions and the Shipping / Returns / File license / Privacy text near the bottom of the page. Each policy also gets a link in the footer.
- **Shop settings:** shop name, email, shipping time and cost, currency, PayPal Client ID and the contact form address.

Click **Save** and the live site updates about a minute later.

To add a new **category**, open `.pages.yml` on GitHub (click the file, then the pencil icon) and add it to the `values: [Interior, Exterior, …]` list.

## Payments (card + PayPal)

Customers add items to the cart and pay at checkout with a **PayPal** button or a **Debit or Credit Card** button. Card buyers don't need a PayPal account. Both go through one PayPal Business account, and the money lands in that account.

Until you add a PayPal Client ID, the cart shows **"Send order request"** instead, which fills in the contact form with the order.

### Set it up

1. **Get a PayPal Business account** (free) at paypal.com. A personal account can be upgraded to Business.
2. **Get your Client ID:** log in at **developer.paypal.com** → **Apps & Credentials**.
   - Start on the **Sandbox** tab (test mode). Open the default app, or click **Create App**, and copy the **Client ID**.
   - Never copy the **Secret** onto the website. Only the Client ID goes here.
3. **Paste it** into **Shop settings → PayPal Client ID** in the editor. Also check the currency and shipping cost.
4. **Test a purchase:** on developer.paypal.com → **Testing Tools** → **Sandbox Accounts**, there's a fake buyer account you can log in with at checkout. No real money moves in Sandbox.
5. **Go live:** switch to the **Live** tab on developer.paypal.com, copy that Client ID, and replace the Sandbox one.
6. Under Account Settings → Website payments, make sure **"PayPal account optional"** is on (it usually is). That's what lets people pay by card without signing up for PayPal.

### When an order comes in
PayPal emails you the items, the buyer's email address and (for printed parts and stickers) their shipping address. You'll also see it under Activity in your PayPal account.

- **Model files:** email the files to the buyer.
- **Printed parts and stickers:** make, ship, and send tracking. You can also add tracking in PayPal.

**Check the amount before you fulfil an order.** Prices are worked out in the visitor's browser, so a tech-savvy person could change them. If the amount paid doesn't match the listed prices, refund it in PayPal.

PayPal takes a small fee on each sale (a few percent plus a fixed amount). Sales tax isn't added automatically. If you need to collect it, ask and it can be added.

## Contact form
By default, the form opens the visitor's email app, addressed to the email in Shop settings.
To have it send directly, sign up for a free form service (Formspree, Basin, etc.) and paste its URL into **Shop settings → Contact form address**.

## Colors
The site is always dark. Change `--accent` near the top of `styles.css` to re-color buttons and highlights, or the other values there to adjust the background and text shades.

## What's in the folder
- `index.html`, `styles.css`, `app.js`: the page itself
- `data/products.json`, `data/help.json`, `data/shop.json`: products, FAQ & policies, and shop settings. The editor changes these for you.
- `images/`: banner, logo and icons. `images/products/` holds product photos uploaded through the editor.
- `.pages.yml`: tells the editor what can be edited and what the forms look like
- `.nojekyll`: tells GitHub Pages to serve the files as they are

The site reads its products from the `data` files, which browsers won't do for a page opened straight from your disk. So double-clicking `index.html` shows the page without products. Look at the live site instead.
