fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'Stellar AI'
description 'Server-only Discord webhook logger with validation and per-player rate limiting'
version '1.0.0'

server_scripts {
  'config.lua',
  'server.lua'
}

dependency 'qb-core'
