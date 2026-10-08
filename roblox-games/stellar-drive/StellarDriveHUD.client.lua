-- STELLAR DRIVE | StarterPlayer > StarterPlayerScripts > StellarDriveHUD.client.lua
-- Visible OSM attribution is mandatory: https://www.openstreetmap.org/copyright

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local player = Players.LocalPlayer

local gui = Instance.new("ScreenGui")
gui.Name = "StellarDriveHUD"
gui.IgnoreGuiInset = true
gui.ResetOnSpawn = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = player:WaitForChild("PlayerGui")

local function label(parent, name, text, size, position, colour, fontSize, align)
    local el = Instance.new("TextLabel")
    el.Name = name
    el.Text = text
    el.Size = size
    el.Position = position
    el.BackgroundTransparency = 1
    el.TextColor3 = colour
    el.TextSize = fontSize
    el.TextXAlignment = align or Enum.TextXAlignment.Left
    el.TextYAlignment = Enum.TextYAlignment.Center
    el.Font = Enum.Font.GothamMedium
    el.Parent = parent
    return el
end

local speedPanel = Instance.new("Frame")
speedPanel.Name = "SpeedPanel"
speedPanel.AnchorPoint = Vector2.new(0, 1)
speedPanel.Size = UDim2.fromOffset(195, 110)
speedPanel.Position = UDim2.new(0, 18, 1, -42)
speedPanel.BackgroundColor3 = Color3.fromRGB(14, 18, 28)
speedPanel.BackgroundTransparency = 0.12
speedPanel.BorderSizePixel = 0
speedPanel.Parent = gui

local round = Instance.new("UICorner")
round.CornerRadius = UDim.new(0, 16)
round.Parent = speedPanel
local stroke = Instance.new("UIStroke")
stroke.Thickness = 1
stroke.Color = Color3.fromRGB(105, 91, 155)
stroke.Transparency = 0.27
stroke.Parent = speedPanel

label(speedPanel, "Header", "✦  STELLAR DRIVE", UDim2.fromOffset(180, 22),
    UDim2.fromOffset(12, 7), Color3.fromRGB(188, 173, 255), 12)
local speed = label(speedPanel, "Speed", "0", UDim2.fromOffset(122, 64),
    UDim2.fromOffset(12, 31), Color3.new(1, 1, 1), 48)
speed.Font = Enum.Font.GothamBold
label(speedPanel, "Unit", "KM/H", UDim2.fromOffset(50, 35),
    UDim2.fromOffset(130, 58), Color3.fromRGB(203, 203, 212), 12)

local credit = label(gui, "OSMCredit",
    "Real road data: © OpenStreetMap contributors  •  ODbL  •  openstreetmap.org/copyright",
    UDim2.new(1, -28, 0, 22), UDim2.new(0, 14, 1, -24),
    Color3.fromRGB(247, 247, 247), 10)
credit.TextStrokeTransparency = 0.3

local help = label(gui, "DrivingHelp",
    "Find your purple car • Press E to drive • WASD or Roblox mobile vehicle controls",
    UDim2.new(1, -30, 0, 30), UDim2.fromOffset(15, 40),
    Color3.fromRGB(243, 241, 255), 14)
help.TextStrokeTransparency = 0.25
help.TextWrapped = true

local updateEvery = 0
RunService.RenderStepped:Connect(function(dt)
    updateEvery += dt
    if updateEvery < 0.1 then return end
    updateEvery = 0
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    local seat = humanoid and humanoid.SeatPart
    local model = seat and seat:FindFirstAncestorOfClass("Model")
    local driving = seat and seat:IsA("VehicleSeat") and model
        and model:GetAttribute("OwnerUserId") == player.UserId
    if driving then
        speed.Text = tostring(model:GetAttribute("SpeedKmh") or 0)
        help.Text = "W / ↑ Accelerate    •    S / ↓ Brake    •    A / D Steer"
    else
        speed.Text = "0"
        help.Text = "Find your purple car • Press E to drive • WASD or mobile controls"
    end
end)
