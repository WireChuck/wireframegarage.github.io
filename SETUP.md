# Putting Wireframe Garage online (one-time setup)

This takes about 20 minutes, and everything here is free. When you're done you'll have:

- **the live site** at `https://YOUR-GITHUB-NAME.github.io/wireframe-garage/`
- **an online editor** at **app.pagescms.org**, where you add and change products from any computer or phone

Only you can make changes. The editor works by signing in with your GitHub account, and only accounts you give access to the site's files can edit them.

---

## 1. Make a GitHub account

Sign up at **github.com/signup**. GitHub stores the site's files and keeps a history of every change, so nothing you edit is ever lost for good.

## 2. Create a place for the site (a "repository")

1. Click the **+** at the top right of GitHub → **New repository**.
2. **Repository name:** `wireframe-garage`
3. Choose **Public**. Free GitHub hosting needs this. People could look at the site's files, but they can already see all of it on the website, and only you can change anything.
4. Leave the other options alone and click **Create repository**.

## 3. Upload the site

1. On the new repository's page, click the **uploading an existing file** link.
2. Open the `starion-site` folder in File Explorer, press **Ctrl+A** to select everything inside it, and drag it onto the GitHub page. Drag what's *inside* the folder, not the folder itself.
3. Check the list includes `.pages.yml`, `.nojekyll`, `index.html`, and the `data` and `images` folders.
4. Click **Commit changes** at the bottom.

## 4. Turn on the website

1. In the repository, click **Settings** → **Pages** (in the left menu).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, the branch to **main**, and the folder to **/ (root)**. Click **Save**.
3. Wait a minute or two and refresh. The page shows **"Your site is live at…"** with the address. Open it to check.

## 5. Connect the editor

1. Go to **app.pagescms.org** and click **Sign in with GitHub**.
2. When it asks, install the Pages CMS app on your account. Choose **Only select repositories** and pick `wireframe-garage`.
3. Open `wireframe-garage`. In the left menu you'll see **Products**, **FAQ & policies** and **Shop settings**.

## 6. First things to change

1. **Shop settings:** put in your real email. Add your PayPal Client ID once you have one (see **Payments** in `README.md`).
2. **Products:** everything there now is a sample. Change them to your real parts, or tick **Hide from the shop** until they're ready.
3. **FAQ & policies:** read every answer and policy and change anything that doesn't match how you run things. They're starting points I wrote, not legal advice. In particular, check the shipping countries and the 30-day returns window.

---

## Adding a product (every time)

1. Go to **app.pagescms.org** → `wireframe-garage` → **Products**.
2. Click the button at the bottom of the list to add an item, and fill in the name, category, what it fits, a description and the bullet points.
3. **Photos:** drag them in from your computer or phone. The first one is shown on the shop card.
4. **Prices:** fill in a price for each way you sell it (model file, printed part, sticker). Leave a price empty if you don't sell it that way. A product with no prices at all doesn't show up.
5. Click **Save**. The live site updates about a minute later.

Each product gets its own link, made from its name, like `…/?part=door-lock-knobs-pair`. Open the product and click **Copy link to this item** to share it. If you rename a product, its link changes too.

## Optional: your own domain

Buy a domain such as `wireframegarage.com` from any registrar (Cloudflare, Namecheap, Porkbun…). Then in the repository go to **Settings → Pages → Custom domain**, type it in, and follow GitHub's instructions for pointing the domain at the site.
