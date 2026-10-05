package __PACKAGE__;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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
  private static final long ACTION_TIMEOUT_MS=10000L;
  private final Handler handler=new Handler(Looper.getMainLooper());

  private JSObject lastExternalSnapshot=null;
  private String lastExternalPackage="";
  private String pendingAction="";
  private String pendingTarget="";
  private String pendingValue="";
  private String pendingPackage="";
  private long pendingExpiresAt=0L;

  public static StellarAccessibilityService getInstance(){return instance;}

  @Override protected void onServiceConnected(){super.onServiceConnected();instance=this;}

  @Override public void onAccessibilityEvent(AccessibilityEvent event){
    String eventPackage=safe(event==null?null:event.getPackageName());
    if(!eventPackage.isEmpty()&&!eventPackage.equals(getPackageName())&&!isProtectedPackage(eventPackage)){
      AccessibilityNodeInfo root=getRootInActiveWindow();
      if(root!=null&&eventPackage.equals(safe(root.getPackageName()))){
        lastExternalPackage=eventPackage;
        lastExternalSnapshot=buildSnapshot(root,eventPackage,false);
      }
    }

    if(!pendingAction.isEmpty()&&System.currentTimeMillis()<=pendingExpiresAt&&eventPackage.equals(pendingPackage)){
      final String action=pendingAction,target=pendingTarget,value=pendingValue;
      clearPendingAction();
      handler.postDelayed(()->executeOnActiveWindow(action,target,value),300L);
    }else if(!pendingAction.isEmpty()&&System.currentTimeMillis()>pendingExpiresAt){
      clearPendingAction();
    }
  }

  @Override public void onInterrupt(){clearPendingAction();}
  @Override public void onDestroy(){clearPendingAction();if(instance==this)instance=null;super.onDestroy();}

  public JSObject snapshot(){
    AccessibilityNodeInfo root=getRootInActiveWindow();
    if(root!=null){
      String pkg=safe(root.getPackageName());
      if(!pkg.equals(getPackageName())&&!isProtectedPackage(pkg)){
        lastExternalPackage=pkg;
        lastExternalSnapshot=buildSnapshot(root,pkg,false);
        return lastExternalSnapshot;
      }
    }
    if(lastExternalSnapshot!=null){
      lastExternalSnapshot.put("cached",true);
      return lastExternalSnapshot;
    }
    JSObject empty=new JSObject();
    empty.put("packageName","");
    empty.put("blocked",false);
    empty.put("cached",true);
    empty.put("nodes",new JSArray());
    return empty;
  }

  public boolean performUserApprovedAction(String action,String target,String value){
    if(action==null)return false;
    if(action.equals("back"))return performGlobalAction(GLOBAL_ACTION_BACK);
    if(action.equals("home"))return performGlobalAction(GLOBAL_ACTION_HOME);

    AccessibilityNodeInfo root=getRootInActiveWindow();
    String activePackage=root==null?"":safe(root.getPackageName());
    if(root!=null&&!activePackage.equals(getPackageName())&&!isProtectedPackage(activePackage)){
      return executeOnActiveWindow(action,target,value);
    }

    if(lastExternalPackage.isEmpty()||isProtectedPackage(lastExternalPackage))return false;
    Intent launch=getPackageManager().getLaunchIntentForPackage(lastExternalPackage);
    if(launch==null)return false;

    pendingAction=action;
    pendingTarget=target==null?"":target;
    pendingValue=value==null?"":value;
    pendingPackage=lastExternalPackage;
    pendingExpiresAt=System.currentTimeMillis()+ACTION_TIMEOUT_MS;
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
    startActivity(launch);
    return true;
  }

  private void clearPendingAction(){
    pendingAction="";pendingTarget="";pendingValue="";pendingPackage="";pendingExpiresAt=0L;
  }

  private boolean executeOnActiveWindow(String action,String target,String value){
    AccessibilityNodeInfo root=getRootInActiveWindow();
    if(root==null||isProtectedPackage(safe(root.getPackageName()))||safe(root.getPackageName()).equals(getPackageName()))return false;
    switch(action){
      case "scrollForward": return scroll(root,AccessibilityNodeInfo.ACTION_SCROLL_FORWARD);
      case "scrollBackward": return scroll(root,AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
      case "clickText": return clickVisibleText(root,target);
      case "setText": return typeIntoField(root,target,value);
      default: return false;
    }
  }

  private boolean isProtectedPackage(String packageName){
    String pkg=packageName==null?"":packageName.toLowerCase(Locale.ROOT);
    return pkg.equals("com.android.systemui")||pkg.contains("permissioncontroller")||pkg.contains("packageinstaller")||pkg.contains("credentialmanager");
  }

  private boolean scroll(AccessibilityNodeInfo root,int action){
    AccessibilityNodeInfo node=findScrollable(root);
    return node!=null&&node.performAction(action);
  }

  private AccessibilityNodeInfo findScrollable(AccessibilityNodeInfo root){
    Deque<AccessibilityNodeInfo> q=new ArrayDeque<>();q.add(root);int seen=0;
    while(!q.isEmpty()&&seen++<220){
      AccessibilityNodeInfo n=q.removeFirst();
      if(n.isVisibleToUser()&&n.isScrollable())return n;
      addChildren(q,n);
    }
    return null;
  }

  private boolean clickVisibleText(AccessibilityNodeInfo root,String target){
    if(TextUtils.isEmpty(target))return false;
    AccessibilityNodeInfo node=findMatchingNode(root,target,false);
    if(node==null)return false;
    AccessibilityNodeInfo current=node;
    for(int i=0;i<4&&current!=null;i++){
      if(current.isClickable())return current.performAction(AccessibilityNodeInfo.ACTION_CLICK);
      current=current.getParent();
    }
    return false;
  }

  private boolean typeIntoField(AccessibilityNodeInfo root,String target,String value){
    AccessibilityNodeInfo node=findMatchingNode(root,target,true);
    if(node==null||node.isPassword()||!node.isEditable())return false;
    Bundle args=new Bundle();
    args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,value==null?"":value);
    return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,args);
  }

  private AccessibilityNodeInfo findMatchingNode(AccessibilityNodeInfo root,String target,boolean editable){
    String wanted=normalize(target);
    AccessibilityNodeInfo firstEditable=null;
    Deque<AccessibilityNodeInfo> q=new ArrayDeque<>();q.add(root);int seen=0;
    while(!q.isEmpty()&&seen++<240){
      AccessibilityNodeInfo n=q.removeFirst();
      if(n.isVisibleToUser()){
        if(editable&&firstEditable==null&&n.isEditable()&&!n.isPassword())firstEditable=n;
        String hay=normalize(label(n));
        if((!editable||n.isEditable())&&!n.isPassword()&&!wanted.isEmpty()&&hay.contains(wanted))return n;
      }
      addChildren(q,n);
    }
    return editable&&wanted.isEmpty()?firstEditable:null;
  }

  private JSObject buildSnapshot(AccessibilityNodeInfo root,String packageName,boolean cached){
    JSObject result=new JSObject();
    result.put("packageName",packageName);
    result.put("blocked",false);
    result.put("cached",cached);
    JSArray nodes=new JSArray();
    collectNodes(root,nodes);
    result.put("nodes",nodes);
    return result;
  }

  private void collectNodes(AccessibilityNodeInfo root,JSArray out){
    Deque<AccessibilityNodeInfo> q=new ArrayDeque<>();q.add(root);int seen=0,count=0;
    while(!q.isEmpty()&&seen++<260&&count<MAX_NODES){
      AccessibilityNodeInfo n=q.removeFirst();
      if(n.isVisibleToUser()){
        boolean useful=n.isClickable()||n.isEditable()||n.isScrollable()||!TextUtils.isEmpty(label(n));
        if(useful){
          JSObject e=new JSObject();Rect b=new Rect();n.getBoundsInScreen(b);
          e.put("role",shortClassName(safe(n.getClassName())));
          e.put("text",n.isPassword()?"[password field redacted]":(n.isEditable()?"[editable field]":clean(n.getText())));
          e.put("hint",n.isPassword()?"":clean(Build.VERSION.SDK_INT>=26?n.getHintText():null));
          e.put("description",n.isPassword()?"":clean(n.getContentDescription()));
          e.put("clickable",n.isClickable());
          e.put("editable",n.isEditable()&&!n.isPassword());
          e.put("scrollable",n.isScrollable());
          e.put("bounds",b.left+","+b.top+","+b.right+","+b.bottom);
          out.put(e);count++;
        }
      }
      addChildren(q,n);
    }
  }

  private void addChildren(Deque<AccessibilityNodeInfo> q,AccessibilityNodeInfo n){
    for(int i=0;i<n.getChildCount();i++){AccessibilityNodeInfo c=n.getChild(i);if(c!=null)q.addLast(c);}
  }
  private String label(AccessibilityNodeInfo n){
    StringBuilder out=new StringBuilder();
    append(out,n.getText());
    if(Build.VERSION.SDK_INT>=26)append(out,n.getHintText());
    append(out,n.getContentDescription());
    return out.toString();
  }
  private void append(StringBuilder out,CharSequence value){String t=safe(value).trim();if(t.isEmpty())return;if(out.length()>0)out.append(' ');out.append(t);}
  private String clean(CharSequence value){String t=safe(value).replaceAll("\\s+"," ").trim();return t.length()>220?t.substring(0,220):t;}
  private String normalize(String value){return value==null?"":value.toLowerCase(Locale.ROOT).replaceAll("\\s+"," ").trim();}
  private String safe(CharSequence value){return value==null?"":value.toString();}
  private String shortClassName(String value){int dot=value.lastIndexOf('.');return dot>=0?value.substring(dot+1):value;}
}
