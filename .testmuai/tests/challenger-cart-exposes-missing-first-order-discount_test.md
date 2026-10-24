---
assurance:
  id: t-1
  base: sha256:6e895c1330737cd0728e502d949cc0b81f550645edd8721280675ecbd838d777
---
# Challenger cart exposes missing first-order discount

> An eligible first-order shopper sees the campaign and checks that the challenger cart honors the advertised 20% discount and correct Halo Wireless Headphones total, exposing its current defect.

## Step 1 @verifies ac-3

At http://localhost:4173/store.html?variant=B, open the challenger storefront as a shopper before any demo order and view its campaign offer, then assert the 20%-off-first-order offer is shown.

## Step 2

On that challenger storefront, locate Halo Wireless Headphones and store its displayed price as halo_price.

## Step 3 @verifies ac-1

Add Halo Wireless Headphones to the eligible first-order cart and inspect the cart before placing a demo order, then assert its displayed discount equals 20% of halo_price.

## Step 4 @verifies ac-2

In that cart inspect the total for Halo Wireless Headphones, then assert the total equals halo_price minus 20% of halo_price.
