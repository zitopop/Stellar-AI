# Stellar AI Developer Resources

Small, inspectable examples for FiveM and Roblox developers. These examples are intentionally server-authoritative and avoid trusting client-supplied item names, reward amounts, or currency values. The code in this folder is available under the [MIT License](./LICENSE), so developers can reuse and adapt it.

## FiveM

### Secure QBCore reward event
Path: [fivem/secure-qbcore-reward](./fivem/secure-qbcore-reward)

Shows a QBCore server event where the client sends only a reward ID. The server owns the reward catalog, amount, coordinates, distance limit and cooldown.

## Roblox

### Secure RemoteEvent reward handler
Path: [roblox/secure-remoteevent-handler](./roblox/secure-remoteevent-handler)

Shows a Luau RemoteEvent pattern with server-owned reward configuration, type checks, distance validation and rate limiting.

## Try the developer workspace

Use Stellar AI for QBCore, ESX, ox_lib and Roblox Luau generation/debugging:

https://trystellarai.com/?utm_source=github&utm_medium=organic&utm_campaign=developer_resources

Generated code should still be reviewed and tested in a development environment before production use.
