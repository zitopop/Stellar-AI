-- Stellar AI secure QBCore example
-- https://trystellarai.com/?utm_source=github&utm_medium=organic&utm_campaign=secure_qbcore_reward
--
-- Security principle: the client chooses a reward ID, never the item or amount.

local QBCore = exports['qb-core']:GetCoreObject()
local cooldowns = {}

local function validRewardId(value)
    return type(value) == 'string' and #value >= 1 and #value <= 64
end

local function onCooldown(src, rewardId, seconds)
    cooldowns[src] = cooldowns[src] or {}
    local now = os.time()
    local last = cooldowns[src][rewardId] or 0

    if now - last < seconds then
        return true
    end

    cooldowns[src][rewardId] = now
    return false
end

RegisterNetEvent('stellar_secure_reward:server:claim', function(rewardId)
    local src = source
    if not validRewardId(rewardId) then return end

    local reward = Config.Rewards[rewardId]
    if not reward then return end

    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local ped = GetPlayerPed(src)
    if ped <= 0 then return end

    local coords = GetEntityCoords(ped)
    if #(coords - reward.coords) > reward.maxDistance then
        return
    end

    if onCooldown(src, rewardId, reward.cooldownSeconds) then
        return
    end

    local amount = tonumber(reward.amount)
    if not amount or amount < 1 or amount > 10 then return end

    local added = Player.Functions.AddItem(reward.item, amount)
    if not added then return end

    TriggerClientEvent('inventory:client:ItemBox', src, QBCore.Shared.Items[reward.item], 'add', amount)
end)

AddEventHandler('playerDropped', function()
    cooldowns[source] = nil
end)
