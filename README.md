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

| Page | What it shows |
|---|---|
| Dashboard | Headline, company structure diagram, KPIs, network map, "from wood to industrial biomass" flow |
| Supply Network | Full map with filters by asset type, material (Poplar, Eucalyptus, Shubabul, Casuarina) and product type (Debarked, With Bark, Core Chips) |
| Assets | Assets grouped by type. Each has a profile: materials handled, capabilities, capacity, and supply connectivity from source to this asset to customer |
| Materials | The four material groups, their products, where each is handled and which customers receive it |
| Processing | Processing capabilities and the assets that provide them |
| Logistics | Pick a product and a customer to trace every route to the mill, with animated trucks |
| Customers | Each mill's materials supplied, connected assets, routes, volumes and monthly supply history chart |
| Sustainability, About Us | Editable text from Admin → Site content |
| Admin | Manage assets and their routes, customers and history, site text, and user accounts |

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
