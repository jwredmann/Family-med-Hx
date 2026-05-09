# Redmann Family Medical History — Setup Guide

This guide walks you through setting up the web app in Google Apps Script.
It takes about 15 minutes and only needs to be done **once** by John Sr.
After that, the web app link can be shared with all family members.

---

## What You Will Need

- Your Google account (the one that will "own" this project)
- A computer or laptop (easier than a phone for this one-time setup)
- About 15 minutes

---

## Step 1 — Open Google Apps Script

1. Go to **[script.google.com](https://script.google.com)** in your browser
2. Sign in with your Google account if prompted
3. Click the blue **"New project"** button (top left)

You will see a code editor with a file called `Code.gs` already open.

---

## Step 2 — Rename the Project

1. At the top of the page, click where it says **"Untitled project"**
2. Type: `Redmann Family Medical History`
3. Press Enter or click OK

---

## Step 3 — Copy the Code Files

You need to create **4 files** in the Apps Script editor and paste code into each.

### File 1 — Code.gs (already exists)

1. Click on `Code.gs` in the left panel
2. **Select all** the existing text (Ctrl+A on Windows, Cmd+A on Mac) and **delete it**
3. Open the file `src/Code.gs` from this repository
4. Copy everything and paste it into the Apps Script editor
5. Press **Ctrl+S** (or Cmd+S) to save

### File 2 — Index.html

1. Click the **+** button next to "Files" in the left panel
2. Choose **"HTML"**
3. Name it exactly: `Index` (no .html — Apps Script adds that)
4. Delete the default content, then paste everything from `src/Index.html`
5. Save with Ctrl+S

### File 3 — Stylesheet.html

1. Click **+** → **HTML**
2. Name it: `Stylesheet`
3. Paste everything from `src/Stylesheet.html`
4. Save

### File 4 — JavaScript.html

1. Click **+** → **HTML**
2. Name it: `JavaScript`
3. Paste everything from `src/JavaScript.html`
4. Save

---

## Step 4 — Run the Database Setup (one time only)

This creates a Google Sheet that stores all the family data.
It also pre-loads all the known Redmann family members.

1. In the Apps Script editor, find the **function selector dropdown** at the top
   (it may say "myFunction" or "doGet")
2. Click it and select **`setupDatabase`**
3. Click the **▶ Run** button (play icon)
4. A popup will ask for permissions — click **"Review permissions"**
5. Choose your Google account
6. You may see a warning that says "Google hasn't verified this app" —
   this is normal for personal scripts. Click **"Advanced"** then
   **"Go to Redmann Family Medical History (unsafe)"**
7. Click **"Allow"**

The script will run. When it finishes, look at the **Execution log** at the bottom.
You will see something like:

```
✅ Setup complete!
📊 Spreadsheet URL: https://docs.google.com/spreadsheets/d/...
🔑 Default admin password: RedmannFamily2024!
```

**Save that Spreadsheet URL** — it's your family database.
You can also find it any time by going to [sheets.google.com](https://sheets.google.com).

---

## Step 5 — Deploy as a Web App

1. Click **"Deploy"** button (top right of the Apps Script editor)
2. Choose **"New deployment"**
3. Click the gear icon ⚙ next to "Select type" and choose **"Web app"**
4. Fill in the settings:
   - **Description:** `Redmann Family Medical History v1`
   - **Execute as:** `Me (your Google account)`
   - **Who has access:** `Anyone`  ← this allows family without Google accounts
5. Click **"Deploy"**
6. Copy the **Web app URL** — this is the link you share with family!

The URL will look like:
`https://script.google.com/macros/s/AKfycb.../exec`

---

## Step 6 — Test It

1. Paste the Web app URL into your browser
2. You should see the Redmann Family Medical History home page
3. Try clicking **"Family Members"** — you should see the pre-loaded family tree
4. Try the **Admin** button with password: `RedmannFamily2024!`

---

## Step 7 — Change the Admin Password (Recommended)

The default password is `RedmannFamily2024!` — change it to something only
the admin group knows.

1. In Apps Script, go to **Project Settings** (gear icon, left sidebar)
2. Scroll down to **"Script Properties"**
3. Click **"Edit script properties"**
4. Find `ADMIN_PASSWORD` and change the value to your chosen password
5. Click **Save**

---

## Sharing With Family

Send family members the **Web app URL** from Step 5.

- Anyone with the link can view public records and add records
- They do **not** need a Google account
- They identify themselves using the **"Who are you?"** dropdown
- Records marked "Branch Only" are only shown to that family branch
- Records marked "Private" are only shown to admins

**Admin group** (those who should know the admin password):
- John W. Redmann, Sr.
- Amanda Redmann
- Christian Courier
- Anna Redmann
- Mary Redmann
- Tara Redmann
- Ben Bible

---

## What's Pre-Loaded

The system comes with the following family members already entered:

**Ancestors:**
- Timothy O'Brien (1823–1873) + Margaret Abbie Collins
- Joseph Vincent Redmann (1845–1920) + Ellen Maria O'Brien (1851–1941)
- Morris Benjamin Redmann Sr. (1896–1955) + Esther Alice Joyce (1899–1956)

**Grandparents' children (Gen 4):**
Morris Jr., Esther Alice (OSU), William Vincent, Kerry Patrick,
Richard Pius, Jerry, Ralph, David, Robert

**John's Generation (Gen 5):**
John W. Redmann Sr. + Amanda, Ana Maria Chandler (Aneux), Mary,
Eugene, Teresita (Tere), Ceci Whitehurst, Alice, Maria

**John's Children (Gen 6):**
John William Jr. (William/Wm), Adelaide (Adele), Augustine (Augie)

All other family members (spouses, children, grandchildren of siblings)
can be added through the **"Add Person"** form in the app.

---

## Adding More Family Members Later

Family members can add themselves and their medical history directly
through the web app — no admin needed for that. For large additions
(like entering all of Ana Maria's or Eugene's children at once),
an admin can do it more quickly from the Admin panel.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Database not configured" error | Make sure you ran `setupDatabase()` in Step 4 |
| Changes not showing up | Re-deploy: Deploy > Manage deployments > edit > update version |
| Lost the web app URL | Deploy > Manage deployments — the URL is listed there |
| Forgot admin password | Apps Script > Project Settings > Script Properties > ADMIN_PASSWORD |
| Family member can't access | Make sure "Who has access" is set to "Anyone" in the deployment |

---

## Notes on Privacy

- **Public** records are visible to anyone with the link
- **Branch Only** records are visible only to that family branch
  (based on the "Who are you?" selection — honor system for now)
- **Private** records are visible only to admins
- The non-Redmann parent feature (for children of siblings
  whose other parent's info should stay private to that branch)
  is handled by setting records to **"Branch Only"**

---

*Built for the Redmann family by John W. Redmann, Sr. — 2025*
