---
test: ../control-cart-honors-first-order-discount_test.md
status: passed
started: 2026-10-24T23:08:11.563Z
duration_s: 110
session_id: a2d8eaaa-6ceb-4ac6-9810-a93a63bef0aa
---

# Control cart honors first-order discount — Result

## Step 1 ✓ passed (18.2s)
md5: 38264b56fa3cfacbf5d035a46e443ad9
At http://localhost:4173/store.html?variant=A, open the control storefront as a shopper before any demo order and view its campaign offer, then assert the 20%-off-first-order offer is shown.

## Step 2 ✓ passed (26.4s)
md5: 825ba7dc274501a8cf198c8a7a40c5a5
On that control storefront, locate Halo Wireless Headphones and store its displayed price as halo_price.

## Step 3 ✓ passed (30.8s)
md5: f465fa9ce910b44da1065dda4f63e461
Add Halo Wireless Headphones to the eligible first-order cart and inspect the cart before placing a demo order, then assert its displayed discount equals 20% of halo_price.

## Step 4 ✓ passed (25.9s)
md5: 62ad5b99bdc7cca988f24891a190ebfc
In that cart inspect the total for Halo Wireless Headphones, then assert the total equals halo_price minus 20% of halo_price.
