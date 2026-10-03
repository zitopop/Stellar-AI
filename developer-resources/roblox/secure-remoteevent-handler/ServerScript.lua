-- Stellar AI secure Roblox Luau example
-- https://trystellarai.com/?utm_source=github&utm_medium=organic&utm_campaign=secure_roblox_remote
--
-- Place this Script in ServerScriptService.
-- Create ReplicatedStorage/Remotes/ClaimReward as a RemoteEvent.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local claimReward = ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("ClaimReward")

type RewardDefinition = {
    coins: number,
    partName: string,
    maxDistance: number,
    cooldownSeconds: number,
}

local REWARDS: { [string]: RewardDefinition } = {
    DailyPad = {
        coins = 25,
        partName = "DailyRewardPad",
        maxDistance = 12,
        cooldownSeconds = 10,
    },
}

local lastClaim: { [Player]: { [string]: number } } = {}

local function getRoot(player: Player): BasePart?
    local character = player.Character
    if not character then return nil end
    return character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

local function isNearReward(player: Player, reward: RewardDefinition): boolean
    local root = getRoot(player)
    local part = workspace:FindFirstChild(reward.partName)
    if not root or not part or not part:IsA("BasePart") then
        return false
    end
    return (root.Position - part.Position).Magnitude <= reward.maxDistance
end

local function isRateLimited(player: Player, rewardId: string, seconds: number): boolean
    local now = os.clock()
    lastClaim[player] = lastClaim[player] or {}
    local previous = lastClaim[player][rewardId] or 0

    if now - previous < seconds then
        return true
    end

    lastClaim[player][rewardId] = now
    return false
end

claimReward.OnServerEvent:Connect(function(player: Player, rewardId: unknown)
    if typeof(rewardId) ~= "string" or #rewardId < 1 or #rewardId > 64 then
        return
    end

    local reward = REWARDS[rewardId]
    if not reward then return end
    if not isNearReward(player, reward) then return end
    if isRateLimited(player, rewardId, reward.cooldownSeconds) then return end

    local leaderstats = player:FindFirstChild("leaderstats")
    local coins = leaderstats and leaderstats:FindFirstChild("Coins")
    if not coins or not coins:IsA("IntValue") then return end

    coins.Value += reward.coins
end)

Players.PlayerRemoving:Connect(function(player: Player)
    lastClaim[player] = nil
end)
