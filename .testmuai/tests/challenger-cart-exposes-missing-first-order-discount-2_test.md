---
assurance:
  id: t-4
  base: sha256:1637e74c3e0a8e7309be9d73e7bca715ff50cb10c1997f72370b168ceb08fa8a
---
# Challenger cart exposes missing first-order discount

> An eligible first-order shopper sees the campaign and checks that the challenger cart honors the advertised 20% discount and correct Halo Wireless Headphones total, exposing its current defect.

## Step 1 @verifies ac-3

At http://localhost:4173/store.html?variant=B, open the challenger storefront as a shopper before any demo order and view its campaign offer, then assert the 20%-off-first-order offer is shown.

## Step 2

On that challenger storefront, locate Halo Wireless Headphones and store its displayed price as halo_price.

## Step 3 @verifies ac-1, ac-2

Add Halo Wireless Headphones to the eligible first-order cart; while the cart remains open and before placing any demo order, store the displayed discount-line amount as cart_discount and the displayed cart total as cart_total, then assert cart_discount equals 20% of halo_price and cart_total equals halo_price minus 20% of halo_price.
