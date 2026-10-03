-- Stellar Secure Webhook Logger
-- Generated as an inspectable reference utility for https://trystellarai.com
-- Server-only export: no client NetEvent is registered by this resource.

local QBCore = exports['qb-core']:GetCoreObject()
local cooldowns = {}

local function cleanText(value, maxLength)
  local text = tostring(value or '')
    :gsub('[%z\1-\8\11\12\14-\31]', '')
    :gsub('@everyone', '@ everyone')
    :gsub('@here', '@ here')
  if #text > maxLength then
    text = text:sub(1, maxLength - 1) .. '…'
  end
  return text
end

local function validWebhook(url)
  return type(url) == 'string'
    and (url:match('^https://discord%.com/api/webhooks/') or url:match('^https://discordapp%.com/api/webhooks/'))
end

local function normaliseColor(value)
  local number = tonumber(value)
  if not number then return Config.DefaultColor end
  number = math.floor(number)
  if number < 0 or number > 16777215 then return Config.DefaultColor end
  return number
end

local function playerAvailable(src)
  if src == 0 then return true end
  return QBCore.Functions.GetPlayer(src) ~= nil and GetPlayerName(src) ~= nil
end

local function rateLimited(src)
  if src == 0 then return false end
  local now = os.time()
  local previous = cooldowns[src] or 0
  if now - previous < Config.CooldownSeconds then return true end
  cooldowns[src] = now
  return false
end

local function SendStellarWebhook(source, title, message, color)
  local src = tonumber(source) or 0
  if src < 0 or not playerAvailable(src) then return false, 'invalid_source' end
  if rateLimited(src) then return false, 'rate_limited' end
  if not validWebhook(Config.WebhookUrl) then
    print('^1[Stellar Logger] Missing or invalid stellar_webhook_url convar.^7')
    return false, 'webhook_not_configured'
  end

  local safeTitle = cleanText(title, Config.MaxTitleLength)
  local safeMessage = cleanText(message, Config.MaxMessageLength)
  if safeTitle == '' or safeMessage == '' then return false, 'empty_payload' end

  local payload = {
    username = Config.Username,
    allowed_mentions = { parse = {} },
    embeds = {{
      title = safeTitle,
      description = safeMessage,
      color = normaliseColor(color),
      footer = { text = 'Stellar Secure Logger · trystellarai.com' },
      timestamp = os.date('!%Y-%m-%dT%H:%M:%SZ')
    }}
  }

  PerformHttpRequest(Config.WebhookUrl, function(statusCode)
    if statusCode < 200 or statusCode >= 300 then
      print(('[Stellar Logger] Discord returned HTTP %s.'):format(statusCode))
    end
  end, 'POST', json.encode(payload), { ['Content-Type'] = 'application/json' })

  return true
end

exports('SendStellarWebhook', SendStellarWebhook)

AddEventHandler('playerDropped', function()
  cooldowns[source] = nil
end)
