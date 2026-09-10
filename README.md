# Moe's English Practice — Step 3C Inventory v1

This build is based on the known-working Step 3B VRM loader.

New in Step 3C:
- Inventory button and modal
- Five equipment slots: Top, Bottom, Shoes, Accessory, Background
- Buy in Shop, then Equip/Unequip in Inventory
- Purchased items and equipped choices persist with localStorage
- Step 3B progress is migrated automatically when possible
- Background equipment changes the 3D viewer immediately

Important: clothing/accessory equipment is still logical only. It does not change the VRM mesh yet.

Upload these three files directly to your GitHub Pages repository root:
- index.html
- script.js
- moe-beginner.vrm
