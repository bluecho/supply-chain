# Prakritik India Initiatives: Supply Network

A PHP + MySQL web app that presents **Prakritik India Initiatives as the central supply-chain operator**. Every location on the map is one of the company's own assets, not a third-party vendor:

- Sourcing locations
- Chipping centers
- Processing facilities
- Collection centers
- Storage yards
- Logistics hubs

Supply routes connect these assets to the customer mills (ITC PSPD, TNPL).

```
                 PRAKRITIK INDIA INITIATIVES
          ┌───────────────────┼───────────────────┐
     Raw material        Chipping centers     Other assets
      locations              / plants          / collection
          └───────────────────┼───────────────────┘
                     Quality / processing
                              │
                     Dispatch / logistics
                    ┌─────────┴─────────┐
                 ITC PSPD             TNPL
```

## Pages

The navigation has six sections. Sections with several pages show a small sub-navigation.

| Section | Pages |
|---|---|
| Overview | Headline, four key numbers, the network map and the supply record chart |
| Network | **Map** with filters (asset type, material, product type, search). **Assets**, each with a profile page. **Routes**: trace a product to a customer along the road |
| Products | **Materials**: the four species and their products. **Processing**: capabilities and processing sites |
| Customers | Each mill's delivery figures and monthly chart. Routes and connected assets fold away under "Show more" |
| Sustainability | The EUDR section, then sustainability points |
| About | Company text, contact details and the organisation diagram |
| Admin | Sub-tabs: Assets, Customers, Supply data, Road routes, Site content, Users |

## Two kinds of accounts

| | Admin | Viewer (potential customer) |
|---|---|---|
| Network map, assets, capabilities, materials, routes, customers | ✅ | ✅ |
| Site in-charge, phone, email, exact address, Google Maps link, internal notes | ✅ | 🔒 blurred placeholder |
| Exact coordinates | ✅ | Rounded to about 1 km |
| Edit anything, manage users | ✅ | ❌ |

Internal site details live in their own table (`asset_private`), and the server never reads that table for viewer sessions. The blurred text viewers see is placeholder text, so viewing the page source or network traffic doesn't reveal the real details.

## Requirements

- PHP 8.1 or newer, with `pdo_mysql`
- MySQL 5.7+ or MariaDB 10.3+
- Apache or Nginx. Shared hosting such as cPanel or Hostinger works.

## Install

1. Upload the project to your server.
2. Point the domain's document root at the `public/` folder. If your host doesn't let you change it, upload everything to the web root. The root `.htaccess` then routes requests into `public/` and blocks `app/` and `database/`.
3. Create an empty MySQL database and a database user.
4. Copy `app/config.sample.php` to `app/config.php` and fill in the database details and your sales contact email.
5. Open `https://your-domain/install.php`. Choose the admin username and password. This creates the tables and loads the starting network.
6. **Delete `public/install.php` from the server.** It also locks itself once an account exists.

To set up the database by hand instead, import `database/schema.sql` and then `database/seed.sql` in phpMyAdmin. The first admin account still needs to be created with `install.php`.

### Run locally

```bash
cp app/config.sample.php app/config.php   # then edit the DB settings
php -S localhost:8080 -t public
# open http://localhost:8080/install.php
```

## Upgrading from the earlier "vendor" version

If the earlier version is already installed:

1. Upload the new files.
2. Sign in as an admin.
3. Open `/install.php` and click **Upgrade now**.

User accounts are kept. The old vendor tables are replaced by the asset-based network. Vendor contact details entered in the old version are not carried over, so copy anything you need first.

## Editing the network

In **Admin → Assets**, each asset has:

- A type, location, capacity, capabilities and the products it handles.
- **Sends material to**: tick the assets or customers it supplies. These ticks are the supply routes. Routes are built from them automatically, for example sourcing location → chipping center → ITC PSPD.

Pasting a Google Maps link fills in the coordinates.

## Map backgrounds

The map uses free base maps that need no API key:
- **Light**: Esri Light Gray. This is the default.
- **Streets**: OpenStreetMap.
- **Satellite**: Esri World Imagery.

Use the picker at the top right of the map to switch between them. If a provider fails to load, the map moves to the next one automatically.

For a commercial provider with an API key, such as MapTiler, Mapbox or Stadia, add a `map_tiles` entry to `app/config.php`. See `app/config.sample.php`. Your provider then becomes the default base map.

## Supply data (dispatch log book)

**Admin → Supply data** imports the dispatch log book (.xlsx):

1. Choose the workbook and click **Read workbook**. Every sheet with a "Truck Number" column is listed with its trucks, tonnes delivered and months.
2. Sheets named like "Log Book" or "Assessment" repeat trips from the main sheets. They are left unticked so nothing is counted twice.
3. Duplicate weighbridge (WC) tickets are counted once.
4. Pick the product and the display name for each sheet, choose the customer, and click **Import ticked sheets**.

Importing again replaces that customer's earlier import, so upload the updated log book whenever you like.

Only monthly totals are stored:

- Trucks
- Tonnes delivered at the mill
- Tonnes dispatched
- Transit weight loss
- Days from dispatch to the mill

Truck numbers, driver and transporter details, rates, invoices, GST and margins are read only to count trips and are never saved. Customers (viewers) see tonnes delivered, trucks, average load and transit time. Transit weight loss is shown to admins only.

## Road routes

Each supply link is routed along roads once, using the free OSRM routing service, and stored with its road distance and drive time. The map lines, the moving trucks and the route distances then follow the road. Routes are recalculated automatically when an asset or customer moves. You can also use **Admin → Road routes**.

- Customers never see the exact yard: the road line stops about 1.5 km from each asset and starts at the rounded position.
- Admins get an "Open truck route in Google Maps" link on each route in Logistics.
- To use a different OSRM-compatible server, set `routing.url` in `app/config.php`. Set `routing.enabled` to `false` to switch road routing off.

The server needs outgoing HTTPS access (curl or `allow_url_fopen`), which most hosts allow.

## Database updates

New versions update the database automatically on the first page load after the files are uploaded. You don't need to run install.php again.

## Starting data

`database/seed.sql` loads the 5 locations as a **first draft**:

| Code | Asset | Coordinates | Sends to |
|---|---|---|---|
| A-01 | Jahangirabad Sourcing Location (Lucknow Division) | 27.5220617, 81.1168333 | Tambour Chipping Center |
| A-02 | Tambour Chipping Center (Sitapur) | 27.7387548, 81.1490577 | ITC PSPD |
| A-03 | Nariyawal Sourcing Location (Bareilly) | 28.1603603, 79.5777206 | Tambour Chipping Center |
| A-04 | Nanded Chipping Center | 19.1399665, 77.3447728 | ITC PSPD |
| A-05 | Hyderabad Chipping Center | 13.4936228, 77.4701614 | TNPL |

Asset types, capacities, capabilities, products handled, routes and the sustainability text are assumptions. Correct them in Admin. The A-05 map pin is near Doddaballapur, Karnataka, not Hyderabad, so please confirm that location.

Customer volumes and supply history start empty. They only appear once entered in Admin, so the app never shows made-up figures.

## Project layout

```
app/          PHP logic (config, database, auth, supply network). Not web-accessible.
database/     schema.sql and seed.sql
public/       Web root: index.php, login.php, api.php, install.php, assets/
```

Security notes:

- Passwords are stored with `password_hash`.
- Sessions use HttpOnly and SameSite cookies, and all changes require a CSRF token.
- Failed logins are limited to 10 per IP per 15 minutes.
- All queries use prepared statements.
