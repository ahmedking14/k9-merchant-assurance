---
assurance:
  id: t-2
  base: sha256:0622f8c989765a4d8721fdffa7995c48b0b6dcedbbaeee671ab20b8c93af4209
---
# Control cart honors first-order discount

> An eligible first-order shopper sees the campaign and finds the advertised 20% reduction reflected in the control cart total.

## Step 1 @verifies ac-3

At http://localhost:4173/store.html?variant=A, open the control storefront as a shopper before any demo order and view its campaign offer, then assert the 20%-off-first-order offer is shown.

## Step 2

On that control storefront, locate Halo Wireless Headphones and store its displayed price as halo_price.

## Step 3 @verifies ac-1

Add Halo Wireless Headphones to the eligible first-order cart and inspect the cart before placing a demo order, then assert its displayed discount equals 20% of halo_price.

## Step 4 @verifies ac-2

In that cart inspect the total for Halo Wireless Headphones, then assert the total equals halo_price minus 20% of halo_price.
