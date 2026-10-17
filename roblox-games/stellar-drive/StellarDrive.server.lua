-- STELLAR DRIVE | ServerScriptService > StellarDrive.server.lua
-- Arcade driving MVP on streets imported from *real* OpenStreetMap data.
-- Not a fully simulated car chassis: the vehicle uses an anchored Model pivot.
-- Collision, traffic, terrain elevations and multiplayer vehicle ownership are future work.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local world = Workspace:WaitForChild("StellarDriveWorld", 15)
assert(world, "Run StudioImport.commandbar.lua and save the OSM map first.")
local marker = world:WaitForChild("SpawnMarkers", 10):WaitForChild("CarStart", 10)

local prior = Workspace:FindFirstChild("StellarDriveVehicles")
if prior then prior:Destroy() end
local vehicles = Instance.new("Folder")
vehicles.Name = "StellarDriveVehicles"
vehicles.Parent = Workspace

local function fixedPart(parent, name, size, color, relative, material)
    local part = Instance.new("Part")
    part.Name = name
    part.Size = size
    part.Color = color
    part.Material = material or Enum.Material.SmoothPlastic
    part.CFrame = relative
    part.Anchored = true
    part.CanCollide = false
    part.TopSurface = Enum.SurfaceType.Smooth
    part.BottomSurface = Enum.SurfaceType.Smooth
    part.Parent = parent
    return part
end

local function spawnCar(player, offset)
    local model = Instance.new("Model")
    model.Name = "StellarDriveCar_" .. player.UserId
    model:SetAttribute("OwnerUserId", player.UserId)
    model:SetAttribute("SpeedKmh", 0)
    model.Parent = vehicles
    local body = fixedPart(model, "Chassis", Vector3.new(6.5, 1.45, 12),
        Color3.fromRGB(93, 66, 205), CFrame.new(0, 2.2, 0))
    body.CanCollide = false
    model.PrimaryPart = body

    fixedPart(model, "Roof", Vector3.new(5.1, 0.8, 5.6),
        Color3.fromRGB(35, 39, 71), CFrame.new(0, 3.12, 0.4))
    fixedPart(model, "Windscreen", Vector3.new(5.2, 0.2, 2.3),
        Color3.fromRGB(135, 190, 213), CFrame.new(0, 3.55, -1.3), Enum.Material.Glass)
    for _, x in ipairs({-3.2, 3.2}) do
        for _, z in ipairs({-3.7, 3.7}) do
            local wheel = fixedPart(model, "Wheel", Vector3.new(1, 2.1, 2.1),
                Color3.fromRGB(24, 25, 29),
                CFrame.new(x, 1.1, z))
            wheel.Shape = Enum.PartType.Cylinder
        end
    end
    for _, x in ipairs({-2.15, 2.15}) do
        fixedPart(model, "Headlight", Vector3.new(1.2, 0.4, 0.2),
            Color3.fromRGB(236, 245, 255), CFrame.new(x, 2.35, -6.1), Enum.Material.Neon)
        fixedPart(model, "Taillight", Vector3.new(1.2, 0.4, 0.2),
            Color3.fromRGB(240, 42, 68), CFrame.new(x, 2.35, 6.1), Enum.Material.Neon)
    end

    local seat = Instance.new("VehicleSeat")
    seat.Name = "DriveSeat"
    seat.Size = Vector3.new(2.2, 0.65, 2.2)
    seat.CFrame = CFrame.new(0, 3.95, 0.6)
    seat.Anchored = true
    seat.CanCollide = true
    seat.Color = Color3.fromRGB(31, 29, 55)
    seat.MaxSpeed = 80
    seat.HeadsUpDisplay = false
    seat.Parent = model

    local prompt = Instance.new("ProximityPrompt")
    prompt.Name = "EnterCar"
    prompt.ActionText = "Drive"
    prompt.ObjectText = "Stellar Drive"
    prompt.HoldDuration = 0
    prompt.KeyboardKeyCode = Enum.KeyCode.E
    prompt.MaxActivationDistance = 15
    prompt.RequiresLineOfSight = false
    prompt.Parent = seat
    prompt.Triggered:Connect(function(otherPlayer)
        if otherPlayer ~= player or seat.Occupant then return end
        local character = otherPlayer.Character
        local humanoid = character and character:FindFirstChildOfClass("Humanoid")
        if humanoid then seat:Sit(humanoid) end
    end)

    local position = marker.CFrame * CFrame.new(offset, 1.3, 0)
    model:PivotTo(position)

    -- Prevent large dt spikes from teleporting the vehicle across entire streets.
    local speed = 0
    local heading = position
    local elapsed = 0
    local connection
    connection = RunService.Heartbeat:Connect(function(delta)
        if not model.Parent or player.Parent == nil then
            connection:Disconnect()
            if model.Parent then model:Destroy() end
            return
        end
        local dt = math.min(math.max(delta, 0), 0.05)
        local throttle = 0
        local steer = 0
        if seat.Occupant and Players:GetPlayerFromCharacter(seat.Occupant.Parent) == player then
            throttle = math.clamp(seat.ThrottleFloat, -1, 1)
            steer = math.clamp(seat.SteerFloat, -1, 1)
        end
        if throttle > 0 then
            speed = math.min(85, speed + throttle * 40 * dt)
        elseif throttle < 0 then
            speed = math.max(-20, speed + throttle * 68 * dt)
        else
            local drag = (8 + math.abs(speed) * 0.15) * dt
            if math.abs(speed) <= drag then
                speed = 0
            else
                speed -= math.sign(speed) * drag
            end
        end
        if seat.Occupant == nil and math.abs(speed) < 0.4 then speed = 0 end
        local angle = math.rad(-steer * 74 * dt * math.min(1, math.abs(speed) / 12))
        if speed < 0 then angle = -angle end
        heading = heading * CFrame.Angles(0, angle, 0) * CFrame.new(0, 0, -speed * dt)
        model:PivotTo(heading)
        elapsed += dt
        if elapsed >= 0.1 then
            elapsed = 0
            model:SetAttribute("SpeedKmh", math.floor(math.abs(speed) / 2.5 * 3.6 + 0.5))
        end
    end)

    return model
end

-- This starter spawns one car per player in the same road area.
-- A future version should distribute cars to mapped parking spots.
local currentCars = {}
local function preparePlayer(player)
    if currentCars[player] then return end
    local count = 0
    for _, _ in pairs(currentCars) do count += 1 end
    currentCars[player] = spawnCar(player, count * 15)
end
Players.PlayerAdded:Connect(preparePlayer)
Players.PlayerRemoving:Connect(function(player)
    local car = currentCars[player]
    currentCars[player] = nil
    if car then car:Destroy() end
end)
for _, player in ipairs(Players:GetPlayers()) do preparePlayer(player) end
print("Stellar Drive server ready. VehicleSeat supports keyboard and Roblox native touch driving controls.")
