# Stellar Drive — Roblox real-world town driving game (prototype)

**Game title:** Stellar Drive  
**Platform:** Roblox Studio / Roblox experiences  
**First playable location:** York, England  
**Map source:** OpenStreetMap (OSM); **not a fictional generated road layout**.

This project is separate from the Stellar AI website. Nothing in this folder publishes a Roblox experience automatically.

## What has been implemented

- An editor importer that fetches actual OSM highway geometry and approximate building footprints for a small area of central York, then saves Roblox Parts under `Workspace > StellarDriveWorld`. Roads follow real geographic nodes instead of invented code layouts.
- A server-controlled arcade vehicle model with Roblox `VehicleSeat`, an E-to-enter prompt, steering, acceleration, reverse/braking and multiple player cars.
- A speedometer and map-source attribution on screen.
- Works as a **first driving prototype**. **Not** satellite photogrammetry, elevation-accurate roads, photorealistic buildings, full wheel/constraint physics, collisions, NPC traffic or a published Roblox game.

## Install in Roblox Studio (edit mode)

1. Open a new, blank **Baseplate** experience. Save a local copy.
2. Enable **Game Settings → Security → Allow HTTP Requests** so Studio may request OSM data through Overpass. Use **View → Command Bar**.
3. Open [StudioImport.commandbar.lua](./StudioImport.commandbar.lua), copy its contents into the **Studio Command Bar** while *not playing* and run it once. It uses public OSM data; no token or key.
4. Wait until the Output panel confirms the count of imported roads/buildings. If network requests fail, do **not** use fake fallback maps; verify HTTP/network and retry. Save the place now.
5. In `ServerScriptService`, insert a **Script** named `StellarDrive` and paste [StellarDrive.server.lua](./StellarDrive.server.lua).
6. In `StarterPlayer > StarterPlayerScripts`, insert a **LocalScript** named `StellarDriveHUD` and paste [StellarDriveHUD.client.lua](./StellarDriveHUD.client.lua).
7. Press **Play**. Walk to the purple starter car, press **E** to enter and use **WASD** or the default Roblox vehicle controls.
8. In Roblox Studio's **File → Publish to Roblox**, name the experience **Stellar Drive** after testing. Choose the audience/privacy settings deliberately; keep it private until you've tested on phone and PC.

The town is imported into the place as saved geometry. Studio does not have to download OSM data each time a player joins. Only the editor import requires access to Overpass.

## Changing the actual town

Edit only the importer SETTINGS: `place`, `latitude`, `longitude`, `halfHeight` and `halfWidth`. The importer always retrieves the real OSM roads near those coordinates, not a computer-invented city.

The default import covers **a small part of York centre**, not all of York or the entire planet. Stay under roughly 3,200 road segments and 850 blocks for this initial prototype; increase scope only after profiling on an actual phone.

## Engineering limits to address before public launch

- The starter car is an anchored, server-moved prototype, **not** a production physical chassis. It does not collide with map geometry or reliably match road lanes.
- OSM-derived building footprints are simplified into bounding-box blocks; they are *not* photorealistic, accurate facades or exact polygons. Roads reflect real-world OSM coordinates but can include intersections and overlaps.
- Driver control uses Roblox `VehicleSeat.ThrottleFloat` and `SteerFloat`; test replication and mobile controls in Studio with at least two clients and real devices before declaring it playable.
- No traffic, road navigation/lanekeeping, progression, sound, anti-cheat hardening, car shop, monetization or data saves yet.
- Public OSM/Overpass services have usage policies and may not be reliable or fast. The importer is an edit-time tool and makes limited requests. Do not run it per player.
- HTTP must be allowed for the import and a connection to a working Overpass mirror must be available. If Roblox Studio cannot access these endpoints, provide an offline OSM extract instead; do not bypass access restrictions.
- Never use Google Maps/Google Earth imagery as Roblox map textures without appropriate authorization. Do not present these approximate buildings as literal scans of York.

## Attribution and licensing

**© OpenStreetMap contributors — Open Database License (ODbL)**.

Keep the in-game credit from the HUD; also add the following to the Roblox game description:

`Contains information from OpenStreetMap, © OpenStreetMap contributors, available under the Open Database License (ODbL): https://www.openstreetmap.org/copyright`

Check ODbL obligations for derivative databases when distributing modified map data. Source: https://www.openstreetmap.org/copyright

Roblox documentation for seats and steering: https://create.roblox.com/docs/reference/engine/classes/VehicleSeat
