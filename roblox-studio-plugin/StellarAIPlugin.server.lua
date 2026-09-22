-- Stellar AI Roblox Studio Bridge
-- Install as a local Studio plugin. Pair from https://trystellarai.com/roblox-studio
-- The bridge can inspect the open place and apply only explicitly approved Stellar tasks.

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

local API = "https://trystellarai.com/api/roblox-studio-agent"
local SETTING_ID = "StellarAIStudioDeviceId"
local SETTING_TOKEN = "StellarAIStudioDeviceToken"
local ALLOWED_ROOTS = {
	Workspace = true,
	ReplicatedStorage = true,
	ServerScriptService = true,
	ServerStorage = true,
	StarterGui = true,
	StarterPlayer = true,
	StarterPack = true,
	Lighting = true,
}

local toolbar = plugin:CreateToolbar("Stellar AI")
local openButton = toolbar:CreateButton("Stellar AI", "Connect this place to Stellar AI", "")
openButton.ClickableWhenViewportHidden = true

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	false,
	false,
	360,
	330,
	300,
	260
)
local widget = plugin:CreateDockWidgetPluginGui("StellarAIStudioBridge", widgetInfo)
widget.Title = "Stellar AI · Studio Bridge"

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(18, 19, 25)
root.BorderSizePixel = 0
root.Parent = widget

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 14)
padding.PaddingBottom = UDim.new(0, 14)
padding.PaddingLeft = UDim.new(0, 14)
padding.PaddingRight = UDim.new(0, 14)
padding.Parent = root

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 9)
layout.FillDirection = Enum.FillDirection.Vertical
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = root

local function label(text, size, bold)
	local item = Instance.new("TextLabel")
	item.Size = UDim2.new(1, 0, 0, size or 24)
	item.BackgroundTransparency = 1
	item.TextXAlignment = Enum.TextXAlignment.Left
	item.TextWrapped = true
	item.Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham
	item.TextSize = bold and 18 or 13
	item.TextColor3 = bold and Color3.fromRGB(247, 248, 251) or Color3.fromRGB(166, 173, 190)
	item.Text = text
	item.Parent = root
	return item
end

label("Stellar AI Studio Bridge", 28, true)
label("Pair this open Roblox place with your private Stellar workspace. Read-only inspection is automatic; place changes still require approval in Stellar.", 58, false)

local codeBox = Instance.new("TextBox")
codeBox.Size = UDim2.new(1, 0, 0, 40)
codeBox.BackgroundColor3 = Color3.fromRGB(10, 11, 15)
codeBox.TextColor3 = Color3.fromRGB(245, 245, 250)
codeBox.PlaceholderText = "Pairing code"
codeBox.PlaceholderColor3 = Color3.fromRGB(100, 105, 118)
codeBox.ClearTextOnFocus = false
codeBox.Font = Enum.Font.Code
codeBox.TextSize = 16
codeBox.Text = ""
codeBox.Parent = root

local connectButton = Instance.new("TextButton")
connectButton.Size = UDim2.new(1, 0, 0, 40)
connectButton.BackgroundColor3 = Color3.fromRGB(184, 167, 255)
connectButton.TextColor3 = Color3.fromRGB(15, 15, 20)
connectButton.Font = Enum.Font.GothamBold
connectButton.TextSize = 14
connectButton.Text = "Pair Studio"
connectButton.Parent = root

local statusLabel = label("Not paired.", 44, false)
local activityLabel = label("HTTP access must be enabled in Game Settings → Security.", 54, false)

local deviceId = plugin:GetSetting(SETTING_ID)
local deviceToken = plugin:GetSetting(SETTING_TOKEN)
local running = true
local busy = false

local function request(action, payload, useDevice)
	payload = payload or {}
	payload.action = action
	local headers = {["Content-Type"] = "application/json"}
	if useDevice then
		headers["X-Stellar-Studio-Id"] = tostring(deviceId or "")
		headers["X-Stellar-Studio-Token"] = tostring(deviceToken or "")
	end
	local response = HttpService:RequestAsync({
		Url = API,
		Method = "POST",
		Headers = headers,
		Body = HttpService:JSONEncode(payload),
	})
	local decoded = {}
	pcall(function()
		decoded = HttpService:JSONDecode(response.Body)
	end)
	if not response.Success then
		error(decoded.error or ("Stellar request failed (" .. tostring(response.StatusCode) .. ")"))
	end
	return decoded
end

local function splitPath(value)
	local parts = {}
	for part in string.gmatch(tostring(value or ""), "[^/]+") do
		table.insert(parts, part)
	end
	return parts
end

local function rootFor(name)
	if not ALLOWED_ROOTS[name] then
		error("Blocked Roblox service: " .. tostring(name))
	end
	return game:GetService(name)
end

local function resolve(pathValue, createFolders)
	if pathValue == "game" then
		return game
	end
	local parts = splitPath(pathValue)
	if #parts == 0 then
		error("Empty Roblox path.")
	end
	local current = rootFor(parts[1])
	for i = 2, #parts do
		local nextObject = current:FindFirstChild(parts[i])
		if not nextObject and createFolders then
			nextObject = Instance.new("Folder")
			nextObject.Name = parts[i]
			nextObject.Parent = current
		end
		if not nextObject then
			error("Path not found: " .. pathValue)
		end
		current = nextObject
	end
	return current
end

local function resolveParent(pathValue)
	local parts = splitPath(pathValue)
	if #parts < 2 then
		error("Target path must include an object name.")
	end
	local name = table.remove(parts)
	return resolve(table.concat(parts, "/"), true), name
