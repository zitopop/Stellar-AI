Config = {}

-- The client should send only the reward ID.
-- Item, amount, location and cooldown remain server-owned.
Config.Rewards = {
    repair_bench = {
        item = 'repairkit',
        amount = 1,
        coords = vector3(731.24, -1088.82, 22.17),
        maxDistance = 3.0,
        cooldownSeconds = 10,
    },
}
