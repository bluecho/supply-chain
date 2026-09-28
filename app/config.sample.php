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
];
