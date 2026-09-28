<?php
// Copy this file to app/config.php and fill in your MySQL details.
return [
    'db' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'name'     => 'supply_chain',
        'user'     => 'db_user',
        'password' => 'db_password',
    ],
    'app_name' => 'Supply Network',
    // Contact shown to customer (viewer) accounts on locked vendor details.
    'sales_contact' => 'sales@yourcompany.com',
    // Optional: your own map tile provider (e.g. MapTiler, Mapbox, Stadia) with its API key.
    // When set it becomes the default base map; the free layers stay available as fallbacks.
    // 'map_tiles' => [
    //     'name'        => 'MapTiler',
    //     'url'         => 'https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=YOUR_KEY',
    //     'attribution' => '&copy; MapTiler &copy; OpenStreetMap contributors',
    //     'maxZoom'     => 19,
    // ],
];
