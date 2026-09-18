---
status: accepted
---

# BR-004: Plate count does not imply weight

For a plate-count machine, Crowbar stores only the number of plates and does not infer an equivalent kilogram or pound value. For example, `6 plates` remains `6 plates`; converting it to an estimated weight requires an explicit, product-supported machine calibration.
