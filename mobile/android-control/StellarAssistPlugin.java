package com.trystellarai.stellar;

import android.content.Intent;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StellarAssist")
public class StellarAssistPlugin extends Plugin {
    private StellarAssistService service(PluginCall call) {
        StellarAssistService service = StellarAssistService.getInstance();
        if (service == null) call.reject("Stellar Assist Mode is not enabled.");
        return service;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject out = new JSObject();
        out.put("supported", true);
        out.put("enabled", StellarAssistService.getInstance() != null);
        call.resolve(out);
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getScreen(PluginCall call) {
        StellarAssistService service = service(call);
        if (service == null) return;
        call.resolve(service.snapshot());
    }

    @PluginMethod
    public void tapText(PluginCall call) {
        StellarAssistService service = service(call);
        if (service == null) return;
        JSObject out = new JSObject();
        out.put("performed", service.tapExactText(call.getString("text", "")));
        call.resolve(out);
    }

    @PluginMethod
    public void typeText(PluginCall call) {
        StellarAssistService service = service(call);
        if (service == null) return;
        JSObject out = new JSObject();
        out.put("performed", service.typeIntoFocusedField(call.getString("text", "")));
        call.resolve(out);
    }

    @PluginMethod
    public void scroll(PluginCall call) {
        StellarAssistService service = service(call);
        if (service == null) return;
        boolean forward = !"backward".equals(call.getString("direction", "forward"));
        JSObject out = new JSObject();
        out.put("performed", service.scroll(forward));
        call.resolve(out);
    }

    @PluginMethod
    public void globalAction(PluginCall call) {
        StellarAssistService service = service(call);
        if (service == null) return;
        JSObject out = new JSObject();
        out.put("performed", service.global(call.getString("action", "")));
        call.resolve(out);
    }

    @PluginMethod
    public void disable(PluginCall call) {
        StellarAssistService service = service(call);
        if (service == null) return;
        service.stopAssist();
        call.resolve();
    }
}
