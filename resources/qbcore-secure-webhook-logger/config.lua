-- Stellar Secure Webhook Logger
-- Free utility for FiveM/QBCore developers: https://trystellarai.com
-- Keep the webhook server-side. Use "set stellar_webhook_url ..." rather than setr.

Config = {}
Config.WebhookUrl = GetConvar('stellar_webhook_url', '')
Config.Username = 'Stellar Logger'
Config.CooldownSeconds = 5
Config.MaxTitleLength = 120
Config.MaxMessageLength = 1800
Config.DefaultColor = 5793266
