# Moe Wearable Lab — Step 4B V1

This is a safe test project for real separate 3D wearables.

## Files
- `index.html`
- `script.js`
- `moe-beginner.vrm`
- `wearables/` (put future `.glb` wearables here)

## What works now
- The same known-working VRM loader
- Front / Back / Left / Right camera views
- Load a separate `.glb` wearable from your computer
- Attach it to Chest / Upper Chest / Hips / Head
- Equip / Unequip
- Adjust scale, position, and Y rotation

## Important
There is intentionally **no fake hoodie mesh** bundled in this V1. A real hoodie that bends with Moe's body must be a compatible skinned/rigged 3D asset. When we obtain/create `english-hoodie.glb`, put it in `wearables/` and the site will try to load it automatically.

This repo is for proving wearable compatibility before bringing the method back into `avatar-development`.
