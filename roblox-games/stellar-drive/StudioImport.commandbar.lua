-- STELLAR DRIVE | ROBLOX STUDIO EDITOR IMPORTER
-- Run once in the Roblox Studio Command Bar in EDIT MODE, not while playing.
-- Imports actual road/building coordinates from OpenStreetMap via Overpass.
-- The resulting Roblox Parts are saved with the place; roads are NOT fictional or procedural.
-- OSM contributors: https://www.openstreetmap.org/copyright (ODbL).
-- No Google Maps imagery, scraping, or paid map API is used.

local HttpService = game:GetService("HttpService")
local Workspace = game:GetService("Workspace")

local SETTINGS = {
    place = "York, England",
    latitude = 53.9590,
    longitude = -1.0873,
    halfHeight = 0.0030, -- degrees: intentionally small for Roblox performance
    halfWidth = 0.0045,
    studsPerMetre = 2.5,
    maxRoadSegments = 3200,
    maxBuildings = 850,
}

local bb = string.format("%.6f,%.6f,%.6f,%.6f",
    SETTINGS.latitude - SETTINGS.halfHeight,
    SETTINGS.longitude - SETTINGS.halfWidth,
    SETTINGS.latitude + SETTINGS.halfHeight,
    SETTINGS.longitude + SETTINGS.halfWidth
)
local query = "[out:json][timeout:45];(" ..
    'way["highway"~"^(primary|secondary|tertiary|residential|service|living_street|unclassified)$"](' .. bb .. ");" ..
    'way["building"](' .. bb .. ");" ..
    ");out geom;"

print("Stellar Drive: downloading real road data for " .. SETTINGS.place .. "…")
local endpoints = {
    "https://overpass.kumi.systems/api/interpreter?data=",
    "https://overpass-api.de/api/interpreter?data=",
}
local payload
local requestError = "unknown"
for _, endpoint in ipairs(endpoints) do
    local ok, result = pcall(function()
        return HttpService:GetAsync(endpoint .. HttpService:UrlEncode(query), false)
    end)
    if ok then
        local decodedOk, decoded = pcall(function() return HttpService:JSONDecode(result) end)
        if decodedOk and type(decoded) == "table" and type(decoded.elements) == "table" then
            payload = decoded
            break
        else
            requestError = "response did not contain usable map features"
        end
    else
        requestError = tostring(result)
    end
end

if not payload then
    error("Real map not downloaded. Enable 'Allow HTTP Requests' in Game Settings > Security, " ..
        "check your network, and rerun the importer. Details: " .. requestError)
end

-- Only replace our own generated folder after a successful download.
local previous = Workspace:FindFirstChild("StellarDriveWorld")
if previous then previous:Destroy() end
local world = Instance.new("Folder")
world.Name = "StellarDriveWorld"
world:SetAttribute("Place", SETTINGS.place)
world:SetAttribute("Source", "OpenStreetMap")
world:SetAttribute("Licence", "ODbL")
world:SetAttribute("Attribution", "© OpenStreetMap contributors | openstreetmap.org/copyright")
world:SetAttribute("Latitude", SETTINGS.latitude)
world:SetAttribute("Longitude", SETTINGS.longitude)
world.Parent = Workspace

local roads = Instance.new("Folder")
roads.Name = "ImportedRealRoads"
roads.Parent = world
local buildings = Instance.new("Folder")
buildings.Name = "ImportedRealBuildings"
buildings.Parent = world

local COS = math.cos(math.rad(SETTINGS.latitude))
local SCALE = SETTINGS.studsPerMetre
local function toStuds(lat, lon)
    return Vector3.new(
        (lon - SETTINGS.longitude) * 111320 * COS * SCALE,
        0,
        -(lat - SETTINGS.latitude) * 111320 * SCALE
    )
end
local ground = Instance.new("Part")
ground.Name = "BaseTerrain"
ground.Anchored = true
ground.Material = Enum.Material.Grass
ground.Color = Color3.fromRGB(85, 115, 85)
ground.Size = Vector3.new(SETTINGS.halfWidth * 2 * 111320 * COS * SCALE + 140,
    2, SETTINGS.halfHeight * 2 * 111320 * SCALE + 140)
ground.Position = Vector3.new(0, -1.4, 0)
ground.Parent = world

local widths = {
    primary = 13, secondary = 11, tertiary = 9, residential = 7,
    unclassified = 7, service = 4.5, living_street = 5,
}
local roadSegments = 0
local buildingCount = 0
local startPosition, startHeading
local closestDistance = math.huge

local function makePart(name, parent, size, frame, material, colour)
    local part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.CFrame = frame
    part.Material = material
    part.Color = colour
    part.Anchored = true
    part.CanCollide = true
    part.CastShadow = false
    part.TopSurface = Enum.SurfaceType.Smooth
    part.BottomSurface = Enum.SurfaceType.Smooth
    part.Parent = parent
    return part
