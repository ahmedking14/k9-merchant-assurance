---
test: ../challenger-cart-exposes-missing-first-order-discount-2_test.md
status: passed
started: 2026-10-25T00:00:51.263Z
duration_s: 104
session_id: a3e9ee88-623a-4bd9-a21f-77a4f9827218
---

# Challenger cart exposes missing first-order discount — Result

## Step 1 ✓ passed (23.3s)
md5: 16002ed9ca648d70d77264fce24313a8
At http://localhost:4173/store.html?variant=B, open the challenger storefront as a shopper before any demo order and view its campaign offer, then assert the 20%-off-first-order offer is shown.

## Step 2 ✓ passed (28.3s)
md5: 3b778df72cba3b91901ab6e840d388a5
On that challenger storefront, locate Halo Wireless Headphones and store its displayed price as halo_price.

## Step 3 ✓ passed (41.7s)
md5: 5449b60ab5d01f13517941dfebffa07f
Add Halo Wireless Headphones to the eligible first-order cart; while the cart remains open and before placing any demo order, store the displayed discount-line amount as cart_discount and the displayed cart total as cart_total, then assert cart_discount equals 20% of halo_price and cart_total equals halo_price minus 20% of halo_price.
