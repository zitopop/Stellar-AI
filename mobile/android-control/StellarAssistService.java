package com.trystellarai.stellar;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import java.util.ArrayDeque;
import java.util.Locale;

public class StellarAssistService extends AccessibilityService {
    private static volatile StellarAssistService instance;

    static StellarAssistService getInstance() {
        return instance;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        if (instance == this) instance = null;
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        if (instance == this) instance = null;
        super.onDestroy();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Deliberately empty: no background automation or event streaming.
    }

    @Override
    public void onInterrupt() {
        // No continuous task to interrupt.
    }

    JSObject snapshot() {
        JSObject out = new JSObject();
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) {
            out.put("packageName", "");
            out.put("elements", new JSArray());
            return out;
        }

        CharSequence packageName = root.getPackageName();
        out.put("packageName", packageName == null ? "" : packageName.toString());

        JSArray elements = new JSArray();
        ArrayDeque<AccessibilityNodeInfo> queue = new ArrayDeque<>();
        queue.add(root);
        int visited = 0;

        while (!queue.isEmpty() && visited < 180 && elements.length() < 80) {
            AccessibilityNodeInfo node = queue.removeFirst();
            visited++;
            for (int i = 0; i < node.getChildCount(); i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) queue.addLast(child);
            }
            if (!node.isVisibleToUser()) continue;

            boolean password = node.isPassword();
            boolean editable = node.isEditable();
            String label = "";
            if (password) {
                label = "[redacted password field]";
            } else if (editable) {
                CharSequence hint = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? node.getHintText() : null;
                label = hint == null || hint.length() == 0 ? "[editable field]" : "[editable field: " + clean(hint) + "]";
            } else {
                CharSequence text = node.getText();
                CharSequence description = node.getContentDescription();
                label = text != null && text.length() > 0 ? clean(text) : (description == null ? "" : clean(description));
            }

            boolean interactive = node.isClickable() || editable || node.isScrollable();
            if (label.isEmpty() && !interactive) continue;

            JSObject item = new JSObject();
            item.put("text", trim(label, 120));
            item.put("role", trim(simpleClass(node.getClassName()), 60));
            item.put("clickable", node.isClickable());
            item.put("editable", editable);
            item.put("scrollable", node.isScrollable());
            item.put("enabled", node.isEnabled());
            elements.put(item);
        }

        out.put("elements", elements);
        return out;
    }

    boolean tapExactText(String target) {
        if (target == null || target.trim().isEmpty()) return false;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        String wanted = target.trim().toLowerCase(Locale.ROOT);

        ArrayDeque<AccessibilityNodeInfo> queue = new ArrayDeque<>();
        queue.add(root);
        int visited = 0;
        while (!queue.isEmpty() && visited < 220) {
            AccessibilityNodeInfo node = queue.removeFirst();
            visited++;
            for (int i = 0; i < node.getChildCount(); i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) queue.addLast(child);
            }
            if (!node.isVisibleToUser() || node.isPassword()) continue;

            String text = node.getText() == null ? "" : node.getText().toString().trim();
            String desc = node.getContentDescription() == null ? "" : node.getContentDescription().toString().trim();
            if (wanted.equals(text.toLowerCase(Locale.ROOT)) || wanted.equals(desc.toLowerCase(Locale.ROOT))) {
                AccessibilityNodeInfo current = node;
                for (int depth = 0; depth < 6 && current != null; depth++) {
                    if (current.isClickable() && current.isEnabled() && current.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true;
                    current = current.getParent();
                }
                return false;
            }
        }
        return false;
    }

    boolean typeIntoFocusedField(String value) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        AccessibilityNodeInfo focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT);
        if (focused == null || !focused.isEditable() || focused.isPassword() || !focused.isEnabled()) return false;
        Bundle args = new Bundle();
        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value == null ? "" : value);
        return focused.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
    }

    boolean scroll(boolean forward) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return false;
        ArrayDeque<AccessibilityNodeInfo> queue = new ArrayDeque<>();
        queue.add(root);
        int visited = 0;
        while (!queue.isEmpty() && visited < 220) {
            AccessibilityNodeInfo node = queue.removeFirst();
            visited++;
            for (int i = 0; i < node.getChildCount(); i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) queue.addLast(child);
            }
            if (node.isVisibleToUser() && node.isScrollable()) {
                int action = forward ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD;
                if (node.performAction(action)) return true;
            }
        }
        return false;
    }

    boolean global(String action) {
        if ("back".equals(action)) return performGlobalAction(GLOBAL_ACTION_BACK);
        if ("home".equals(action)) return performGlobalAction(GLOBAL_ACTION_HOME);
        return false;
    }

    void stopAssist() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) disableSelf();
    }

    private static String clean(CharSequence value) {
        return value == null ? "" : value.toString().replaceAll("\\s+", " ").trim();
    }

    private static String trim(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String simpleClass(CharSequence className) {
        if (className == null) return "Control";
        String value = className.toString();
        int dot = value.lastIndexOf('.');
        return dot >= 0 ? value.substring(dot + 1) : value;
    }
}
