package __PACKAGE__;

import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StellarControl")
public class StellarControlPlugin extends Plugin {
  @PluginMethod public void status(PluginCall call) {
    JSObject result=new JSObject();
    result.put("enabled",StellarAccessibilityService.getInstance()!=null);
    result.put("platform","android");
    result.put("mode","user-approved-single-action");
    call.resolve(result);
  }

  @PluginMethod public void openAccessibilitySettings(PluginCall call) {
    Intent intent=new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }

  @PluginMethod public void snapshot(PluginCall call) {
    StellarAccessibilityService service=StellarAccessibilityService.getInstance();
    if(service==null){call.reject("Enable Stellar AI Assist Mode in Android Accessibility settings first.");return;}
    call.resolve(service.snapshot());
  }

  @PluginMethod public void perform(PluginCall call) {
    StellarAccessibilityService service=StellarAccessibilityService.getInstance();
    if(service==null){call.reject("Enable Stellar AI Assist Mode in Android Accessibility settings first.");return;}
    String action=call.getString("action","");
    String target=call.getString("target","");
    String value=call.getString("value","");
    if(value.length()>2000){call.reject("Text is too long for a single Assist Mode action.");return;}
    JSObject result=new JSObject();
    result.put("ok",service.performUserApprovedAction(action,target,value));
    result.put("action",action);
    call.resolve(result);
  }
}
