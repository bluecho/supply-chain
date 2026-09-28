# Supply Network

A PHP + MySQL web app that shows our raw material supply chain on an interactive map of India: vendor sites, the wood species each one supplies, and the routes to the mills we deliver to (ITC PSPD, TNPL).

There are two kinds of accounts:

| | Admin | Viewer (potential customer) |
|---|---|---|
| Map, vendor sites, capacity, materials, routes | ✅ | ✅ |
| Vendor name, contact person, phone, email, address, GSTIN, Google Maps link | ✅ | 🔒 blurred placeholder |
| Exact coordinates | ✅ | Rounded to about 1 km |
| Add, edit and delete vendors | ✅ | ❌ |
| Create and remove user accounts | ✅ | ❌ |

Viewers never receive confidential details. The server does not query the `vendor_contacts` table for viewer sessions, so the blurred text they see is placeholder text. Viewing the page source or network traffic doesn't reveal the real details.

## Requirements

- PHP 8.1 or newer, with `pdo_mysql`
- MySQL 5.7+ or MariaDB 10.3+
- Apache or Nginx. Shared hosting such as cPanel or Hostinger works.

## Install

1. Upload the project to your server.
2. Point the domain's document root at the `public/` folder. If your host doesn't let you change it, upload everything to the web root. The root `.htaccess` then routes requests into `public/` and blocks `app/` and `database/`.
3. Create an empty MySQL database and a database user.
4. Copy `app/config.sample.php` to `app/config.php` and fill in the database details and your sales contact email.
5. Open `https://your-domain/install.php`. Choose the admin username and password. This creates the tables and loads the 5 vendor locations.
6. **Delete `public/install.php` from the server.** It also locks itself once an account exists.

To set up the database by hand instead, import `database/schema.sql` and then `database/seed.sql` in phpMyAdmin. The first admin account still needs to be created with `install.php`.

### Run locally

```bash
cp app/config.sample.php app/config.php   # then edit the DB settings
php -S localhost:8080 -t public
# open http://localhost:8080/install.php
```

## Using it

- **Overview**: summary numbers, material filters, the map and a vendor list. Click any marker or list row to open the vendor's details and supply route. The page also shows the supply journey and the full vendor table.
- **Vendors**: one card per sourcing site.
- **Materials**: the product catalogue for each species. "View network" filters the map to that species.
- **Admin** (admins only):
  - Edit vendor names, contacts, capacity, materials and destination mills.
  - Add a vendor by pasting a Google Maps link. The coordinates fill in automatically.
  - Create viewer accounts for prospective customers, reset passwords and remove users.

## Map backgrounds

The map uses free base maps that need no API key:
- **Light**: Esri Light Gray. This is the default.
- **Streets**: OpenStreetMap.
- **Satellite**: Esri World Imagery.

Use the picker at the top right of the map to switch between them. If a provider fails to load, the map moves to the next one automatically.

For a commercial provider with an API key, such as MapTiler, Mapbox or Stadia, add a `map_tiles` entry to `app/config.php`. See `app/config.sample.php`. Your provider then becomes the default base map.

## Starting data

`database/seed.sql` holds the 5 locations that were provided:

| Site | Location | Coordinates |
|---|---|---|
| V-01 | Jahangirabad, Lucknow Division | 27.5220617, 81.1168333 |
| V-02 | Tambour, Sitapur | 27.7387548, 81.1490577 |
| V-03 | Nariyawal, Bareilly | 28.1603603, 79.5777206 |
| V-04 | Nanded, Maharashtra | 19.1399665, 77.3447728 |
| V-05 | Hyderabad (Two Brothers Wood Industries) | 13.4936228, 77.4701614 |

Vendor names, contacts, capacities, truck counts and material assignments are **placeholders**. Update them from the Admin tab.

## Project layout

```
app/          PHP logic (config, database, auth, vendor data). Not web-accessible.
database/     schema.sql and seed.sql
public/       Web root: index.php, login.php, api.php, install.php, assets/
```

Security notes:

- Passwords are stored with `password_hash`.
- Sessions use HttpOnly and SameSite cookies, and all changes require a CSRF token.
- Failed logins are limited to 10 per IP per 15 minutes.
- All queries use prepared statements.