end

local function inspectNode(instance, depth, currentDepth)
	local item = {
		name = instance.Name,
		className = instance.ClassName,
		children = {},
	}
	if currentDepth >= depth then
		return item
	end
	local children = instance:GetChildren()
	table.sort(children, function(a, b)
		return a.Name:lower() < b.Name:lower()
	end)
	for index, child in ipairs(children) do
		if index > 300 then
			table.insert(item.children, {name = "[truncated]", className = "Note", children = {}})
			break
		end
		table.insert(item.children, inspectNode(child, depth, currentDepth + 1))
	end
	return item
end

local function execute(task)
	local args = task.args or {}
	if task.type == "inspect_tree" then
		local target = resolve(args.path or "game", false)
		return HttpService:JSONEncode(inspectNode(target, tonumber(args.depth) or 3, 0))
	end
	if task.type == "read_script" then
		local target = resolve(args.path, false)
		if not target:IsA("LuaSourceContainer") then
			error("Target is not a Roblox script.")
		end
		return target.Source
	end

	ChangeHistoryService:SetWaypoint("Stellar AI · before " .. task.type)

	if task.type == "ensure_folder" then
		local parent, name = resolveParent(args.path)
		local existing = parent:FindFirstChild(name)
		if existing and not existing:IsA("Folder") then
			error("An object already exists at that path with class " .. existing.ClassName)
		end
		if not existing then
			existing = Instance.new("Folder")
			existing.Name = name
			existing.Parent = parent
		end
		ChangeHistoryService:SetWaypoint("Stellar AI · folder ready")
		return "Folder ready: " .. args.path
	end

	if task.type == "ensure_remote_event" or task.type == "ensure_remote_function" then
		local parent, name = resolveParent(args.path)
		local expected = task.type == "ensure_remote_event" and "RemoteEvent" or "RemoteFunction"
		local existing = parent:FindFirstChild(name)
		if existing and existing.ClassName ~= expected then
			error("An object already exists at that path with class " .. existing.ClassName)
		end
		if not existing then
			existing = Instance.new(expected)
			existing.Name = name
			existing.Parent = parent
		end
		ChangeHistoryService:SetWaypoint("Stellar AI · remote ready")
		return expected .. " ready: " .. args.path
	end

	if task.type == "upsert_script" then
		local parent, name = resolveParent(args.path)
		local className = tostring(args.className or "Script")
		if className ~= "Script" and className ~= "LocalScript" and className ~= "ModuleScript" then
			error("Unsupported script class.")
		end
		local existing = parent:FindFirstChild(name)
		if existing and existing.ClassName ~= className then
			error("An object already exists at that path with class " .. existing.ClassName)
		end
		if not existing then
			existing = Instance.new(className)
			existing.Name = name
			existing.Parent = parent
		end
		existing.Source = tostring(args.source or "")
		ChangeHistoryService:SetWaypoint("Stellar AI · script updated")
		return className .. " updated: " .. args.path
	end

	error("Unsupported Studio action.")
end

local function report(taskId, ok, output, err)
	local payload = {
		taskId = taskId,
		ok = ok,
		output = string.sub(tostring(output or ""), 1, 180000),
		error = string.sub(tostring(err or ""), 1, 4000),
	}
	request("report", payload, true)
end

local function pair()
	local code = string.upper(string.gsub(codeBox.Text or "", "[^A-Za-z0-9]", ""))
	if #code < 8 then
		statusLabel.Text = "Enter the full pairing code."
		return
	end
	connectButton.Active = false
	statusLabel.Text = "Pairing…"
	local ok, result = pcall(function()
		return request("claimPair", {
			code = code,
			placeId = tostring(game.PlaceId),
			placeName = game.Name,
		}, false)
	end)
	connectButton.Active = true
	if not ok then
		statusLabel.Text = tostring(result)
		return
	end
	deviceId = result.deviceId
	deviceToken = result.deviceToken
	plugin:SetSetting(SETTING_ID, deviceId)
	plugin:SetSetting(SETTING_TOKEN, deviceToken)
	codeBox.Text = ""
	statusLabel.Text = "Paired · " .. game.Name
	activityLabel.Text = "Connected. Stellar can now inspect this place and apply approved build actions."
end

connectButton.MouseButton1Click:Connect(pair)
openButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

task.spawn(function()
	while running do
		task.wait(2)
		if deviceId and deviceToken and not busy then
			busy = true
			local ok, data = pcall(function()
				return request("poll", {}, true)
			end)
			if ok and data and data.task then
				local taskData = data.task
				statusLabel.Text = "Running · " .. tostring(taskData.type)
				local execOk, output = pcall(function()
					return execute(taskData)
				end)
				local reportOk, reportError = pcall(function()
					report(taskData.id, execOk, execOk and output or "", execOk and "" or output)
				end)
				if execOk then
					statusLabel.Text = "Paired · " .. game.Name
					activityLabel.Text = tostring(output)
				else
					statusLabel.Text = "Task failed"
					activityLabel.Text = tostring(output)
				end
				if not reportOk then
					activityLabel.Text = "Could not report result: " .. tostring(reportError)
				end
			elseif not ok then
				statusLabel.Text = "Bridge offline"
				activityLabel.Text = tostring(data)
			else
				statusLabel.Text = "Paired · " .. game.Name
			end
			busy = false
		end
	end
end)

if deviceId and deviceToken then
	statusLabel.Text = "Paired · " .. game.Name
	activityLabel.Text = "Waiting for Stellar tasks…"
end

plugin.Unloading:Connect(function()
	running = false
end)
