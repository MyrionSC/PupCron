#!/usr/bin/env bash
scp -r build/asset-manifest.json build/favicon.ico build/index.html build/logo192.png build/logo512.png build/manifest.json build/robots.txt build/static marand:/var/www/cronpup.marand
