---
assurance:
  id: t-3
  base: sha256:118c992e41d1b1597fa36ee94e46fadf06778ed1a1dfe14543095e6a6bd4c8d6
---
# Returning shopper receives no first-order discount in either variant

> A shopper with an earlier demo order inspects a Halo Wireless Headphones cart and does not receive the first-order discount, regardless of storefront variant.

## Step 1 @verifies ac-3

At http://localhost:4173/store.html?variant=A, open the control storefront and view the campaign offer, then assert the 20%-off-first-order offer is shown.

## Step 2

In the local demo electronics store, complete a demo order for this shopper so the next cart is not their first order.

## Step 3 @verifies ac-4

Return to the control storefront, add Halo Wireless Headphones to this returning shopper's cart and inspect it before another demo order, then assert no 20% first-order discount is applied.

## Step 4 @verifies ac-3

At http://localhost:4173/store.html?variant=B, open the challenger storefront in the same shopper context and view the campaign offer, then assert the 20%-off-first-order offer is shown.

## Step 5 @verifies ac-4

In the challenger storefront add Halo Wireless Headphones to the returning shopper's cart and inspect it, then assert no 20% first-order discount is applied.