end

local function importRoad(way)
    local highway = way.tags and way.tags.highway
    local width = widths[highway]
    if not width or type(way.geometry) ~= "table" then return end
    local roadWidth = width * SCALE
    for index = 2, #way.geometry do
        if roadSegments >= SETTINGS.maxRoadSegments then return end
        local first, second = way.geometry[index - 1], way.geometry[index]
        if first and second and first.lat and first.lon and second.lat and second.lon then
            local a = toStuds(first.lat, first.lon)
            local b = toStuds(second.lat, second.lon)
            local segment = b - a
            local length = segment.Magnitude
            if length > 0.15 and length < 1300 then
                local midpoint = (a + b) / 2 + Vector3.new(0, 0.07, 0)
                local road = makePart("OSM_" .. tostring(way.id) .. "_" .. index,
                    roads, Vector3.new(roadWidth, 0.28, length + 0.8),
                    CFrame.lookAt(midpoint, midpoint + segment.Unit),
                    Enum.Material.Asphalt, Color3.fromRGB(56, 59, 63))
                road:SetAttribute("OSMWayId", tostring(way.id))
                road:SetAttribute("RoadType", highway)
                road:SetAttribute("OSMName", tostring(way.tags.name or "Unnamed road"))
                roadSegments += 1

                -- Spawn beside the map centre, facing along a genuine drivable road.
                local planarDistance = midpoint.Magnitude
                if highway ~= "service" and planarDistance < closestDistance then
                    closestDistance = planarDistance
                    startPosition = midpoint
                    startHeading = math.atan2(-segment.X, -segment.Z)
                end
            end
        end
    end
end

local function importBuilding(way)
    if buildingCount >= SETTINGS.maxBuildings or type(way.geometry) ~= "table" then return end
    local lowX, lowZ, highX, highZ = math.huge, math.huge, -math.huge, -math.huge
    for _, point in ipairs(way.geometry) do
        if point.lat and point.lon then
            local loc = toStuds(point.lat, point.lon)
            lowX = math.min(lowX, loc.X)
            highX = math.max(highX, loc.X)
            lowZ = math.min(lowZ, loc.Z)
            highZ = math.max(highZ, loc.Z)
        end
    end
    local sizeX, sizeZ = highX - lowX, highZ - lowZ
    if sizeX <= 2 or sizeZ <= 2 or sizeX > 250 or sizeZ > 250 then return end
    local levels = tonumber(way.tags and way.tags["building:levels"])
    local height = math.clamp((levels or 3) * 3.1 * SCALE, 12, 110)
    local building = makePart("OSMBuilding_" .. tostring(way.id), buildings,
        Vector3.new(sizeX, height, sizeZ),
        CFrame.new((lowX + highX) / 2, height / 2, (lowZ + highZ) / 2),
        Enum.Material.Concrete, Color3.fromRGB(173, 164, 153))
    building:SetAttribute("OSMWayId", tostring(way.id))
    building:SetAttribute("ApproximateBlock", true)
    buildingCount += 1
end

for _, element in ipairs(payload.elements) do
    if element.type == "way" and element.tags then
        if element.tags.highway then importRoad(element)
        elseif element.tags.building then importBuilding(element)
        end
    end
end

if not startPosition then
    world:Destroy()
    error("No vehicle-accessible roads found in returned OSM data. Original game was not changed.")
end

local spawns = Instance.new("Folder")
spawns.Name = "SpawnMarkers"
spawns.Parent = world
local marker = makePart("CarStart", spawns, Vector3.new(5, 0.2, 5),
    CFrame.new(startPosition + Vector3.new(0, 0.8, 0)) * CFrame.Angles(0, startHeading, 0),
    Enum.Material.Neon, Color3.fromRGB(126, 94, 226))
marker.Transparency = 0.6
marker.CanCollide = false

local playerSpawn = Instance.new("SpawnLocation")
playerSpawn.Name = "StellarDrivePlayerSpawn"
playerSpawn.Anchored = true
playerSpawn.Neutral = true
playerSpawn.Size = Vector3.new(8, 1, 8)
playerSpawn.CFrame = CFrame.new(startPosition + Vector3.new(14, 2.5, 0))
playerSpawn.Material = Enum.Material.Neon
playerSpawn.Color = Color3.fromRGB(173, 144, 255)
playerSpawn.Parent = world

print(string.format("Stellar Drive: imported %d real road segments and %d approximate building blocks from OSM near %s.",
    roadSegments, buildingCount, SETTINGS.place))
print("SAVE the Roblox Studio place now. Data source: © OpenStreetMap contributors (ODbL).")
