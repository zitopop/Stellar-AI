package __PACKAGE__;

import android.accessibilityservice.AccessibilityService;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;

public class StellarAccessibilityService extends AccessibilityService {
  private static volatile StellarAccessibilityService instance;
  private static final int MAX_NODES=120;
  public static StellarAccessibilityService getInstance(){return instance;}

  @Override protected void onServiceConnected(){super.onServiceConnected();instance=this;}
  @Override public void onAccessibilityEvent(AccessibilityEvent event){}
  @Override public void onInterrupt(){}
  @Override public void onDestroy(){if(instance==this)instance=null;super.onDestroy();}

  public JSObject snapshot(){
    JSObject result=new JSObject();
    AccessibilityNodeInfo root=getRootInActiveWindow();
    if(root==null){result.put("packageName","");result.put("blocked",false);result.put("nodes",new JSArray());return result;}
    String pkg=safe(root.getPackageName());
    boolean blocked=isProtectedPackage(pkg);
    result.put("packageName",pkg);
    result.put("blocked",blocked);
    JSArray nodes=new JSArray();
    if(!blocked)collectNodes(root,nodes);
    result.put("nodes",nodes);
    return result;
  }

  public boolean performUserApprovedAction(String action,String target,String value){
    if(action==null)return false;
    switch(action){
      case "back": return performGlobalAction(GLOBAL_ACTION_BACK);
      case "home": return performGlobalAction(GLOBAL_ACTION_HOME);
      case "scrollForward": return scroll(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD);
      case "scrollBackward": return scroll(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
      case "clickText": return clickVisibleText(target);
      case "setText": return typeIntoField(target,value);
      default: return false;
    }
  }

  private AccessibilityNodeInfo safeRoot(){
    AccessibilityNodeInfo root=getRootInActiveWindow();
    if(root==null||isProtectedPackage(safe(root.getPackageName())))return null;
    return root;
  }

  private boolean isProtectedPackage(String packageName){
    String pkg=packageName==null?"":packageName.toLowerCase(Locale.ROOT);
    return pkg.equals("com.android.systemui")||pkg.contains("permissioncontroller")||pkg.contains("packageinstaller")||pkg.contains("credentialmanager");
  }

  private boolean scroll(int action){
    AccessibilityNodeInfo root=safeRoot(); if(root==null)return false;
    AccessibilityNodeInfo node=findScrollable(root); return node!=null&&node.performAction(action);
  }

  private AccessibilityNodeInfo findScrollable(AccessibilityNodeInfo root){
    Deque<AccessibilityNodeInfo> q=new ArrayDeque<>(); q.add(root); int seen=0;
    while(!q.isEmpty()&&seen++<220){
      AccessibilityNodeInfo n=q.removeFirst();
      if(n.isVisibleToUser()&&n.isScrollable())return n;
      for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo c=n.getChild(i);if(c!=null)q.addLast(c);}
    }
    return null;
  }

  private boolean clickVisibleText(String target){
    if(TextUtils.isEmpty(target))return false;
    AccessibilityNodeInfo node=findMatchingNode(target,false); if(node==null)return false;
    AccessibilityNodeInfo current=node;
    for(int i=0;i<4&&current!=null;i++){if(current.isClickable())return current.performAction(AccessibilityNodeInfo.ACTION_CLICK);current=current.getParent();}
    return false;
  }

  private boolean typeIntoField(String target,String value){
    AccessibilityNodeInfo node=findMatchingNode(target,true);
    if(node==null||node.isPassword()||!node.isEditable())return false;
    Bundle args=new Bundle();
    args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,value==null?"":value);
    return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,args);
  }

  private AccessibilityNodeInfo findMatchingNode(String target,boolean editable){
    AccessibilityNodeInfo root=safeRoot(); if(root==null)return null;
    String wanted=normalize(target); AccessibilityNodeInfo firstEditable=null;
    Deque<AccessibilityNodeInfo> q=new ArrayDeque<>(); q.add(root); int seen=0;
    while(!q.isEmpty()&&seen++<240){
      AccessibilityNodeInfo n=q.removeFirst();
      if(n.isVisibleToUser()){
        if(editable&&firstEditable==null&&n.isEditable()&&!n.isPassword())firstEditable=n;
        String hay=normalize(label(n));
        if((!editable||n.isEditable())&&!n.isPassword()&&!wanted.isEmpty()&&hay.contains(wanted))return n;
      }
      for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo c=n.getChild(i);if(c!=null)q.addLast(c);}
    }
    return editable&&wanted.isEmpty()?firstEditable:null;
  }

  private void collectNodes(AccessibilityNodeInfo root,JSArray out){
    Deque<AccessibilityNodeInfo> q=new ArrayDeque<>(); q.add(root); int seen=0,count=0;
    while(!q.isEmpty()&&seen++<260&&count<MAX_NODES){
      AccessibilityNodeInfo n=q.removeFirst();
      if(n.isVisibleToUser()){
        boolean useful=n.isClickable()||n.isEditable()||n.isScrollable()||!TextUtils.isEmpty(label(n));
        if(useful){
          JSObject e=new JSObject(); Rect b=new Rect(); n.getBoundsInScreen(b);
          e.put("role",shortClassName(safe(n.getClassName())));
          e.put("text",n.isPassword()?"[password field redacted]":clean(n.getText()));
          e.put("hint",n.isPassword()?"":clean(Build.VERSION.SDK_INT>=26?n.getHintText():null));
          e.put("description",n.isPassword()?"":clean(n.getContentDescription()));
          e.put("clickable",n.isClickable()); e.put("editable",n.isEditable()&&!n.isPassword()); e.put("scrollable",n.isScrollable());
          e.put("bounds",b.left+","+b.top+","+b.right+","+b.bottom);
          out.put(e); count++;
        }
      }
      for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo c=n.getChild(i);if(c!=null)q.addLast(c);}
    }
  }

  private String label(AccessibilityNodeInfo n){
    StringBuilder out=new StringBuilder(); append(out,n.getText()); if(Build.VERSION.SDK_INT>=26)append(out,n.getHintText()); append(out,n.getContentDescription()); return out.toString();
  }
  private void append(StringBuilder out,CharSequence value){String t=safe(value).trim();if(t.isEmpty())return;if(out.length()>0)out.append(' ');out.append(t);}
  private String clean(CharSequence value){String t=safe(value).replaceAll("\\s+"," ").trim();return t.length()>220?t.substring(0,220):t;}
  private String normalize(String value){return value==null?"":value.toLowerCase(Locale.ROOT).replaceAll("\\s+"," ").trim();}
  private String safe(CharSequence value){return value==null?"":value.toString();}
  private String shortClassName(String value){int dot=value.lastIndexOf('.');return dot>=0?value.substring(dot+1):value;}
}
